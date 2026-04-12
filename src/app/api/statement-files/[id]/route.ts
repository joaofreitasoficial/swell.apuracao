import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getAuthenticatedUserContext } from "@/lib/auth/queries";
import { appRouteBuilders } from "@/lib/constants/routes";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { syncApuracaoProcessingStatus } from "@/lib/statements/processing";
import { removeStatementFileFromStorage } from "@/lib/statements/storage";

type StatementFileDeleteRow = {
  id: string;
  apuracao_id: string;
  storage_path: string;
};

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getAuthenticatedUserContext();

  if (!user) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }

  if (!user.isActive || user.role !== "user") {
    return NextResponse.json(
      { error: "Seu usuário não pode excluir extratos." },
      { status: 403 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data: statementFile, error: statementFileError } = await supabase
    .from("statement_files")
    .select("id,apuracao_id,storage_path")
    .eq("id", id)
    .maybeSingle<StatementFileDeleteRow>();

  if (statementFileError || !statementFile) {
    return NextResponse.json(
      { error: "Arquivo não encontrado." },
      { status: 404 },
    );
  }

  await removeStatementFileFromStorage(statementFile.storage_path);

  const { error: deleteError } = await supabase
    .from("statement_files")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return NextResponse.json(
      { error: `Falha ao excluir o arquivo: ${deleteError.message}` },
      { status: 500 },
    );
  }

  await syncApuracaoProcessingStatus(statementFile.apuracao_id);

  revalidatePath(appRouteBuilders.apuracao(statementFile.apuracao_id));
  revalidatePath(appRouteBuilders.apuracaoUpload(statementFile.apuracao_id));

  return NextResponse.json({ success: true });
}
