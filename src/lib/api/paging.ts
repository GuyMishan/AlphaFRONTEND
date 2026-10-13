/** Offset-paged list response: request the next page with `skip` = items loaded so far. */
export type PagedResult<T> = {
  items: T[];
  hasMore: boolean;
};
