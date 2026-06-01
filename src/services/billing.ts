import { store, newId, Invoice, Payment, ReconciliationLog } from "../core/store";

export function refreshInvoiceStatus(invoice: Invoice): Invoice {
  if (invoice.paidTHB <= 0) invoice.status = new Date(invoice.dueDate) < new Date() ? "overdue" : "pending";
  else if (invoice.paidTHB < invoice.amountTHB) invoice.status = "partial";
  else invoice.status = "paid";
  return invoice;
}

export function submitPayment(workspaceId: string, invoiceId: string, amountTHB: number, transferRef: string, paymentDate: string, evidenceUrl?: string) {
  const invoice = store.invoices.get(invoiceId);
  if (!invoice || invoice.workspaceId !== workspaceId) throw new Error("invoice_not_found");

  const payment: Payment = {
    id: newId("pay"), workspaceId, invoiceId, amountTHB, transferRef, paymentDate, evidenceUrl, status: "submitted"
  };
  store.payments.set(payment.id, payment);
  return payment;
}

export function reconcilePayment(workspaceId: string, paymentId: string, actorUserId: string, approve: boolean, noteTH: string) {
  const payment = store.payments.get(paymentId);
  if (!payment || payment.workspaceId !== workspaceId) throw new Error("payment_not_found");

  payment.status = approve ? "approved" : "rejected";
  payment.reviewedBy = actorUserId;
  payment.rejectionNote = approve ? undefined : noteTH;
  store.payments.set(payment.id, payment);

  if (approve) {
    const invoice = store.invoices.get(payment.invoiceId);
    if (!invoice) throw new Error("invoice_not_found");
    invoice.paidTHB += payment.amountTHB;
    refreshInvoiceStatus(invoice);
    store.invoices.set(invoice.id, invoice);
  }

  const log: ReconciliationLog = {
    id: newId("log"), workspaceId, paymentId, action: approve ? "approve" : "reject", actorUserId, noteTH, createdAt: new Date().toISOString()
  };
  store.reconciliationLogs.set(log.id, log);
  return { payment, log };
}

export function generateInvoiceFromLease(workspaceId: string, leaseId: string, dueDate: string, amountTHB: number) {
  const invoice: Invoice = {
    id: newId("inv"), workspaceId, leaseId, dueDate, amountTHB, paidTHB: 0, status: "pending"
  };
  refreshInvoiceStatus(invoice);
  store.invoices.set(invoice.id, invoice);
  return invoice;
}
