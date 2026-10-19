import type { StatusTone } from "@/components/ui/status-badge";
import type { InvoiceStatus, PaymentMethod } from "@/types/domain";

// RN-72: métodos de pago aceptados.
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  TRANSFER: "Transferencia",
};

export const INVOICE_STATUS: Record<InvoiceStatus, { label: string; tone: StatusTone }> = {
  PAID: { label: "Pagada", tone: "success" },
  VOIDED: { label: "Anulada", tone: "neutral" },
};
