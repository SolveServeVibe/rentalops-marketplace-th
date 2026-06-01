# RentalOps + Marketplace (Thai-first MVP)

Multi-tenant landlord operations + public rental listing platform.

## Features
- Back-office APIs: properties, units, listings, tenants, leases, invoices, payments, crm notes
- Public APIs: search listings, listing detail, lead inquiries
- Multi-tenant isolation by `workspace_id`
- RBAC: `platform_admin`, `landlord_owner`, `landlord_staff`
- Listing lifecycle with publish gate (`open_for_search`)
- Hybrid payment flow (record + reconciliation), gateway-ready schema

## Run
```bash
npm install
npm run dev
```

## Test
```bash
npm test
```

## API surfaces
- Back-office: `/api/*`
- Marketplace: `/public/*`

## Auth (MVP)
Pass headers:
- `x-user-id`
- `x-workspace-id`
- `x-role`

## Example
```bash
curl -X POST http://localhost:3000/api/properties \
  -H 'content-type: application/json' \
  -H 'x-workspace-id: ws_a' -H 'x-user-id: u1' -H 'x-role: landlord_owner' \
  -d '{"name":"คอนโดสุขุมวิท","district":"วัฒนา","province":"กรุงเทพ","address":"สุขุมวิท 55"}'
```

## Postgres schema
Prisma schema is included at `prisma/schema.prisma` and matches:
- workspaces, users, user_workspace_roles
- properties, units, unit_media, listings
- tenants, tenant_contacts, crm_interactions
- leases, rent_schedules, invoices, payment_records, reconciliation_logs
- lead_inquiries
