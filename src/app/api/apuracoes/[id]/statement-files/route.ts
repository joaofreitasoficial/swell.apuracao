import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getAuthenticatedUserContext } from "@/lib/auth/queries";
import { appRouteBuilders } from "@/lib/constants/routes";
import {
  maxStatementFileSizeInBytes,
  statementFilesBucket,
} from "@/lib/constants/storage";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { enqueueStatementFileProcessing } from "@/lib/statements/processing";
import {
  buildStatementStoragePath,
  removeStatementFileFromStorage,
  uploadStatementFileToStorage,
} from "@/lib/statements/storage";

type ApuracaoOwnerRow = {
  id: string;
  user_id: string;
  client_id: string;
};

type StatementFileOwnerRow = {
  id: string;
  storage_path: string;
};

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: apuracaoId } = await params;
  const user = await getAuthenticatedUserContext();

  if (!user) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }

  if (!user.isActive || user.role !== "user") {
    return NextResponse.json(
      { error: "Seu usuário não pode enviar extratos." },
      { status: 403 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const statementFileId = formData.get("statementFileId");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Selecione um arquivo PDF válido." },
      { status: 400 },
    );
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json(
      { error: "Apenas arquivos PDF são permitidos." },
      { status: 400 },
    );
  }

  if (file.size > maxStatementFileSizeInBytes) {
    return NextResponse.json(
      { error: "O arquivo excede o limite de 20 MB." },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data: apuracao, error: apuracaoError } = await supabase
    .from("apuracoes")
    .select("id,user_id,client_id")
    .eq("id", apuracaoId)
    .maybeSingle<ApuracaoOwnerRow>();

  if (apuracaoError || !apuracao) {
    return NextResponse.json(
      { error: "Apuração não encontrada para upload." },
      { status: 404 },
    );
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const storagePath = buildStatementStoragePath({
    userId: user.id,
    apuracaoId,
    fileName: file.name,
  });

  let oldStoragePath: string | null = null;

  try {
    if (typeof statementFileId === "string" && statementFileId) {
      const { data: existingFile, error: existingFileError } = await supabase
        .from("statement_files")
        .select("id,storage_path")
        .eq("id", statementFileId)
        .eq("apuracao_id", apuracaoId)
        .maybeSingle<StatementFileOwnerRow>();

      if (existingFileError || !existingFile) {
        return NextResponse.json(
          { error: "Arquivo não encontrado para reenvio." },
          { status: 404 },
        );
      }

      oldStoragePath = existingFile.storage_path;
    }

    await uploadStatementFileToStorage({
      storagePath,
      fileBuffer,
      contentType: file.type,
    });

    let resolvedStatementFileId = "";

    if (typeof statementFileId === "string" && statementFileId) {
      const { error: updateError } = await supabase
        .from("statement_files")
        .update({
          file_name: file.name,
          original_file_name: file.name,
          storage_bucket: statementFilesBucket,
          storage_path: storagePath,
          mime_type: file.type,
          file_size: file.size,
          processing_status: "uploaded",
          detected_bank_name: null,
          detected_account_label: null,
          page_count: null,
          extracted_text: null,
          processing_error: null,
        })
        .eq("id", statementFileId);

      if (updateError) {
        throw new Error(
          `Falha ao atualizar o arquivo reenviado: ${updateError.message}`,
        );
      }

      resolvedStatementFileId = statementFileId;
    } else {
      const { data: insertedFile, error: insertError } = await supabase
        .from("statement_files")
        .insert({
          apuracao_id: apuracaoId,
          user_id: user.id,
          file_name: file.name,
          original_file_name: file.name,
          storage_bucket: statementFilesBucket,
          storage_path: storagePath,
          mime_type: file.type,
          file_size: file.size,
          processing_status: "uploaded",
        })
        .select("id")
        .single<{ id: string }>();

      if (insertError || !insertedFile) {
        throw new Error(
          `Falha ao registrar o arquivo enviado: ${insertError?.message ?? "sem retorno do banco"}`,
        );
      }

      resolvedStatementFileId = insertedFile.id;
    }

    if (oldStoragePath && oldStoragePath !== storagePath) {
      await removeStatementFileFromStorage(oldStoragePath);
    }

    await enqueueStatementFileProcessing(
      resolvedStatementFileId,
      typeof statementFileId === "string" && statementFileId ? "reupload" : "upload",
    );

    revalidatePath(appRouteBuilders.apuracao(apuracaoId));
    revalidatePath(appRouteBuilders.apuracaoUpload(apuracaoId));
    revalidatePath(appRouteBuilders.apuracaoReview(apuracaoId));
    revalidatePath(appRouteBuilders.clientApuracoes(apuracao.client_id));

    return NextResponse.json({
      success: true,
      statementFileId: resolvedStatementFileId,
    });
  } catch (error) {
    try {
      await removeStatementFileFromStorage(storagePath);
    } catch {
      // no-op
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Falha inesperada no upload do extrato.",
      },
      { status: 500 },
    );
  }
}
