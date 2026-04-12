import { z } from "zod";

import { apuracaoStatuses } from "@/types/domain";

const statusSchema = z.enum(apuracaoStatuses);

export const apuracaoSchema = z.object({
  clientId: z.string().uuid("Cliente inválido."),
  fullName: z.string().trim().min(3, "Informe o nome completo da apuração."),
  status: statusSchema.default("draft"),
});

export const updateApuracaoSchema = apuracaoSchema.extend({
  apuracaoId: z.string().uuid("Apuração inválida."),
});

export const deleteApuracaoSchema = z.object({
  apuracaoId: z.string().uuid("Apuração inválida."),
});

export const apuracaoListFiltersSchema = z.object({
  query: z.string().trim().optional(),
  status: statusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
});
