/** Only statuses exposed by the borrower-visible catalog. */
export const CATALOG_AVAILABILITIES = ['AVAILABLE', 'RESERVED', 'CHECKED_OUT', 'MAINTENANCE'] as const;
export type CatalogAvailability = (typeof CATALOG_AVAILABILITIES)[number];

export interface CatalogFilters {
  category?: string;
  location?: string;
  status?: CatalogAvailability;
}

export function isCatalogAvailability(value: string): value is CatalogAvailability {
  return CATALOG_AVAILABILITIES.some(status => status === value);
}
