export const ALERT_KINDS = [
  "APPOINTMENT_UPCOMING",
  "VACCINE_DUE",
  "VACCINE_OVERDUE",
  "WEIGHT_CHANGE",
  "INVOICE_NEW",
] as const;
export type AlertKind = (typeof ALERT_KINDS)[number];

// Un aviso del centro de avisos del portal. Solo trae el identificador de lo que describe;
// el texto ya viene redactado y la fecha sirve para ordenar y mostrar "hace/en N días".
export interface AlertResponseDto {
  id: string; // estable entre llamadas: sirve para marcar un aviso como visto en el cliente
  kind: AlertKind;
  message: string;
  date: string; // ISO 8601: inicio de la cita, próxima dosis (AAAA-MM-DD), última consulta o creación de la factura
  patientId?: string;
  appointmentId?: string;
  invoiceId?: string;
}

export interface AlertsResponseDto {
  total: number;
  data: AlertResponseDto[];
}
