import "server-only";

import { getServerEnv } from "@/lib/env";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

async function getSuperAdminCount() {
  const supabase = createAdminSupabaseClient();
  const { count, error } = await supabase
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("role_slug", "super_admin");

  if (error) {
    throw new Error(
      `Falha ao verificar a configuração do super admin: ${error.message}`,
    );
  }

  return count ?? 0;
}

export async function maybeBootstrapSuperAdmin(email: string, password: string) {
  const env = getServerEnv();

  if (email.toLowerCase() !== env.FIRST_SUPER_ADMIN_EMAIL.toLowerCase()) {
    return false;
  }

  const existingSuperAdmins = await getSuperAdminCount();

  if (existingSuperAdmins > 0) {
    return false;
  }

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: "Super Admin",
    },
  });

  if (error || !data.user) {
    throw new Error(
      `Falha ao criar o primeiro super admin: ${error?.message ?? "usuário ausente"}`,
    );
  }

  const { error: updateError } = await supabase
    .from("users")
    .update({
      role_slug: "super_admin",
      is_active: true,
      full_name: data.user.user_metadata.full_name as string,
    })
    .eq("id", data.user.id);

  if (updateError) {
    throw new Error(
      `Falha ao promover o primeiro super admin: ${updateError.message}`,
    );
  }

  return true;
}

export async function promoteBootstrapSuperAdminIfEligible(params: {
  userId: string;
  email?: string | null;
}) {
  const env = getServerEnv();

  if (!params.email) {
    return;
  }

  if (
    params.email.toLowerCase() !== env.FIRST_SUPER_ADMIN_EMAIL.toLowerCase()
  ) {
    return;
  }

  const existingSuperAdmins = await getSuperAdminCount();

  if (existingSuperAdmins > 0) {
    return;
  }

  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from("users")
    .update({ role_slug: "super_admin", is_active: true })
    .eq("id", params.userId);

  if (error) {
    throw new Error(
      `Falha ao sincronizar o primeiro super admin: ${error.message}`,
    );
  }
}
