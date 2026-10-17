import { z } from "zod";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/config/constants";

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export const skipOf = (page: number, limit: number): number => (page - 1) * limit;

export function paginate<T>(data: T[], total: number, page: number, limit: number): Paginated<T> {
  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}
