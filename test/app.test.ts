import { beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { store } from "../src/core/store";

const auth = { "x-user-id": "u1", "x-workspace-id": "ws_a", "x-role": "landlord_owner" };

beforeEach(() => {
  Object.values(store).forEach((m) => m.clear());
});

describe("tenant isolation + listing lifecycle + billing", () => {
  it("allows only open_for_search listings in public search", async () => {
    const app = buildApp();

    const property = await app.inject({ method: "POST", url: "/api/properties", headers: auth, payload: { name: "คอนโด A", district: "วัฒนา", province: "กรุงเทพ", address: "สุขุมวิท" } });
    const p = property.json();

    const unit = await app.inject({ method: "POST", url: "/api/units", headers: auth, payload: { propertyId: p.id, roomCode: "1201", roomType: "studio", floor: 12, monthlyRentTHB: 12000, facilities: ["wifi"] } });
    const u = unit.json();

    const listing = await app.inject({ method: "POST", url: "/api/listings", headers: auth, payload: { unitId: u.id, titleTH: "ห้องพร้อมอยู่", descriptionTH: "ใกล้ BTS" } });
    const l = listing.json();

    const before = await app.inject({ method: "GET", url: "/public/search_listings" });
    expect(before.json().total).toBe(0);

    await app.inject({ method: "PATCH", url: `/api/listings/${l.id}/status`, headers: auth, payload: { searchStatus: "open_for_search" } });
    const after = await app.inject({ method: "GET", url: "/public/search_listings" });
    expect(after.json().total).toBe(1);
  });

  it("blocks landlord_staff from reconciliation", async () => {
    const app = buildApp();

    const property = (await app.inject({ method: "POST", url: "/api/properties", headers: auth, payload: { name: "คอนโด B", district: "จตุจักร", province: "กรุงเทพ", address: "พหลโยธิน" } })).json();
    const unit = (await app.inject({ method: "POST", url: "/api/units", headers: auth, payload: { propertyId: property.id, roomCode: "505", roomType: "1br", floor: 5, monthlyRentTHB: 15000, facilities: [] } })).json();
    const tenant = (await app.inject({ method: "POST", url: "/api/tenants", headers: auth, payload: { fullName: "สมชาย", primaryPhone: "0812345678" } })).json();
    const lease = (await app.inject({ method: "POST", url: "/api/leases", headers: auth, payload: { unitId: unit.id, tenantId: tenant.id, startDate: "2026-06-01", endDate: "2027-05-31", monthlyRentTHB: 15000, penaltyPerDay: 100 } })).json();
    const inv = (await app.inject({ method: "POST", url: "/api/invoices/generate", headers: auth, payload: { leaseId: lease.id, dueDate: "2026-06-05", amountTHB: 15000 } })).json();
    const pay = (await app.inject({ method: "POST", url: "/api/payments", headers: auth, payload: { invoiceId: inv.id, amountTHB: 15000, transferRef: "TX123", paymentDate: "2026-06-03" } })).json();

    const blocked = await app.inject({ method: "POST", url: `/api/payments/${pay.id}/reconcile`, headers: { ...auth, "x-role": "landlord_staff" }, payload: { approve: true, noteTH: "ok" } });
    expect(blocked.statusCode).toBe(403);
  });
});
