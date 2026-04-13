import { z } from "zod";

const optionalCellSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || undefined)
  .refine((value) => !value || /^[A-Z]+[1-9]\d*$/.test(value), {
    message: "Informe uma celula valida, como B4.",
  });

export const excelTemplateMappingSchema = z.object({
  worksheetName: z.string().trim().min(1, "Informe o nome da aba."),
  dataStartRow: z.coerce.number().int().min(1, "Informe a linha inicial."),
  monthColumn: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]+$/, "Informe uma coluna valida."),
  yearColumn: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]+$/, "Informe uma coluna valida."),
  totalColumn: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]+$/, "Informe uma coluna valida."),
  entriesColumn: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]+$/, "Informe uma coluna valida."),
  clientNameCell: optionalCellSchema,
  apuracaoNameCell: optionalCellSchema,
  generatedAtCell: optionalCellSchema,
  totalAnnualCell: optionalCellSchema,
  averageMonthlyCell: optionalCellSchema,
  highestMonthCell: optionalCellSchema,
  lowestMonthCell: optionalCellSchema,
});

export const uploadExcelTemplateSchema = excelTemplateMappingSchema.extend({
  activateNow: z.enum(["true", "false"]).default("true"),
});

export const activateExcelTemplateSchema = z.object({
  templateId: z.string().uuid("Template invalido."),
});

export const generateExcelSchema = z.object({
  apuracaoId: z.string().uuid("Apuracao invalida."),
});
