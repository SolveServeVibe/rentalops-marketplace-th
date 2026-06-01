export type ListingStatus = "draft" | "pending_review" | "open_for_search" | "paused" | "closed";
const demoHeaders = {
  "content-type": "application/json",
  "x-user-id": "demo-user",
  "x-workspace-id": "ws_demo",
  "x-role": "landlord_owner"
};

async function req(path: string, init: RequestInit = {}, isBackoffice = true) {
  const headers = { ...(init.headers || {}), ...(isBackoffice ? demoHeaders : { "content-type": "application/json" }) };
  const res = await fetch(path, { ...init, headers });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

export const api = {
  dashboard: () => req("/api/dashboard"),
  listProperties: () => req("/api/properties"),
  createProperty: (payload: any) => req("/api/properties", { method: "POST", body: JSON.stringify(payload) }),
  listUnits: () => req("/api/units"),
  createUnit: (payload: any) => req("/api/units", { method: "POST", body: JSON.stringify(payload) }),
  listListings: () => req("/api/listings"),
  createListing: (payload: any) => req("/api/listings", { method: "POST", body: JSON.stringify(payload) }),
  setListingStatus: (id: string, searchStatus: ListingStatus) => req(`/api/listings/${id}/status`, { method: "PATCH", body: JSON.stringify({ searchStatus }) }),
  listTenants: () => req("/api/tenants"),
  createTenant: (payload: any) => req("/api/tenants", { method: "POST", body: JSON.stringify(payload) }),
  listCrm: (tenantId?: string) => req(`/api/crm-notes${tenantId ? `?tenantId=${tenantId}` : ""}`),
  createCrm: (payload: any) => req("/api/crm-notes", { method: "POST", body: JSON.stringify(payload) }),
  listLeases: () => req("/api/leases"),
  createLease: (payload: any) => req("/api/leases", { method: "POST", body: JSON.stringify(payload) }),
  listInvoices: () => req("/api/invoices"),
  generateInvoice: (payload: any) => req("/api/invoices/generate", { method: "POST", body: JSON.stringify(payload) }),
  listPayments: () => req("/api/payments"),
  submitPayment: (payload: any) => req("/api/payments", { method: "POST", body: JSON.stringify(payload) }),
  reconcile: (id: string, approve: boolean, noteTH: string) => req(`/api/payments/${id}/reconcile`, { method: "POST", body: JSON.stringify({ approve, noteTH }) }),
  search: (q = "") => req(`/public/search_listings?q=${encodeURIComponent(q)}`, {}, false),
  detail: (id: string) => req(`/public/listing_detail/${id}`, {}, false),
  inquiry: (payload: any) => req("/public/lead_inquiries", { method: "POST", body: JSON.stringify(payload) }, false)
};
