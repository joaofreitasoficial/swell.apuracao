"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { buildExpiredRoleCookie, buildRoleCookie } from "@/lib/auth/cookies";
import {
  maybeBootstrapSuperAdmin,
  promoteBootstrapSuperAdminIfEligible,
} from "@/lib/auth/bootstrap";
import { getAuthenticatedUserContext } from "@/lib/auth/queries";
import { getDefaultPathForRole } from "@/lib/auth/roles";
import { routes } from "@/lib/constants/routes";
import { getServerEnv } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { loginSchema, updatePasswordSchema } from "@/lib/validations/auth";
import { initialFormState, type FormState } from "@/types/forms";

function buildValidationErrorState(error: {
  flatten: () => { fieldErrors: Record<string, string[] | undefined> };
}): FormState {
  return {
    error: "Revise os campos destacados e tente novamente.",
    fieldErrors: error.flatten().fieldErrors,
  };
}

export async function loginAction(
  previousState: FormState = initialFormState,
  formData: FormData,
): Promise<FormState> {
  void previousState;

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return buildValidationErrorState(parsed.error);
  }

  const { email, password } = parsed.data;
  const supabase = await createServerSupabaseClient();
  let signInResult = await supabase.auth.signInWithPassword({ email, password });

  if (signInResult.error) {
    await maybeBootstrapSuperAdmin(email, password);
    signInResult = await supabase.auth.signInWithPassword({ email, password });
  }

  if (signInResult.error || !signInResult.data.user) {
    return {
      error:
        "Não foi possível entrar com essas credenciais. Confira e tente novamente.",
    };
  }

  await promoteBootstrapSuperAdminIfEligible({
    userId: signInResult.data.user.id,
    email: signInResult.data.user.email,
  });

  const context = await getAuthenticatedUserContext();

  if (!context) {
    return {
      error:
        "O login foi concluído, mas não foi possível sincronizar seu perfil.",
    };
  }

  if (!context.isActive) {
    await supabase.auth.signOut();
    return {
      error:
        "Seu acesso está desativado. Fale com o super admin para reativar a conta.",
    };
  }

  const cookieStore = await cookies();
  const roleCookie = buildRoleCookie(context.role);
  cookieStore.set(roleCookie.name, roleCookie.value, roleCookie.options);

  redirect(getDefaultPathForRole(context.role));
}

export async function logoutAction() {
  const supabase = await createServerSupabaseClient();
  const cookieStore = await cookies();

  await supabase.auth.signOut();

  const expiredRoleCookie = buildExpiredRoleCookie();
  cookieStore.set(
    expiredRoleCookie.name,
    expiredRoleCookie.value,
    expiredRoleCookie.options,
  );

  redirect(routes.login);
}

export async function updatePasswordAction(
  previousState: FormState = initialFormState,
  formData: FormData,
): Promise<FormState> {
  void previousState;

  const parsed = updatePasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return buildValidationErrorState(parsed.error);
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return {
      error: `Não foi possível atualizar a senha: ${error.message}`,
    };
  }

  revalidatePath(routes.updatePassword);

  return {
    success: "Senha atualizada com sucesso.",
  };
}

export async function sendRecoveryEmailAction(email: string) {
  const supabase = await createServerSupabaseClient();
  const env = getServerEnv();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${env.NEXT_PUBLIC_APP_URL}${routes.authCallback}?next=${routes.updatePassword}`,
  });

  if (error) {
    throw new Error(`Falha ao enviar o reset de senha: ${error.message}`);
  }
}
