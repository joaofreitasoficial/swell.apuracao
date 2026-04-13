import "server-only";

import ExcelJS from "exceljs";

import { generatedExcelsBucket } from "@/lib/constants/storage";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  buildGeneratedExcelStoragePath,
  downloadExcelTemplateFromStorage,
  uploadGeneratedExcelToStorage,
} from "@/lib/excel/storage";
import { formatMonthYear } from "@/lib/formatters";
import { refreshMonthlySummaries } from "@/lib/summaries/service";
import type {
  ExcelTemplateMappingConfig,
  ExcelTemplateRecord,
  GeneratedExcelRecord,
} from "@/types/domain";

type ExcelTemplateRow = {
  id: string;
  uploaded_by: string | null;
  file_name: string;
  original_file_name: string;
  storage_bucket: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
  version_number: number;
  is_active: boolean;
  mapping_config: ExcelTemplateMappingConfig;
  created_at: string;
  updated_at: string;
};

type ApuracaoExcelRow = {
  id: string;
  full_name: string;
  clients: { full_name: string } | null;
};

type GeneratedExcelRow = {
  id: string;
  apuracao_id: string;
  template_id: string | null;
  generated_by: string | null;
  file_name: string;
  storage_bucket: string;
  storage_path: string;
  template_version: number | null;
  created_at: string;
};

function mapTemplate(row: ExcelTemplateRow): ExcelTemplateRecord {
  return {
    id: row.id,
    uploadedBy: row.uploaded_by,
    fileName: row.file_name,
    originalFileName: row.original_file_name,
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    versionNumber: row.version_number,
    isActive: row.is_active,
    mappingConfig: row.mapping_config,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapGeneratedExcel(row: GeneratedExcelRow): GeneratedExcelRecord {
  return {
    id: row.id,
    apuracaoId: row.apuracao_id,
    templateId: row.template_id,
    generatedBy: row.generated_by,
    fileName: row.file_name,
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    templateVersion: row.template_version,
    createdAt: row.created_at,
  };
}

function setCellIfPresent(
  worksheet: ExcelJS.Worksheet,
  cellAddress: string | null | undefined,
  value: string | number,
) {
  if (!cellAddress) {
    return;
  }

  worksheet.getCell(cellAddress).value = value;
}

function cloneRowTemplate(worksheet: ExcelJS.Worksheet, fromRowNumber: number, toRowNumber: number) {
  if (fromRowNumber === toRowNumber) {
    return;
  }

  const templateRow = worksheet.getRow(fromRowNumber);
  const targetRow = worksheet.getRow(toRowNumber);

  targetRow.height = templateRow.height;

  templateRow.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
    const targetCell = targetRow.getCell(columnNumber);
    targetCell.style = JSON.parse(JSON.stringify(cell.style));
    if (typeof cell.value === "object" && cell.value && "formula" in cell.value) {
      targetCell.value = cell.value;
    } else if (cell.value === null) {
      targetCell.value = null;
    }
  });
}

function buildGeneratedFileName(params: { clientName: string; createdAt: Date }) {
  const normalizedClient = params.clientName
    .normalize("NFKD")
    .replace(/[^\w\s-]+/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .toUpperCase();
  const datePart = `${params.createdAt.getFullYear()}${String(
    params.createdAt.getMonth() + 1,
  ).padStart(2, "0")}${String(params.createdAt.getDate()).padStart(2, "0")}`;

  return `APURACAO_${normalizedClient}_${datePart}.xlsx`;
}

async function getActiveExcelTemplate() {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("excel_templates")
    .select(
      "id,uploaded_by,file_name,original_file_name,storage_bucket,storage_path,mime_type,file_size,version_number,is_active,mapping_config,created_at,updated_at",
    )
    .eq("is_active", true)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle<ExcelTemplateRow>();

  if (error) {
    throw new Error(`Falha ao carregar template Excel ativo: ${error.message}`);
  }

  return data ? mapTemplate(data) : null;
}

async function getApuracaoExcelContext(apuracaoId: string) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("apuracoes")
    .select("id,full_name,clients(full_name)")
    .eq("id", apuracaoId)
    .maybeSingle<ApuracaoExcelRow>();

  if (error || !data) {
    throw new Error(
      `Falha ao carregar contexto da apuracao para Excel: ${error?.message ?? "registro ausente"}`,
    );
  }

  return data;
}

