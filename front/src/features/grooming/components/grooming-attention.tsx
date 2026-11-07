"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Field } from "@/components/ui/field";
import { LoadingState } from "@/components/ui/loading-state";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { appointmentErrorMessage } from "@/features/appointments/errors";
import { GROOMING_TYPE_LABELS, GROOMING_TYPES } from "@/features/grooming/labels";
import { groomingServiceSchema, type GroomingServiceFormInput } from "@/features/grooming/schemas";
import { ownerFullName } from "@/features/owners/labels";
import { clinicDateOf, formatClinicTime } from "@/lib/clinic-time";
import { FIELD_LIMITS, ROUTES } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { getAgenda } from "@/services/appointments";
import { createGroomingService, getPatientGroomingServices } from "@/services/grooming";
import type { Appointment, GroomingService } from "@/types/domain";

const RECENT_SERVICES = 3;

type Context =
  // La agenda del estilista solo trae sus citas, así que una ajena no aparece.
  | { status: "not-found" }
  | { status: "unavailable"; appointment: Appointment }
  | { status: "ready"; appointment: Appointment; services: GroomingService[] };

type State = { status: "loading" } | { status: "error" } | { status: "loaded"; data: Context };

// La API no tiene GET /appointments/{id}: la cita se busca en la agenda del día que trae el enlace.
async function loadContext(appointmentId: string, date: string): Promise<Context> {
  const agenda = await getAgenda({ from: date });
  const appointment = agenda.find((item) => item.id === appointmentId);
  if (!appointment) return { status: "not-found" };
  if (appointment.type !== "GROOMING" || appointment.status !== "CONFIRMED") {
    return { status: "unavailable", appointment };
  }
  const services = await getPatientGroomingServices(appointment.patient.id);
  return { status: "ready", appointment, services: services.slice(0, RECENT_SERVICES) };
}

type GroomingAttentionProps = {
  appointmentId: string;
  date: string;
};

// RN-51: el estilista registra el servicio de su cita de estética Confirmada.
export function GroomingAttention({ appointmentId, date }: GroomingAttentionProps) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    loadContext(appointmentId, date)
      .then((data) => {
        if (active) setState({ status: "loaded", data });
      })
      .catch(() => {
        if (active) setState({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, [appointmentId, date, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  if (state.status === "loading") return <LoadingState />;
  if (state.status === "error") return <ErrorState onRetry={reload} />;

  const { data } = state;
  if (data.status === "not-found") {
    return (
      <Unavailable
        title="Esta cita no está en tu agenda"
        description="Solo el estilista asignado a la cita puede registrar el servicio."
      />
    );
  }
  if (data.status === "unavailable") return <NotAvailable appointment={data.appointment} />;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="lg:order-2">
        <Summary appointment={data.appointment} services={data.services} />
      </div>
      <section className="flex flex-col gap-5 rounded-card border border-line bg-surface p-5 lg:order-1">
        <h2 className="text-lg font-semibold text-ink">Servicio estético</h2>
        <GroomingForm appointment={data.appointment} />
      </section>
    </div>
  );
}

function GroomingForm({ appointment }: { appointment: Appointment }) {
  const router = useRouter();
  const { show } = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<GroomingServiceFormInput>({
    resolver: zodResolver(groomingServiceSchema),
    defaultValues: { observations: "" },
  });

  const onSubmit = handleSubmit(async ({ observations, ...input }) => {
    setFormError(null);
    try {
      await createGroomingService({
        ...input,
        patientId: appointment.patient.id,
        appointmentId: appointment.id,
        ...(observations && { observations }),
      });
      show(
        `Servicio de ${appointment.patient.name} guardado. La cita quedó como Atendida.`,
        "success",
      );
      router.push(ROUTES.panelAgenda);
    } catch (error) {
      setFormError(appointmentErrorMessage(error));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <Select
        label="Tipo de servicio"
        defaultValue=""
        error={errors.type?.message}
        {...register("type")}
      >
        <option value="" disabled>
          Elige el tipo de servicio
        </option>
        {GROOMING_TYPES.map((type) => (
          <option key={type} value={type}>
            {GROOMING_TYPE_LABELS[type]}
          </option>
        ))}
      </Select>
      <Textarea
        label="Observaciones (opcional)"
        maxLength={FIELD_LIMITS.GROOMING_OBSERVATIONS_MAX}
        error={errors.observations?.message}
        {...register("observations")}
      />
      <Field
        label="Costo del servicio (COP)"
        type="number"
        inputMode="numeric"
        step="1"
        min="0"
        hint="Sin puntos ni signo de pesos."
        error={errors.cost?.message}
        {...register("cost", { valueAsNumber: true })}
      />
      {formError && (
        <p role="alert" className="text-sm text-danger">
          {formError}
        </p>
      )}
      <Button type="submit" loading={isSubmitting} className="self-start">
        Guardar servicio
      </Button>
    </form>
  );
}

function Summary({
  appointment,
  services,
}: {
  appointment: Appointment;
  services: GroomingService[];
}) {
  const details: [string, string][] = [
    ...(appointment.owner
      ? ([
          ["Propietario", ownerFullName(appointment.owner)],
          ["Celular", appointment.owner.phone],
        ] as [string, string][])
      : []),
    ["Hora", formatClinicTime(appointment.startsAt)],
    ...(appointment.reason ? ([["Motivo", appointment.reason]] as [string, string][]) : []),
  ];

  return (
    <aside className="flex flex-col gap-4">
      <Section title={appointment.patient.name}>
        <dl className="grid gap-3">
          {details.map(([label, value]) => (
            <div key={label} className="flex flex-col gap-0.5">
              <dt className="text-sm text-subtle">{label}</dt>
              <dd className="break-words text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </Section>
      <Section title="Últimos servicios">
        {services.length === 0 ? (
          <p className="text-muted">Sin servicios anteriores.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {services.map((item) => (
              <li key={item.id} className="flex flex-col gap-0.5">
                <span className="text-sm text-subtle">
                  {formatDate(clinicDateOf(new Date(item.createdAt)))}
                </span>
                <span className="font-medium text-ink">{GROOMING_TYPE_LABELS[item.type]}</span>
                {item.observations && (
                  <span className="break-words text-muted">{item.observations}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </aside>
  );
}

function NotAvailable({ appointment }: { appointment: Appointment }) {
  const name = appointment.patient.name;
  if (appointment.type !== "GROOMING") {
    return (
      <Unavailable
        title="Esta cita no es de estética"
        description="Desde aquí solo se registran servicios de baño, corte o peluquería."
      />
    );
  }
  const messages: Partial<Record<Appointment["status"], [string, string]>> = {
    SCHEDULED: [
      "Falta registrar la llegada",
      `Recepción debe registrar la llegada de ${name} antes del servicio.`,
    ],
    ATTENDED: [
      "Esta cita ya fue atendida",
      "El servicio ya quedó registrado en el historial de la mascota.",
    ],
    CANCELLED: ["Esta cita fue cancelada", "Solo se registra el servicio de una cita confirmada."],
  };
  const [title, description] = messages[appointment.status] ?? [
    `${name} no asistió a esta cita`,
    "Solo se registra el servicio de una cita confirmada.",
  ];
  return <Unavailable title={title} description={description} />;
}

function Unavailable({ title, description }: { title: string; description: string }) {
  return (
    <EmptyState
      title={title}
      description={description}
      action={
        <Link
          href={ROUTES.panelAgenda}
          className="inline-flex min-h-11 items-center font-semibold text-brand-700 underline underline-offset-2"
        >
          Ir a Mi agenda
        </Link>
      }
    />
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}
