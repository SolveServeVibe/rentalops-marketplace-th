import { ListingStatus, InvoiceStatus, PaymentStatus } from "./types";

export interface Property { id: string; workspaceId: string; name: string; district: string; province: string; address: string }
export interface Unit { id: string; workspaceId: string; propertyId: string; roomCode: string; roomType: string; floor: number; monthlyRentTHB: number; facilities: string[]; occupancyStatus: "vacant" | "occupied" | "maintenance" }
export interface Listing { id: string; workspaceId: string; unitId: string; titleTH: string; descriptionTH: string; searchStatus: ListingStatus; publishedAt?: string }
export interface Tenant { id: string; workspaceId: string; fullName: string; primaryPhone: string; lineId?: string }
export interface CrmNote { id: string; workspaceId: string; tenantId: string; userId: string; channel: string; noteTH: string; createdAt: string }
export interface Lease { id: string; workspaceId: string; unitId: string; tenantId: string; startDate: string; endDate: string; monthlyRentTHB: number; penaltyPerDay: number }
export interface Invoice { id: string; workspaceId: string; leaseId: string; dueDate: string; amountTHB: number; paidTHB: number; status: InvoiceStatus }
export interface Payment { id: string; workspaceId: string; invoiceId: string; transferRef: string; amountTHB: number; paymentDate: string; evidenceUrl?: string; status: PaymentStatus; reviewedBy?: string; rejectionNote?: string }
export interface ReconciliationLog { id: string; workspaceId: string; paymentId: string; action: string; actorUserId: string; noteTH: string; createdAt: string }
export interface LeadInquiry { id: string; workspaceId: string; listingId: string; renterName: string; phone: string; lineId?: string; message?: string }

export const store = {
  properties: new Map<string, Property>(),
  units: new Map<string, Unit>(),
  listings: new Map<string, Listing>(),
  tenants: new Map<string, Tenant>(),
  crmNotes: new Map<string, CrmNote>(),
  leases: new Map<string, Lease>(),
  invoices: new Map<string, Invoice>(),
  payments: new Map<string, Payment>(),
  reconciliationLogs: new Map<string, ReconciliationLog>(),
  inquiries: new Map<string, LeadInquiry>()
};

let seed = 1;
export const newId = (p: string) => `${p}_${seed++}`;
