export function parsePagination(query, defaults = { page: 1, perPage: 12, maxPerPage: 50 }) {
  const page = Math.max(1, Number(query.page) || defaults.page);
  const perPage = Math.min(
    defaults.maxPerPage,
    Math.max(1, Number(query.perPage || query.per_page) || defaults.perPage)
  );
  const skip = (page - 1) * perPage;
  return { page, perPage, skip };
}

export function paginationMeta({ page, perPage, total }) {
  const totalPages = Math.max(1, Math.ceil(total / perPage) || 1);
  return {
    page,
    perPage,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}
