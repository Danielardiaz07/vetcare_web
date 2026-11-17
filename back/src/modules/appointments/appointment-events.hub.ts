import type {
  AppointmentChangeListener,
  IAppointmentEvents,
} from "@/modules/appointments/appointment-events.interface";

// D-69: reparte en memoria los avisos de cambio entre las conexiones abiertas. Sirve con una sola instancia de la API;
// con varias haría falta un canal compartido (p. ej. Redis), que no está en el stack.
export class AppointmentEventsHub implements IAppointmentEvents {
  private readonly listeners = new Set<AppointmentChangeListener>();

  subscribe(listener: AppointmentChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  appointmentChanged(appointmentId: string): void {
    for (const listener of this.listeners) {
      try {
        listener(appointmentId);
      } catch {
        // Una conexión rota no debe frenar el aviso a las demás ni la operación que lo originó; se limpia al cerrarse.
      }
    }
  }
}
