export const CATALOG_AVAILABILITIES = [
  'available',
  'unavailable',
] as const;

export type CatalogAvailability =
  (typeof CATALOG_AVAILABILITIES)[number];

export interface CatalogFilters {
  category?: string;
  location?: string;
  availability?: CatalogAvailability;
}

export function isCatalogAvailability(
  value: string
): value is CatalogAvailability {
  return CATALOG_AVAILABILITIES.some(
    availability => availability === value
  );
}