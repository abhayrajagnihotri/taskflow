export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export const getPaginationParams = (rawPage?: string | number, rawLimit?: string | number): PaginationParams => {
  const parsedPage = typeof rawPage === 'number' ? rawPage : parseInt(String(rawPage || 1), 10);
  const parsedLimit = typeof rawLimit === 'number' ? rawLimit : parseInt(String(rawLimit || 20), 10);

  const page = isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
  let limit = isNaN(parsedLimit) || parsedLimit < 1 ? 20 : parsedLimit;

  if (limit > 100) {
    limit = 100;
  }

  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
