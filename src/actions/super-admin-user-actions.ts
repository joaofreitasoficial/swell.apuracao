"use server";

import { revalidatePath } from "next/cache";

import { sendRecoveryEmailAction } from "@/actions/auth-actions";
import { requireRole } from "@/lib/auth/guards";
import { listManagedUsers } from "@/lib/auth/queries";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  createUserSchema,
  deleteUserSchema,
  resetPasswordSchema,
  toggleUserStatusSchema,
  updateUserSchema,
} from "@/lib/validations/user-management";
import { initialFormState, type FormState } from "@/types/forms";

const adminUsersPath = "/super-admin/users";

function toValidationState(error: {
  flatten: () => { fieldErrors: Record<string, string[] | undefined> };
}): FormState {
  return {
    error: "Revise os campos destacados e tente novamente.",
    fieldErrors: error.flatten().fieldErrors,
  };
}

async function ensureNotLastSuperAdmin(targetUserId: string, nextRole?: string) {
  const users = await listManagedUsers();
  const currentTarget = users.find((user) => user.id === targetUserId);

  if (!currentTarget) {
    throw new Error("Usuário não encontrado.");
  }

  if (currentTarget.role !== "super_admin") {
    return;
  }

  if (nextRole === "super_admin") {
    return;
  }

  const activeSuperAdmins = users.filter(
    (user) => user.role === "super_admin" && user.isActive,
  );

  if (activeSuperAdmins.length <= 1) {
    throw new Error(
      "É preciso manter ao menos um super admin ativo na plataforma.",
    );
  }
}

export async function createUserAction(
  previousState: FormState = initialFormState,
  formData: FormData,
): Promise<FormState> {
  void previousState;

  await requireRole("super_admin");

  const parsed = createUserSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return toValidationState(parsed.error);
  }

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: {
      full_name: parsed.data.fullName,
    },
  });

  if (error || !data.user) {
    return {
      error: error?.message ?? "Não foi possível criar o usuário.",
    };
  }

  const { error: updateError } = await supabase
    .from("users")
    .update({
      full_name: parsed.data.fullName,
      email: parsed.data.email,
      role_slug: parsed.data.role,
      is_active: true,
    })
    .eq("id", data.user.id);

  if (updateError) {
    return {
      error: `O usuário foi criado no auth, mas o perfil falhou: ${updateError.message}`,
    };
  }

  revalidatePath(adminUsersPath);

  return {
    success: "Usuário criado com sucesso.",
  };
}

export async function updateUserAction(
  previousState: FormState = initialFormState,
  formData: FormData,
): Promise<FormState> {
  void previousState;

  const currentUser = await requireRole("super_admin");

  const parsed = updateUserSchema.safeParse({
    userId: formData.get("userId"),
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return toValidationState(parsed.error);
  }

  try {
    if (currentUser.id === parsed.data.userId && parsed.data.role !== "super_admin") {
      throw new Error("Você não pode remover seu próprio acesso de super admin.");
    }

    await ensureNotLastSuperAdmin(parsed.data.userId, parsed.data.role);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Falha ao validar o usuário.",
    };
  }

  const supabase = createAdminSupabaseClient();

  const { error: authError } = await supabase.auth.admin.updateUserById(
    parsed.data.userId,
    {
      email: parsed.data.email,
      user_metadata: {
        full_name: parsed.data.fullName,
      },
    },
  );

  if (authError) {
    return {
      error: `Não foi possível atualizar o usuário no auth: ${authError.message}`,
    };
  }

  const { error: updateError } = await supabase
    .from("users")
    .update({
      email: parsed.data.email,
      full_name: parsed.data.fullName,
      role_slug: parsed.data.role,
    })
    .eq("id", parsed.data.userId);

  if (updateError) {
    return {
      error: `Falha ao atualizar o perfil do usuário: ${updateError.message}`,
    };
  }

  revalidatePath(adminUsersPath);

  return {
    success: "Usuário atualizado com sucesso.",
  };
}

export async function toggleUserActiveAction(formData: FormData) {
  const currentUser = await requireRole("super_admin");
  const parsed = toggleUserStatusSchema.safeParse({
    userId: formData.get("userId"),
    nextActive: formData.get("nextActive"),
  });

  if (!parsed.success) {
    return { error: "Usuário inválido para ativação/desativação." } satisfies FormState;
  }

  const nextActive = parsed.data.nextActive === "true";

  try {
    if (currentUser.id === parsed.data.userId && !nextActive) {
      throw new Error("Você não pode desativar sua própria conta.");
    }

    if (!nextActive) {
      await ensureNotLastSuperAdmin(parsed.data.userId);
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Falha ao validar o usuário.",
    } satisfies FormState;
  }

  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from("users")
    .update({ is_active: nextActive })
    .eq("id", parsed.data.userId);

  if (error) {
    return { error: `Falha ao atualizar o status: ${error.message}` } satisfies FormState;
  }

  revalidatePath(adminUsersPath);

  return {
    success: nextActive
      ? "Usuário ativado com sucesso."
      : "Usuário desativado com sucesso.",
  } satisfies FormState;
}

export async function deleteUserAction(formData: FormData) {
  const currentUser = await requireRole("super_admin");
  const parsed = deleteUserSchema.safeParse({
    userId: formData.get("userId"),
  });

  if (!parsed.success) {
    return { error: "Usuário inválido para exclusão." } satisfies FormState;
  }

  if (currentUser.id === parsed.data.userId) {
    return { error: "Você não pode excluir sua própria conta." } satisfies FormState;
  }

  try {
    await ensureNotLastSuperAdmin(parsed.data.userId);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Falha ao validar o usuário.",
    } satisfies FormState;
  }

  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.auth.admin.deleteUser(parsed.data.userId);

  if (error) {
    return { error: `Falha ao excluir o usuário: ${error.message}` } satisfies FormState;
  }

  revalidatePath(adminUsersPath);

  return { success: "Usuário excluído com sucesso." } satisfies FormState;
}

export async function resetUserPasswordAction(formData: FormData) {
  await requireRole("super_admin");

  const parsed = resetPasswordSchema.safeParse({
    userId: formData.get("userId"),
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { error: "Dados inválidos para reset de senha." } satisfies FormState;
  }

  await sendRecoveryEmailAction(parsed.data.email);
  revalidatePath(adminUsersPath);

  return {
    success: `Link de redefinição enviado para ${parsed.data.email}.`,
  } satisfies FormState;
}
