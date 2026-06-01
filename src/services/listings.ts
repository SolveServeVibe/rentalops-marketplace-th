import { store } from "../core/store";

export function canBePublic(status: string) {
  return status === "open_for_search";
}

export function searchListings(params: { q?: string; minRent?: number; maxRent?: number; roomType?: string; district?: string; page?: number; pageSize?: number; }) {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 10;
  const q = params.q?.toLowerCase();

  const all = [...store.listings.values()].filter((l) => l.searchStatus === "open_for_search");

  const filtered = all.filter((l) => {
    const unit = store.units.get(l.unitId);
    if (!unit) return false;
    const property = store.properties.get(unit.propertyId);
    if (!property) return false;

    if (params.minRent && unit.monthlyRentTHB < params.minRent) return false;
    if (params.maxRent && unit.monthlyRentTHB > params.maxRent) return false;
    if (params.roomType && unit.roomType !== params.roomType) return false;
    if (params.district && property.district !== params.district) return false;
    if (q) {
      const hay = `${l.titleTH} ${l.descriptionTH} ${property.name} ${property.district}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const start = (page - 1) * pageSize;
  return {
    total: filtered.length,
    page,
    pageSize,
    items: filtered.slice(start, start + pageSize)
  };
}
