import "server-only";

import { cache } from "react";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ManagedUser } from "@/types/auth";

type UserRecord = {
  id: string;
  email: string;
  full_name: string;
  role_slug: "super_admin" | "user";
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

function mapManagedUser(record: UserRecord): ManagedUser {
  return {
    id: record.id,
    email: record.email,
    fullName: record.full_name,
    role: record.role_slug,
    isActive: record.is_active,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

export const getUserContextById = cache(async (userId: string) => {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, email, full_name, role_slug, is_active, created_at, updated_at")
    .eq("id", userId)
    .maybeSingle<UserRecord>();

  if (error) {
    throw new Error(`Falha ao carregar o usuário autenticado: ${error.message}`);
  }

  return data ? mapManagedUser(data) : null;
});

export async function getAuthenticatedUserContext() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return getUserContextById(user.id);
}

export async function listManagedUsers() {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, email, full_name, role_slug, is_active, created_at, updated_at")
    .order("created_at", { ascending: false })
    .returns<UserRecord[]>();

  if (error) {
    throw new Error(`Falha ao listar usuários: ${error.message}`);
  }

  return (data ?? []).map(mapManagedUser);
}

export async function getAdminOverviewStats() {
  const users = await listManagedUsers();

  return {
    totalUsers: users.length,
    activeUsers: users.filter((user) => user.isActive).length,
    inactiveUsers: users.filter((user) => !user.isActive).length,
    superAdmins: users.filter((user) => user.role === "super_admin").length,
  };
}
