import type { ReactNode } from "react";
import { StatusBadge } from "@/components/ui/status-badge";
import { VACCINE_STATUS } from "@/features/clinical/labels";
import { ownerFullName } from "@/features/owners/labels";
import { SEX_LABELS, SPECIES_LABELS } from "@/features/patients/labels";
import { APPOINTMENT_TYPE_LABELS } from "@/features/staff/labels";
import { formatClinicTime } from "@/lib/clinic-time";
import { calculateAge, formatDate } from "@/lib/format";
import type { Appointment, Consultation, Patient, VaccinationCardEntry } from "@/types/domain";

const weightFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });

type PatientSummaryProps = {
  appointment: Appointment;
  patient: Patient;
  consultations: Consultation[];
  vaccinations: VaccinationCardEntry[];
};

export function PatientSummary({
  appointment,
  patient,
  consultations,
  vaccinations,
}: PatientSummaryProps) {
  const details: [string, string][] = [
    ["Especie", `${SPECIES_LABELS[patient.species]} · ${patient.breed}`],
    ["Sexo", SEX_LABELS[patient.sex]],
    ["Edad", calculateAge(patient.birthDate)],
    ["Último peso", `${weightFormatter.format(patient.weightKg)} kg`],
    ...(appointment.owner
      ? ([
          ["Propietario", ownerFullName(appointment.owner)],
          ["Celular", appointment.owner.phone],
        ] as [string, string][])
      : []),
    [
      "Cita",
      `${APPOINTMENT_TYPE_LABELS[appointment.type]} · ${formatClinicTime(appointment.startsAt)}`,
    ],
    ...(appointment.reason ? ([["Motivo", appointment.reason]] as [string, string][]) : []),
  ];

  return (
    <aside className="flex flex-col gap-4">
      <Section title={patient.name}>
        <dl className="grid gap-3">
          {details.map(([label, value]) => (
            <div key={label} className="flex flex-col gap-0.5">
              <dt className="text-sm text-subtle">{label}</dt>
              <dd className="break-words text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="Últimas consultas">
        {consultations.length === 0 ? (
          <p className="text-muted">Sin consultas anteriores.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {consultations.map((item) => (
              <li key={item.id} className="flex flex-col gap-0.5">
                <span className="text-sm text-subtle">{formatDate(item.createdAt)}</span>
                <span className="break-words text-ink">{item.diagnosis}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Vacunas">
        {vaccinations.length === 0 ? (
          <p className="text-muted">Sin vacunas registradas.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {vaccinations.map((item) => {
              const status = VACCINE_STATUS[item.status];
              return (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-ink">{item.vaccine.name}</span>
                    <span className="text-sm text-subtle">
                      {item.nextDoseAt
                        ? `Próxima dosis: ${formatDate(item.nextDoseAt)}`
                        : `Aplicada: ${formatDate(item.appliedAt)}`}
                    </span>
                  </div>
                  <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </aside>
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
