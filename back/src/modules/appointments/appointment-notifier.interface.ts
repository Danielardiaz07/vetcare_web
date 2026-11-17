export type AppointmentEvent = "CONFIRMED" | "CHANGED" | "CANCELLED";

// RN-35: avisar al propietario cuando su cita se agenda, cambia o se cancela. La implementación nunca lanza error ni
// hace esperar la operación de negocio (RN-38).
export interface IAppointmentNotifier {
  appointmentEvent(event: AppointmentEvent, appointmentId: string): Promise<void>;
}
