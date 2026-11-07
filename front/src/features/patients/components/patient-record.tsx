"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/features/auth/auth-provider";
import { ClinicalHistory } from "@/features/clinical/components/clinical-history";
import {
  AdmissionForm,
  DischargeForm,
  LabExamForm,
  SurgeryForm,
} from "@/features/clinical/components/procedure-forms";
import { VaccineCard } from "@/features/clinical/components/vaccine-card";
import { ownerFullName } from "@/features/owners/labels";
import { SEX_LABELS, SPECIES_LABELS } from "@/features/patients/labels";
import { clinicDateOf, formatClinicTime } from "@/lib/clinic-time";
import { ROUTES } from "@/lib/constants";
import { calculateAge, formatDate } from "@/lib/format";
import { getOpenHospitalization, getVaccinationCard } from "@/services/clinical";
import { ApiError } from "@/services/http-client";
import { getPatient } from "@/services/patients";
import type { Hospitalization, Patient, VaccinationCardEntry } from "@/types/domain";

const BAD_REQUEST = 400;
const NOT_FOUND = 404;

const weightFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });

type RecordData = {
  patient: Patient;
  card: VaccinationCardEntry[];
  hospitalization: Hospitalization | null;
};

type RecordState =
  | { status: "loading" }
  | { status: "not-found" }
  | { status: "error" }
  | { status: "ready"; data: RecordData };

type Dialog = "surgery" | "exam" | "admit" | "discharge" | null;

const DIALOG_TITLES: Record<Exclude<Dialog, null>, string> = {
  surgery: "Registrar cirugía",
  exam: "Registrar examen",
  admit: "Internar",
  discharge: "Dar de alta",
};

const SAVED_MESSAGES: Record<Exclude<Dialog, null>, string> = {
  surgery: "Cirugía registrada",
  exam: "Examen registrado",
  admit: "Mascota internada",
  discharge: "Alta registrada",
};

async function loadRecord(patientId: string): Promise<RecordData> {
  const [patient, card, hospitalization] = await Promise.all([
    getPatient(patientId),
    getVaccinationCard(patientId),
    getOpenHospitalization(patientId),
  ]);
  return { patient, card, hospitalization };
}

type PatientRecordProps = {
  patientId: string;
};

// HU-20: ficha del paciente; solo el veterinario registra procedimientos (RN-50).
export function PatientRecord({ patientId }: PatientRecordProps) {
  const { user } = useAuth();
  const { show } = useToast();
  const [state, setState] = useState<RecordState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [dialog, setDialog] = useState<Dialog>(null);
  const isVet = user?.role === "VETERINARIAN";

  useEffect(() => {
    let active = true;
    loadRecord(patientId)
      .then((data) => {
        if (active) setState({ status: "ready", data });
      })
      .catch((error: unknown) => {
        if (!active) return;
        // Un id mal escrito llega como 400 (validación) o 404: los dos son "no existe".
        const notFound =
          error instanceof ApiError && (error.status === NOT_FOUND || error.status === BAD_REQUEST);
        setState({ status: notFound ? "not-found" : "error" });
      });
    return () => {
      active = false;
    };
  }, [patientId, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  const backLink = (
    <Link
      href={ROUTES.panelPatients}
      className="inline-flex min-h-11 items-center self-start font-semibold text-brand-700 underline underline-offset-2"
    >
      Volver a pacientes
    </Link>
  );

  if (state.status === "loading") return <LoadingState />;
  if (state.status === "error") return <ErrorState onRetry={reload} />;
  if (state.status === "not-found") {
    return (
      <EmptyState
        title="No encontramos esta mascota"
        description="Puede que el enlace esté mal escrito. Búscala de nuevo en la lista."
        action={backLink}
      />
    );
  }

  const { patient, card, hospitalization } = state.data;
  const canRegister = isVet && patient.active;

  function handleSaved(kind: Exclude<Dialog, null>) {
    setDialog(null);
    show(SAVED_MESSAGES[kind], "success");
    reload();
  }

  const details: [string, string][] = [
    ["Especie", `${SPECIES_LABELS[patient.species]} · ${patient.breed}`],
    ["Sexo", SEX_LABELS[patient.sex]],
    ["Edad", calculateAge(patient.birthDate)],
    ["Peso", `${weightFormatter.format(patient.weightKg)} kg`],
    ["Propietario", ownerFullName(patient.owner)],
    ["Cédula del propietario", patient.owner.documentNumber],
  ];

  return (
    <div className="flex flex-col gap-6">
      {backLink}

      {hospitalization && (
        <section
          aria-label="Internación abierta"
          className="flex flex-col gap-3 rounded-card border border-warning-border bg-warning-bg p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex min-w-0 flex-col gap-1">
            <p className="font-semibold text-ink">
              {patient.name} sigue en internación desde el{" "}
              {formatDate(clinicDateOf(new Date(hospitalization.admittedAt)))},{" "}
              {formatClinicTime(hospitalization.admittedAt)}
            </p>
            <p className="break-words text-ink">Motivo: {hospitalization.reason}</p>
          </div>
          {isVet && (
            <Button className="shrink-0" onClick={() => setDialog("discharge")}>
              Dar de alta
            </Button>
          )}
        </section>
      )}

      <section className="flex flex-col gap-4 rounded-card border border-line bg-surface p-6">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-semibold text-ink">{patient.name}</h2>
          {!patient.active && <StatusBadge tone="neutral">Inactiva</StatusBadge>}
        </div>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {details.map(([label, value]) => (
            <div key={label} className="flex flex-col gap-1">
              <dt className="text-sm text-subtle">{label}</dt>
              <dd className="break-words text-ink">{value}</dd>
            </div>
          ))}
        </dl>
        {canRegister && (
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button variant="secondary" onClick={() => setDialog("surgery")}>
              Registrar cirugía
            </Button>
            <Button variant="secondary" onClick={() => setDialog("exam")}>
              Registrar examen
            </Button>
            {!hospitalization && (
              <Button variant="secondary" onClick={() => setDialog("admit")}>
                Internar
              </Button>
            )}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold text-ink">Carné de vacunas</h2>
        {card.length === 0 ? (
          <p className="text-muted">Sin vacunas registradas.</p>
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {card.map((entry) => (
              <li key={entry.id}>
                <VaccineCard vaccination={entry} status={entry.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold text-ink">Historial clínico</h2>
        <ClinicalHistory pet={patient} card={card} staff refreshKey={reloadKey} />
      </section>

      <Modal
        open={dialog !== null}
        title={dialog ? DIALOG_TITLES[dialog] : ""}
        onClose={() => setDialog(null)}
      >
        {dialog === "surgery" && (
          <SurgeryForm
            patientId={patient.id}
            onCancel={() => setDialog(null)}
            onSaved={() => handleSaved("surgery")}
          />
        )}
        {dialog === "exam" && (
          <LabExamForm
            patientId={patient.id}
            onCancel={() => setDialog(null)}
            onSaved={() => handleSaved("exam")}
          />
        )}
        {dialog === "admit" && (
          <AdmissionForm
            patientId={patient.id}
            onCancel={() => setDialog(null)}
            onSaved={() => handleSaved("admit")}
          />
        )}
        {dialog === "discharge" && hospitalization && (
          <DischargeForm
            hospitalizationId={hospitalization.id}
            onCancel={() => setDialog(null)}
            onSaved={() => handleSaved("discharge")}
          />
        )}
      </Modal>
    </div>
  );
}
