import { NextResponse } from "next/server";

import { getAuthenticatedUserContext } from "@/lib/auth/queries";
import { downloadGeneratedExcelFromStorage } from "@/lib/excel/storage";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type GeneratedExcelDownloadRow = {
  id: string;
  file_name: string;
  storage_path: string;
};

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getAuthenticatedUserContext();

  if (!user) {
    return NextResponse.json({ error: "Sessao invalida." }, { status: 401 });
  }

  if (!user.isActive || user.role !== "user") {
    return NextResponse.json(
      { error: "Seu usuario nao pode baixar este arquivo." },
      { status: 403 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data: generatedExcel, error } = await supabase
    .from("generated_excels")
    .select("id,file_name,storage_path")
    .eq("id", id)
    .maybeSingle<GeneratedExcelDownloadRow>();

  if (error || !generatedExcel) {
    return NextResponse.json(
      { error: "Arquivo Excel nao encontrado." },
      { status: 404 },
    );
  }

  try {
    const fileBuffer = await downloadGeneratedExcelFromStorage(
      generatedExcel.storage_path,
    );

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${generatedExcel.file_name}"`,
      },
    });
  } catch (downloadError) {
    return NextResponse.json(
      {
        error:
          downloadError instanceof Error
            ? downloadError.message
            : "Falha ao baixar o arquivo gerado.",
      },
      { status: 500 },
    );
  }
}
