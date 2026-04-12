"use server";

import { revalidatePath } from "next/cache";

import { appRouteBuilders, routes } from "@/lib/constants/routes";
import { requireAuthenticatedUser, requireRole } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  apuracaoSchema,
  deleteApuracaoSchema,
  updateApuracaoSchema,
} from "@/lib/validations/apuracao";
import { initialFormState, type FormState } from "@/types/forms";

function toValidationState(error: {
  flatten: () => { fieldErrors: Record<string, string[] | undefined> };
}): FormState {
  return {
    error: "Revise os campos destacados e tente novamente.",
    fieldErrors: error.flatten().fieldErrors,
  };
}

export async function createApuracaoAction(
  previousState: FormState = initialFormState,
  formData: FormData,
): Promise<FormState> {
  void previousState;
  const user = await requireAuthenticatedUser();
  await requireRole("user");

  const parsed = apuracaoSchema.safeParse({
    clientId: formData.get("clientId"),
    fullName: formData.get("fullName"),
    status: formData.get("status") || "draft",
  });

  if (!parsed.success) {
    return toValidationState(parsed.error);
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("apuracoes")
    .insert({
      user_id: user.id,
      client_id: parsed.data.clientId,
      full_name: parsed.data.fullName,
      status: parsed.data.status,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !data) {
    return {
      error: `Não foi possível criar a apuração: ${error?.message ?? "sem retorno do banco"}`,
    };
  }

  const clientApuracoesPath = appRouteBuilders.clientApuracoes(parsed.data.clientId);

  revalidatePath(routes.app);
  revalidatePath(routes.clients);
  revalidatePath(clientApuracoesPath);

  return {
    success: "Apuração criada com sucesso.",
    redirectTo: appRouteBuilders.apuracao(data.id),
  };
}

export async function updateApuracaoAction(
  previousState: FormState = initialFormState,
  formData: FormData,
): Promise<FormState> {
  void previousState;
  await requireRole("user");

  const parsed = updateApuracaoSchema.safeParse({
    apuracaoId: formData.get("apuracaoId"),
    clientId: formData.get("clientId"),
    fullName: formData.get("fullName"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return toValidationState(parsed.error);
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("apuracoes")
    .update({
      full_name: parsed.data.fullName,
      status: parsed.data.status,
    })
    .eq("id", parsed.data.apuracaoId);

  if (error) {
    return {
      error: `Não foi possível atualizar a apuração: ${error.message}`,
    };
  }

  const apuracaoPath = appRouteBuilders.apuracao(parsed.data.apuracaoId);
  const clientApuracoesPath = appRouteBuilders.clientApuracoes(parsed.data.clientId);

  revalidatePath(routes.app);
  revalidatePath(routes.clients);
  revalidatePath(clientApuracoesPath);
  revalidatePath(apuracaoPath);

  return {
    success: "Apuração atualizada com sucesso.",
    redirectTo: apuracaoPath,
  };
}

export async function deleteApuracaoAction(formData: FormData) {
  await requireRole("user");

  const parsed = deleteApuracaoSchema.safeParse({
    apuracaoId: formData.get("apuracaoId"),
  });

  const clientId = formData.get("clientId");

  if (!parsed.success || typeof clientId !== "string") {
    return { error: "Apuração inválida para exclusão." } satisfies FormState;
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("apuracoes")
    .delete()
    .eq("id", parsed.data.apuracaoId);

  if (error) {
    return {
      error: `Não foi possível excluir a apuração: ${error.message}`,
    } satisfies FormState;
  }

  const clientApuracoesPath = appRouteBuilders.clientApuracoes(clientId);

  revalidatePath(routes.app);
  revalidatePath(routes.clients);
  revalidatePath(clientApuracoesPath);

  return {
    success: "Apuração excluída com sucesso.",
    redirectTo: clientApuracoesPath,
  } satisfies FormState;
}
