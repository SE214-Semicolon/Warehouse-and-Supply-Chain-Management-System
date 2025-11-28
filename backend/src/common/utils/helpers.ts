import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../constants';
import { PaginationParams } from '../interfaces/pagination.interface';

export function validateAndTransformPagination(
  params: Partial<PaginationParams>,
): PaginationParams {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(params.limit) || DEFAULT_PAGE_SIZE));

  return {
    page,
    limit,
    sortBy: params.sortBy,
    order: params.order || 'asc',
  };
}

export function formatError(error: Error): {
  message: string;
  stack?: string;
} {
  return {
    message: error.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack }),
  };
}