function fillTemplateWorksheet(params: {
  worksheet: ExcelJS.Worksheet;
  mapping: ExcelTemplateMappingConfig;
  clientName: string;
  apuracaoName: string;
  generatedAt: Date;
  totalAnnual: number;
  averageMonthly: number;
  highestMonthLabel: string;
  lowestMonthLabel: string;
  monthlySummaries: Awaited<ReturnType<typeof refreshMonthlySummaries>>["monthlySummaries"];
}) {
  const { worksheet, mapping } = params;

  setCellIfPresent(worksheet, mapping.clientNameCell, params.clientName);
  setCellIfPresent(worksheet, mapping.apuracaoNameCell, params.apuracaoName);
  setCellIfPresent(
    worksheet,
    mapping.generatedAtCell,
    params.generatedAt.toLocaleString("pt-BR"),
  );
  setCellIfPresent(worksheet, mapping.totalAnnualCell, params.totalAnnual);
  setCellIfPresent(worksheet, mapping.averageMonthlyCell, params.averageMonthly);
  setCellIfPresent(worksheet, mapping.highestMonthCell, params.highestMonthLabel);
  setCellIfPresent(worksheet, mapping.lowestMonthCell, params.lowestMonthLabel);

  params.monthlySummaries.forEach((summary, index) => {
    const rowNumber = mapping.dataStartRow + index;
    cloneRowTemplate(worksheet, mapping.dataStartRow, rowNumber);

    worksheet.getCell(`${mapping.monthColumn}${rowNumber}`).value = summary.monthRef;
    worksheet.getCell(`${mapping.yearColumn}${rowNumber}`).value = summary.yearRef;
    worksheet.getCell(`${mapping.totalColumn}${rowNumber}`).value = summary.totalIncluded;
    worksheet.getCell(`${mapping.entriesColumn}${rowNumber}`).value = summary.entriesCount;
  });
}

export async function generateExcelForApuracao(params: {
  apuracaoId: string;
  generatedBy: string;
}) {
  const [template, apuracaoContext, summaryResult] = await Promise.all([
    getActiveExcelTemplate(),
    getApuracaoExcelContext(params.apuracaoId),
    refreshMonthlySummaries(params.apuracaoId),
  ]);

  if (!template) {
    throw new Error("Nenhum template Excel ativo foi configurado pelo super admin.");
  }

  if (summaryResult.monthlySummaries.length === 0) {
    throw new Error("Nao ha entradas aprovadas para gerar o Excel.");
  }

  const workbook = new ExcelJS.Workbook();
  const templateBuffer = await downloadExcelTemplateFromStorage(template.storagePath);
  const templateArrayBuffer = templateBuffer.buffer.slice(
    templateBuffer.byteOffset,
    templateBuffer.byteOffset + templateBuffer.byteLength,
  );
  await workbook.xlsx.load(templateArrayBuffer);

  const worksheet = workbook.getWorksheet(template.mappingConfig.worksheetName);

  if (!worksheet) {
    throw new Error(
      `A aba ${template.mappingConfig.worksheetName} nao existe no template ativo.`,
    );
  }

  const generatedAt = new Date();
  fillTemplateWorksheet({
    worksheet,
    mapping: template.mappingConfig,
    clientName: apuracaoContext.clients?.full_name ?? apuracaoContext.full_name,
    apuracaoName: apuracaoContext.full_name,
    generatedAt,
    totalAnnual: summaryResult.kpis.totalAnnual,
    averageMonthly: summaryResult.kpis.averageMonthly,
    highestMonthLabel: summaryResult.kpis.highestMonth
      ? formatMonthYear(
          summaryResult.kpis.highestMonth.monthRef,
          summaryResult.kpis.highestMonth.yearRef,
        )
      : "Sem dados",
    lowestMonthLabel: summaryResult.kpis.lowestMonth
      ? formatMonthYear(
          summaryResult.kpis.lowestMonth.monthRef,
          summaryResult.kpis.lowestMonth.yearRef,
        )
      : "Sem dados",
    monthlySummaries: summaryResult.monthlySummaries,
  });

  const outputBuffer = Buffer.from(await workbook.xlsx.writeBuffer());
  const fileName = buildGeneratedFileName({
    clientName: apuracaoContext.clients?.full_name ?? apuracaoContext.full_name,
    createdAt: generatedAt,
  });
  const storagePath = buildGeneratedExcelStoragePath({
    apuracaoId: params.apuracaoId,
    fileName,
  });

  await uploadGeneratedExcelToStorage({
    storagePath,
    fileBuffer: outputBuffer,
    contentType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("generated_excels")
    .insert({
      apuracao_id: params.apuracaoId,
      template_id: template.id,
      generated_by: params.generatedBy,
      file_name: fileName,
      storage_bucket: generatedExcelsBucket,
      storage_path: storagePath,
      template_version: template.versionNumber,
    })
    .select(
      "id,apuracao_id,template_id,generated_by,file_name,storage_bucket,storage_path,template_version,created_at",
    )
    .single<GeneratedExcelRow>();

  if (error || !data) {
    throw new Error(
      `Falha ao registrar Excel gerado: ${error?.message ?? "sem retorno do banco"}`,
    );
  }

  return {
    generatedExcel: mapGeneratedExcel(data),
    template,
  };
}
