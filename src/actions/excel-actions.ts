"use server";

import { revalidatePath } from "next/cache";

import { requireAuthenticatedUser, requireRole } from "@/lib/auth/guards";
import { appRouteBuilders, routes } from "@/lib/constants/routes";
import {
  excelTemplatesBucket,
  maxExcelTemplateSizeInBytes,
} from "@/lib/constants/storage";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildExcelTemplateStoragePath, uploadExcelTemplateToStorage } from "@/lib/excel/storage";
import { generateExcelForApuracao } from "@/lib/excel/service";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  activateExcelTemplateSchema,
  generateExcelSchema,
  uploadExcelTemplateSchema,
} from "@/lib/validations/excel";
import { initialFormState, type FormState } from "@/types/forms";

const superAdminTemplatesPath = routes.superAdminTemplates;

function toValidationState(error: {
  flatten: () => { fieldErrors: Record<string, string[] | undefined> };
}): FormState {
  return {
    error: "Revise os campos destacados e tente novamente.",
    fieldErrors: error.flatten().fieldErrors,
  };
}

async function getNextTemplateVersionNumber() {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("excel_templates")
    .select("version_number")
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle<{ version_number: number }>();

  if (error) {
    throw new Error(`Falha ao calcular a proxima versao do template: ${error.message}`);
  }

  return (data?.version_number ?? 0) + 1;
}

