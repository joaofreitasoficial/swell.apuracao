import { z } from "zod";

function trimEnvValue(value: unknown) {
  return typeof value === "string" ? value.trim() : value;
}

const nonEmptyStringSchema = z.preprocess(trimEnvValue, z.string().min(1));
const urlStringSchema = z.preprocess(trimEnvValue, z.string().url());
const emailStringSchema = z.preprocess(trimEnvValue, z.string().email());

const supabaseClientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_ANON_KEY: nonEmptyStringSchema,
  NEXT_PUBLIC_SUPABASE_URL: urlStringSchema,
});

const serverEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: urlStringSchema,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: nonEmptyStringSchema,
  NEXT_PUBLIC_SUPABASE_URL: urlStringSchema,
  SUPABASE_SERVICE_ROLE_KEY: nonEmptyStringSchema,
  FIRST_SUPER_ADMIN_EMAIL: emailStringSchema,
  OPENAI_API_KEY: z.preprocess(trimEnvValue, z.string().min(1)).optional(),
  GEMINI_API_KEY: z.preprocess(trimEnvValue, z.string().min(1)).optional(),
});

type SupabaseClientEnv = z.infer<typeof supabaseClientEnvSchema>;
type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedSupabaseClientEnv: SupabaseClientEnv | null = null;
let cachedServerEnv: ServerEnv | null = null;

export function getSupabaseClientEnv(): SupabaseClientEnv {
  cachedSupabaseClientEnv ??= supabaseClientEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  });

  return cachedSupabaseClientEnv;
}

export function getServerEnv(): ServerEnv {
  cachedServerEnv ??= serverEnvSchema.parse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    FIRST_SUPER_ADMIN_EMAIL: process.env.FIRST_SUPER_ADMIN_EMAIL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  });

  return cachedServerEnv;
}
