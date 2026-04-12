import "server-only";

import { statementFilesBucket } from "@/lib/constants/storage";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

function sanitizeFileName(fileName: string) {
  return fileName
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

export function buildStatementStoragePath(params: {
  userId: string;
  apuracaoId: string;
  fileName: string;
}) {
  const safeName = sanitizeFileName(params.fileName);

  return `${params.userId}/${params.apuracaoId}/${Date.now()}-${safeName}`;
}

export async function uploadStatementFileToStorage(params: {
  storagePath: string;
  fileBuffer: Buffer;
  contentType: string;
  upsert?: boolean;
}) {
  const admin = createAdminSupabaseClient();
  const { error } = await admin.storage
    .from(statementFilesBucket)
    .upload(params.storagePath, params.fileBuffer, {
      contentType: params.contentType,
      upsert: params.upsert ?? false,
    });

  if (error) {
    throw new Error(`Falha ao enviar o arquivo ao Storage: ${error.message}`);
  }
}

export async function downloadStatementFileFromStorage(storagePath: string) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.storage
    .from(statementFilesBucket)
    .download(storagePath);

  if (error || !data) {
    throw new Error(`Falha ao baixar o arquivo do Storage: ${error?.message ?? "arquivo ausente"}`);
  }

  return Buffer.from(await data.arrayBuffer());
}

export async function removeStatementFileFromStorage(storagePath: string) {
  const admin = createAdminSupabaseClient();
  const { error } = await admin.storage
    .from(statementFilesBucket)
    .remove([storagePath]);

  if (error) {
    throw new Error(`Falha ao remover arquivo do Storage: ${error.message}`);
  }
}