export async function uploadExcelTemplateAction(
  previousState: FormState = initialFormState,
  formData: FormData,
): Promise<FormState> {
  void previousState;

  const user = await requireRole("super_admin");
  const file = formData.get("templateFile");

  const parsed = uploadExcelTemplateSchema.safeParse({
    worksheetName: formData.get("worksheetName"),
    dataStartRow: formData.get("dataStartRow"),
    monthColumn: formData.get("monthColumn"),
    yearColumn: formData.get("yearColumn"),
    totalColumn: formData.get("totalColumn"),
    entriesColumn: formData.get("entriesColumn"),
    clientNameCell: formData.get("clientNameCell"),
    apuracaoNameCell: formData.get("apuracaoNameCell"),
    generatedAtCell: formData.get("generatedAtCell"),
    totalAnnualCell: formData.get("totalAnnualCell"),
    averageMonthlyCell: formData.get("averageMonthlyCell"),
    highestMonthCell: formData.get("highestMonthCell"),
    lowestMonthCell: formData.get("lowestMonthCell"),
    activateNow: formData.get("activateNow") ? "true" : "false",
  });

  if (!parsed.success) {
    return toValidationState(parsed.error);
  }

  if (!(file instanceof File) || file.size === 0) {
    return {
      error: "Envie um arquivo .xlsx para cadastrar o template.",
    };
  }

  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return {
      error: "O template precisa estar no formato .xlsx.",
    };
  }

  if (file.size > maxExcelTemplateSizeInBytes) {
    return {
      error: "O template excede o tamanho maximo permitido de 20 MB.",
    };
  }

  const versionNumber = await getNextTemplateVersionNumber();
  const storagePath = buildExcelTemplateStoragePath({
    userId: user.id,
    fileName: file.name,
    versionNumber,
  });
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const admin = createAdminSupabaseClient();

  await uploadExcelTemplateToStorage({
    storagePath,
    fileBuffer,
    contentType:
      file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  if (parsed.data.activateNow === "true") {
    const { error: deactivateError } = await admin
      .from("excel_templates")
      .update({ is_active: false })
      .eq("is_active", true);

    if (deactivateError) {
      return {
        error: `Falha ao desativar o template anterior: ${deactivateError.message}`,
      };
    }
  }

  const { error: insertError } = await admin.from("excel_templates").insert({
    uploaded_by: user.id,
    file_name: file.name,
    original_file_name: file.name,
    storage_bucket: excelTemplatesBucket,
    storage_path: storagePath,
    mime_type:
      file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    file_size: file.size,
    version_number: versionNumber,
    is_active: parsed.data.activateNow === "true",
    mapping_config: {
      worksheetName: parsed.data.worksheetName,
      dataStartRow: parsed.data.dataStartRow,
      monthColumn: parsed.data.monthColumn,
      yearColumn: parsed.data.yearColumn,
      totalColumn: parsed.data.totalColumn,
      entriesColumn: parsed.data.entriesColumn,
      clientNameCell: parsed.data.clientNameCell ?? null,
      apuracaoNameCell: parsed.data.apuracaoNameCell ?? null,
      generatedAtCell: parsed.data.generatedAtCell ?? null,
      totalAnnualCell: parsed.data.totalAnnualCell ?? null,
      averageMonthlyCell: parsed.data.averageMonthlyCell ?? null,
      highestMonthCell: parsed.data.highestMonthCell ?? null,
      lowestMonthCell: parsed.data.lowestMonthCell ?? null,
    },
  });

  if (insertError) {
    return {
      error: `Falha ao salvar o template Excel: ${insertError.message}`,
    };
  }

  revalidatePath(superAdminTemplatesPath);

  return {
    success: `Template Excel v${versionNumber} enviado com sucesso.`,
  };
}

export async function activateExcelTemplateAction(formData: FormData) {
  await requireRole("super_admin");

  const parsed = activateExcelTemplateSchema.safeParse({
    templateId: formData.get("templateId"),
  });

  if (!parsed.success) {
    return { error: "Template invalido para ativacao." } satisfies FormState;
  }

  const admin = createAdminSupabaseClient();
  const { data: targetTemplate, error: targetTemplateError } = await admin
    .from("excel_templates")
    .select("id")
    .eq("id", parsed.data.templateId)
    .maybeSingle<{ id: string }>();

  if (targetTemplateError || !targetTemplate) {
    return {
      error: `Template nao encontrado para ativacao: ${targetTemplateError?.message ?? "registro ausente"}`,
    } satisfies FormState;
  }

  const { error: deactivateError } = await admin
    .from("excel_templates")
    .update({ is_active: false })
    .neq("id", parsed.data.templateId)
    .eq("is_active", true);

  if (deactivateError) {
    return {
      error: `Falha ao desativar o template atual: ${deactivateError.message}`,
    } satisfies FormState;
  }

  const { error: activateError } = await admin
    .from("excel_templates")
    .update({ is_active: true })
    .eq("id", parsed.data.templateId);

  if (activateError) {
    return {
      error: `Falha ao ativar o template selecionado: ${activateError.message}`,
    } satisfies FormState;
  }

  revalidatePath(superAdminTemplatesPath);

  return {
    success: "Template ativado com sucesso.",
  } satisfies FormState;
}

export async function generateExcelAction(formData: FormData) {
  const user = await requireAuthenticatedUser();
  await requireRole("user");

  const parsed = generateExcelSchema.safeParse({
    apuracaoId: formData.get("apuracaoId"),
  });

  if (!parsed.success) {
    return { error: "Apuracao invalida para gerar Excel." } satisfies FormState;
  }

  const supabase = await createServerSupabaseClient();
  const { data: apuracao, error: apuracaoError } = await supabase
    .from("apuracoes")
    .select("id")
    .eq("id", parsed.data.apuracaoId)
    .maybeSingle<{ id: string }>();

  if (apuracaoError || !apuracao) {
    return {
      error: `Nao foi possivel localizar a apuracao: ${apuracaoError?.message ?? "registro ausente"}`,
    } satisfies FormState;
  }

  try {
    await generateExcelForApuracao({
      apuracaoId: parsed.data.apuracaoId,
      generatedBy: user.id,
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Falha ao gerar o Excel.",
    } satisfies FormState;
  }

  const { error: updateError } = await supabase
    .from("apuracoes")
    .update({ status: "excel_generated" })
    .eq("id", parsed.data.apuracaoId);

  if (updateError) {
    return {
      error: `O Excel foi gerado, mas o status da apuracao nao foi atualizado: ${updateError.message}`,
    } satisfies FormState;
  }

  const apuracaoPath = appRouteBuilders.apuracao(parsed.data.apuracaoId);
  const consolidadoPath = appRouteBuilders.apuracaoConsolidado(parsed.data.apuracaoId);
  const excelPath = appRouteBuilders.apuracaoExcel(parsed.data.apuracaoId);

  revalidatePath(apuracaoPath);
  revalidatePath(consolidadoPath);
  revalidatePath(excelPath);

  return {
    success: "Excel gerado com sucesso.",
    redirectTo: excelPath,
  } satisfies FormState;
}
