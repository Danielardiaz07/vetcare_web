export type AppointmentChangeListener = (appointmentId: string) => void;

// D-69: avisa a la agenda de recepción que una cita cambió, para que la vuelva a consultar. La implementación nunca
// lanza error ni hace esperar la operación de negocio.
export interface IAppointmentEvents {
  appointmentChanged(appointmentId: string): void;
  subscribe(listener: AppointmentChangeListener): () => void;
}
