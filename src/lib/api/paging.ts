/** Offset-paged list response: request the next page with `skip` = items loaded so far. */
export type PagedResult<T> = {
  items: T[];
  hasMore: boolean;
};

/** Used when a flow needs the complete list, rather than a paged viewport. */
export async function collectPages<T>(readPage: (skip: number) => Promise<PagedResult<T>>): Promise<T[]> {
  const items: T[] = [];
  while (true) {
    const page = await readPage(items.length);
    items.push(...page.items);
    if (!page.hasMore || !page.items.length) return items;
  }
}
