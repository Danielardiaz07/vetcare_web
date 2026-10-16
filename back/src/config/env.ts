import { z } from "zod";

const MIN_SECRET_LENGTH = 32;

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(MIN_SECRET_LENGTH),
  JWT_REFRESH_SECRET: z.string().min(MIN_SECRET_LENGTH),
  JWT_ACCESS_TTL: z.string().min(1).default("15m"),
  JWT_REFRESH_TTL: z.string().min(1).default("7d"),
  OTP_TTL_MINUTES: z.coerce.number().int().min(5).max(10).default(10),
  SUPABASE_URL: z.url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  BREVO_API_KEY: z.string().min(1),
  MAIL_FROM_EMAIL: z.email(),
  MAIL_FROM_NAME: z.string().min(1),
  CORS_ORIGINS: z
    .string()
    .min(1)
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (result.success) return result.data;

  const issues = result.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  console.error(`Variables de entorno invalidas o faltantes:\n${issues}`);
  process.exit(1);
}

export const env = loadEnv();
