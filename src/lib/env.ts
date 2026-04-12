import { z } from "zod";

const supabaseClientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
});

const serverEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  FIRST_SUPER_ADMIN_EMAIL: z.string().email(),
  OPENAI_API_KEY: z.string().min(1).optional(),
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
  });

  return cachedServerEnv;
}
