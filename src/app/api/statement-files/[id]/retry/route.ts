import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getAuthenticatedUserContext } from "@/lib/auth/queries";
import { appRouteBuilders } from "@/lib/constants/routes";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { enqueueStatementFileProcessing } from "@/lib/statements/processing";

type StatementFileRetryRow = {
  id: string;
  apuracao_id: string;
};

export const runtime = "nodejs";

export async function POST(
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
      { error: "Seu usuário não pode reprocessar extratos." },
      { status: 403 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data: statementFile, error: statementFileError } = await supabase
    .from("statement_files")
    .select("id,apuracao_id")
    .eq("id", id)
    .maybeSingle<StatementFileRetryRow>();

  if (statementFileError || !statementFile) {
    return NextResponse.json(
      { error: "Arquivo não encontrado para retry." },
      { status: 404 },
    );
  }

  const { error: updateError } = await supabase
    .from("statement_files")
    .update({
      processing_status: "uploaded",
      processing_error: null,
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json(
      { error: `Falha ao preparar retry: ${updateError.message}` },
      { status: 500 },
    );
  }

  await enqueueStatementFileProcessing(id);

  revalidatePath(appRouteBuilders.apuracao(statementFile.apuracao_id));
  revalidatePath(appRouteBuilders.apuracaoUpload(statementFile.apuracao_id));

  return NextResponse.json({ success: true });
}
