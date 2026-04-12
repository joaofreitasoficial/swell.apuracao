"use server";

import { revalidatePath } from "next/cache";

import { appRouteBuilders, routes } from "@/lib/constants/routes";
import { requireAuthenticatedUser, requireRole } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  clientSchema,
  deleteClientSchema,
  updateClientSchema,
} from "@/lib/validations/client";
import { initialFormState, type FormState } from "@/types/forms";

function toValidationState(error: {
  flatten: () => { fieldErrors: Record<string, string[] | undefined> };
}): FormState {
  return {
    error: "Revise os campos destacados e tente novamente.",
    fieldErrors: error.flatten().fieldErrors,
  };
}

function normalizeOptional(value?: string) {
  return value?.trim() ? value.trim() : null;
}

export async function createClientAction(
  previousState: FormState = initialFormState,
  formData: FormData,
): Promise<FormState> {
  void previousState;
  const user = await requireAuthenticatedUser();
  await requireRole("user");

  const parsed = clientSchema.safeParse({
    fullName: formData.get("fullName"),
    whatsapp: formData.get("whatsapp"),
    cpf: formData.get("cpf"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return toValidationState(parsed.error);
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("clients")
    .insert({
      user_id: user.id,
      full_name: parsed.data.fullName,
      whatsapp: parsed.data.whatsapp,
      cpf: normalizeOptional(parsed.data.cpf),
      notes: normalizeOptional(parsed.data.notes),
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !data) {
    return {
      error: `Não foi possível criar o cliente: ${error?.message ?? "sem retorno do banco"}`,
    };
  }

  revalidatePath(routes.app);
  revalidatePath(routes.clients);

  return {
    success: "Cliente criado com sucesso.",
    redirectTo: appRouteBuilders.client(data.id),
  };
}

export async function updateClientAction(
  previousState: FormState = initialFormState,
  formData: FormData,
): Promise<FormState> {
  void previousState;
  await requireRole("user");

  const parsed = updateClientSchema.safeParse({
    clientId: formData.get("clientId"),
    fullName: formData.get("fullName"),
    whatsapp: formData.get("whatsapp"),
    cpf: formData.get("cpf"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return toValidationState(parsed.error);
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("clients")
    .update({
      full_name: parsed.data.fullName,
      whatsapp: parsed.data.whatsapp,
      cpf: normalizeOptional(parsed.data.cpf),
      notes: normalizeOptional(parsed.data.notes),
    })
    .eq("id", parsed.data.clientId);

  if (error) {
    return {
      error: `Não foi possível atualizar o cliente: ${error.message}`,
    };
  }

  const clientPath = appRouteBuilders.client(parsed.data.clientId);

  revalidatePath(routes.app);
  revalidatePath(routes.clients);
  revalidatePath(clientPath);
  revalidatePath(appRouteBuilders.clientApuracoes(parsed.data.clientId));

  return {
    success: "Cliente atualizado com sucesso.",
    redirectTo: clientPath,
  };
}

export async function deleteClientAction(formData: FormData) {
  await requireRole("user");

  const parsed = deleteClientSchema.safeParse({
    clientId: formData.get("clientId"),
  });

  if (!parsed.success) {
    return { error: "Cliente inválido para exclusão." } satisfies FormState;
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("clients")
    .delete()
    .eq("id", parsed.data.clientId);

  if (error) {
    return {
      error: `Não foi possível excluir o cliente: ${error.message}`,
    } satisfies FormState;
  }

  revalidatePath(routes.app);
  revalidatePath(routes.clients);

  return {
    success: "Cliente excluído com sucesso.",
    redirectTo: routes.clients,
  } satisfies FormState;
}
