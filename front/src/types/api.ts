export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details: unknown[];
  };
}

export interface Paginated<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
