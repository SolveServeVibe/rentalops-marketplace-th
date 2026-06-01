export type Role = "platform_admin" | "landlord_owner" | "landlord_staff";

export type ListingStatus = "draft" | "pending_review" | "open_for_search" | "paused" | "closed";
export type InvoiceStatus = "pending" | "partial" | "paid" | "overdue";
export type PaymentStatus = "submitted" | "approved" | "rejected";

export interface AuthContext {
  userId: string;
  workspaceId: string;
  role: Role;
}
