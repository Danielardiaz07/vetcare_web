import type { z } from "zod";
import { registerFieldsSchema } from "@/features/auth/schemas";

export const ownerLookupSchema = registerFieldsSchema.pick({ documentNumber: true });

export type OwnerLookupInput = z.infer<typeof ownerLookupSchema>;
