import "server-only";

import {
  excelTemplatesBucket,
  generatedExcelsBucket,
} from "@/lib/constants/storage";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

function sanitizeFileName(fileName: string) {
  return fileName
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

export function buildExcelTemplateStoragePath(params: {
  userId: string;
  fileName: string;
  versionNumber: number;
}) {
  const safeName = sanitizeFileName(params.fileName);
  return `${params.userId}/templates/v${params.versionNumber}-${Date.now()}-${safeName}`;
}

export function buildGeneratedExcelStoragePath(params: {
  apuracaoId: string;
  fileName: string;
}) {
  const safeName = sanitizeFileName(params.fileName);
  return `${params.apuracaoId}/${Date.now()}-${safeName}`;
}

export async function uploadExcelTemplateToStorage(params: {
  storagePath: string;
  fileBuffer: Uint8Array;
  contentType: string;
}) {
  const admin = createAdminSupabaseClient();
  const { error } = await admin.storage
    .from(excelTemplatesBucket)
    .upload(params.storagePath, params.fileBuffer, {
      contentType: params.contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Falha ao enviar template para o Storage: ${error.message}`);
  }
}

export async function downloadExcelTemplateFromStorage(storagePath: string) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.storage
    .from(excelTemplatesBucket)
    .download(storagePath);

  if (error || !data) {
    throw new Error(
      `Falha ao baixar template do Storage: ${error?.message ?? "arquivo ausente"}`,
    );
  }

  return Buffer.from(await data.arrayBuffer());
}

export async function uploadGeneratedExcelToStorage(params: {
  storagePath: string;
  fileBuffer: Uint8Array;
  contentType: string;
}) {
  const admin = createAdminSupabaseClient();
  const { error } = await admin.storage
    .from(generatedExcelsBucket)
    .upload(params.storagePath, params.fileBuffer, {
      contentType: params.contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Falha ao enviar Excel gerado ao Storage: ${error.message}`);
  }
}

export async function downloadGeneratedExcelFromStorage(storagePath: string) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.storage
    .from(generatedExcelsBucket)
    .download(storagePath);

  if (error || !data) {
    throw new Error(
      `Falha ao baixar Excel gerado do Storage: ${error?.message ?? "arquivo ausente"}`,
    );
  }

  return Buffer.from(await data.arrayBuffer());
}
