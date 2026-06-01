import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import { z } from "zod";
import path from "node:path";
import fs from "node:fs";
import { attachAuth, ensureRole } from "./core/auth";
import { newId, store, Property, Unit, Listing, Tenant, Lease, LeadInquiry } from "./core/store";
import { assertWorkspace } from "./routes/helpers";
import { canBePublic, searchListings } from "./services/listings";
import { generateInvoiceFromLease, reconcilePayment, submitPayment, refreshInvoiceStatus } from "./services/billing";

export function buildApp() {
  const app = Fastify({ logger: true });
  app.register(cors, { origin: true });
  app.addHook("preHandler", attachAuth);

  const webRoot = path.join(process.cwd(), "dist", "web");
  const hasWeb = fs.existsSync(webRoot);
  if (hasWeb) {
    app.register(fastifyStatic, {
      root: webRoot,
      prefix: "/_web/"
    });
  }

  app.get("/health", async () => ({ ok: true, product: "RentalOps + Marketplace" }));

  app.get("/api/dashboard", async (req) => {
    const ws = req.auth.workspaceId;
    const units = [...store.units.values()].filter((x) => x.workspaceId === ws);
    const listings = [...store.listings.values()].filter((x) => x.workspaceId === ws);
    const invoices = [...store.invoices.values()].filter((x) => x.workspaceId === ws).map((x) => refreshInvoiceStatus(x));
    return {
      units: units.length,
      openListings: listings.filter((x) => x.searchStatus === "open_for_search").length,
      dueInvoices: invoices.filter((x) => x.status === "pending" || x.status === "partial").length,
      overdueInvoices: invoices.filter((x) => x.status === "overdue").length
    };
  });

  app.get("/api/properties", async (req) => [...store.properties.values()].filter((x) => x.workspaceId === req.auth.workspaceId));
  app.get("/api/units", async (req) => [...store.units.values()].filter((x) => x.workspaceId === req.auth.workspaceId));
  app.get("/api/listings", async (req) => [...store.listings.values()].filter((x) => x.workspaceId === req.auth.workspaceId));
  app.get("/api/tenants", async (req) => [...store.tenants.values()].filter((x) => x.workspaceId === req.auth.workspaceId));
  app.get("/api/leases", async (req) => [...store.leases.values()].filter((x) => x.workspaceId === req.auth.workspaceId));
  app.get("/api/invoices", async (req) => [...store.invoices.values()].filter((x) => x.workspaceId === req.auth.workspaceId).map((x) => refreshInvoiceStatus(x)));
  app.get("/api/payments", async (req) => [...store.payments.values()].filter((x) => x.workspaceId === req.auth.workspaceId));
  app.get("/api/crm-notes", async (req) => {
    const q = z.object({ tenantId: z.string().optional() }).parse(req.query);
    return [...store.crmNotes.values()].filter((x) => x.workspaceId === req.auth.workspaceId && (!q.tenantId || x.tenantId === q.tenantId));
  });

  app.post("/api/properties", async (req, res) => {
    const input = z.object({ name: z.string(), district: z.string(), province: z.string(), address: z.string() }).parse(req.body);
    const p: Property = { id: newId("prop"), workspaceId: req.auth.workspaceId, ...input };
    store.properties.set(p.id, p);
    res.send(p);
  });

  app.post("/api/units", async (req, res) => {
    const input = z.object({ propertyId: z.string(), roomCode: z.string(), roomType: z.string(), floor: z.number().int(), monthlyRentTHB: z.number(), facilities: z.array(z.string()).default([]), occupancyStatus: z.enum(["vacant", "occupied", "maintenance"]).default("vacant") }).parse(req.body);
    const property = store.properties.get(input.propertyId);
    if (!property) return res.status(404).send({ error: "property_not_found" });
    assertWorkspace(req, property.workspaceId);
    const u: Unit = { id: newId("unit"), workspaceId: property.workspaceId, ...input };
    store.units.set(u.id, u);
    res.send(u);
  });

  app.post("/api/listings", async (req, res) => {
    const input = z.object({ unitId: z.string(), titleTH: z.string(), descriptionTH: z.string() }).parse(req.body);
    const unit = store.units.get(input.unitId);
    if (!unit) return res.status(404).send({ error: "unit_not_found" });
    assertWorkspace(req, unit.workspaceId);
    const l: Listing = { id: newId("list"), workspaceId: unit.workspaceId, unitId: unit.id, titleTH: input.titleTH, descriptionTH: input.descriptionTH, searchStatus: "draft" };
    store.listings.set(l.id, l);
    res.send(l);
  });

  app.patch("/api/listings/:id/status", { preHandler: [ensureRole(["platform_admin", "landlord_owner"])] }, async (req, res) => {
    const id = z.string().parse((req.params as any).id);
    const input = z.object({ searchStatus: z.enum(["draft", "pending_review", "open_for_search", "paused", "closed"]) }).parse(req.body);
    const l = store.listings.get(id);
    if (!l) return res.status(404).send({ error: "listing_not_found" });
    assertWorkspace(req, l.workspaceId);
    l.searchStatus = input.searchStatus;
    l.publishedAt = canBePublic(l.searchStatus) ? new Date().toISOString() : undefined;
    store.listings.set(l.id, l);
    res.send({ ...l, event: canBePublic(l.searchStatus) ? "listing.published" : "listing.unpublished" });
  });

  app.post("/api/tenants", async (req, res) => {
    const input = z.object({ fullName: z.string(), primaryPhone: z.string(), lineId: z.string().optional() }).parse(req.body);
    const t: Tenant = { id: newId("tenant"), workspaceId: req.auth.workspaceId, ...input };
    store.tenants.set(t.id, t);
    res.send(t);
  });

  app.post("/api/crm-notes", async (req, res) => {
    const input = z.object({ tenantId: z.string(), channel: z.string(), noteTH: z.string() }).parse(req.body);
    const tenant = store.tenants.get(input.tenantId);
    if (!tenant) return res.status(404).send({ error: "tenant_not_found" });
    assertWorkspace(req, tenant.workspaceId);
    const note = { id: newId("crm"), workspaceId: tenant.workspaceId, tenantId: tenant.id, userId: req.auth.userId, channel: input.channel, noteTH: input.noteTH, createdAt: new Date().toISOString() };
    store.crmNotes.set(note.id, note);
    res.send(note);
  });

  app.post("/api/leases", async (req, res) => {
    const input = z.object({ unitId: z.string(), tenantId: z.string(), startDate: z.string(), endDate: z.string(), monthlyRentTHB: z.number(), penaltyPerDay: z.number() }).parse(req.body);
    const unit = store.units.get(input.unitId);
    const tenant = store.tenants.get(input.tenantId);
    if (!unit || !tenant) return res.status(404).send({ error: "unit_or_tenant_not_found" });
    assertWorkspace(req, unit.workspaceId);
    assertWorkspace(req, tenant.workspaceId);

    const lease: Lease = { id: newId("lease"), workspaceId: unit.workspaceId, ...input };
    store.leases.set(lease.id, lease);
    unit.occupancyStatus = "occupied";
    store.units.set(unit.id, unit);
    res.send(lease);
  });

  app.post("/api/invoices/generate", { preHandler: [ensureRole(["platform_admin", "landlord_owner"])] }, async (req, res) => {
    const input = z.object({ leaseId: z.string(), dueDate: z.string(), amountTHB: z.number() }).parse(req.body);
    const lease = store.leases.get(input.leaseId);
    if (!lease) return res.status(404).send({ error: "lease_not_found" });
    assertWorkspace(req, lease.workspaceId);
    const invoice = generateInvoiceFromLease(lease.workspaceId, lease.id, input.dueDate, input.amountTHB);
    res.send({ ...invoice, event: invoice.status === "overdue" ? "invoice.overdue" : null });
  });

  app.post("/api/payments", async (req, res) => {
    const input = z.object({ invoiceId: z.string(), amountTHB: z.number(), transferRef: z.string(), paymentDate: z.string(), evidenceUrl: z.string().optional() }).parse(req.body);
    const payment = submitPayment(req.auth.workspaceId, input.invoiceId, input.amountTHB, input.transferRef, input.paymentDate, input.evidenceUrl);
    res.send({ ...payment, event: "payment.submitted" });
  });

  app.post("/api/payments/:id/reconcile", { preHandler: [ensureRole(["platform_admin", "landlord_owner"])] }, async (req, res) => {
    const id = z.string().parse((req.params as any).id);
    const input = z.object({ approve: z.boolean(), noteTH: z.string() }).parse(req.body);
    const result = reconcilePayment(req.auth.workspaceId, id, req.auth.userId, input.approve, input.noteTH);
    res.send(result);
  });

  app.get("/public/search_listings", async (req, res) => {
    const q = z.object({ q: z.string().optional(), minRent: z.coerce.number().optional(), maxRent: z.coerce.number().optional(), roomType: z.string().optional(), district: z.string().optional(), page: z.coerce.number().optional(), pageSize: z.coerce.number().optional() }).parse(req.query);
    res.send(searchListings(q));
  });

  app.get("/public/listing_detail/:id", async (req, res) => {
    const id = z.string().parse((req.params as any).id);
    const listing = store.listings.get(id);
    if (!listing || listing.searchStatus !== "open_for_search") return res.status(404).send({ error: "listing_not_public" });
    const unit = store.units.get(listing.unitId);
    const property = unit ? store.properties.get(unit.propertyId) : null;
    res.send({ listing, unit, property });
  });

  app.post("/public/lead_inquiries", async (req, res) => {
    const input = z.object({ listingId: z.string(), renterName: z.string(), phone: z.string(), lineId: z.string().optional(), message: z.string().optional() }).parse(req.body);
    const listing = store.listings.get(input.listingId);
    if (!listing || listing.searchStatus !== "open_for_search") return res.status(404).send({ error: "listing_not_public" });
    const lead: LeadInquiry = { id: newId("lead"), workspaceId: listing.workspaceId, ...input };
    store.inquiries.set(lead.id, lead);
    res.send(lead);
  });

  if (hasWeb) {
    const sendSpa = (_req: any, res: any) => res.sendFile("index.html", webRoot);
    app.get("/", sendSpa);
    app.get("/app", sendSpa);
    app.get("/app/*", sendSpa);
    app.get("/marketplace", sendSpa);
    app.get("/marketplace/*", sendSpa);
  }

  return app;
}
