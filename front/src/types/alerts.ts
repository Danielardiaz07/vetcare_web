export type AlertKind =
  "APPOINTMENT_UPCOMING" | "VACCINE_DUE" | "VACCINE_OVERDUE" | "WEIGHT_CHANGE" | "INVOICE_NEW";

export interface PortalAlert {
  id: string;
  kind: AlertKind;
  message: string;
  date: string;
  patientId?: string;
  appointmentId?: string;
  invoiceId?: string;
}

export interface PortalAlerts {
  total: number;
  data: PortalAlert[];
}
