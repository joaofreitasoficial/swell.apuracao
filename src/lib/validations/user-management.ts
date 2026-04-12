import { z } from "zod";

import { appRoles } from "@/lib/auth/roles";

const roleSchema = z.enum(appRoles);

export const createUserSchema = z.object({
  fullName: z.string().trim().min(3, "Informe o nome completo."),
  email: z.string().trim().email("Informe um e-mail válido."),
  password: z
    .string()
    .min(8, "A senha provisória deve ter pelo menos 8 caracteres."),
  role: roleSchema,
});

export const updateUserSchema = z.object({
  userId: z.string().uuid("Usuário inválido."),
  fullName: z.string().trim().min(3, "Informe o nome completo."),
  email: z.string().trim().email("Informe um e-mail válido."),
  role: roleSchema,
});

export const toggleUserStatusSchema = z.object({
  userId: z.string().uuid("Usuário inválido."),
  nextActive: z.enum(["true", "false"]),
});

export const deleteUserSchema = z.object({
  userId: z.string().uuid("Usuário inválido."),
});

export const resetPasswordSchema = z.object({
  userId: z.string().uuid("Usuário inválido."),
  email: z.string().trim().email("Informe um e-mail válido."),
});
