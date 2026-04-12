import { z } from "zod";

export const clientSchema = z.object({
  fullName: z.string().trim().min(3, "Informe o nome completo."),
  whatsapp: z.string().trim().min(10, "Informe um WhatsApp válido."),
  cpf: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined),
  notes: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined),
});

export const updateClientSchema = clientSchema.extend({
  clientId: z.string().uuid("Cliente inválido."),
});

export const deleteClientSchema = z.object({
  clientId: z.string().uuid("Cliente inválido."),
});

export const clientListFiltersSchema = z.object({
  query: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
});
