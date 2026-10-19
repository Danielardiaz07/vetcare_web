import { z } from "zod";

export const MOCK_SCENARIOS = ["default", "new-account", "slow", "network-error"] as const;

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.url(),
  NEXT_PUBLIC_USE_MOCKS: z.stringbool().default(false),
  NEXT_PUBLIC_MOCK_SCENARIO: z.enum(MOCK_SCENARIOS).default("default"),
});

// Next solo sustituye las variables públicas referenciadas de forma literal.
// Una variable vacía en .env.local llega como ""; se trata como no definida para usar el valor por defecto.
export const env = envSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_USE_MOCKS: process.env.NEXT_PUBLIC_USE_MOCKS || undefined,
  NEXT_PUBLIC_MOCK_SCENARIO: process.env.NEXT_PUBLIC_MOCK_SCENARIO || undefined,
});
