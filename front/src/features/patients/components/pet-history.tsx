"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/components/ui/cn";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { ClinicalHistory } from "@/features/clinical/components/clinical-history";
import { VaccineAlerts } from "@/features/clinical/components/vaccine-alerts";
import { PatientAvatar } from "@/features/patients/components/patient-avatar";
import { SEX_LABELS, SPECIES_LABELS } from "@/features/patients/labels";
import { ROUTES } from "@/lib/constants";
import { calculateAge } from "@/lib/format";
import { getMyVaccinationCard } from "@/services/clinical";
import { ApiError } from "@/services/http-client";
import { getMyPatient, getMyPatients } from "@/services/patients";
import type { Patient, VaccinationCardEntry } from "@/types/domain";

const FORBIDDEN = 403;
const NOT_FOUND = 404;

const weightFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });

type HistoryData = { pet: Patient; pets: Patient[]; card: VaccinationCardEntry[] };

type HistoryState =
  | { status: "loading" }
  | { status: "not-found" }
  | { status: "error" }
  | { status: "ready"; data: HistoryData };

async function loadHistory(petId: string): Promise<HistoryData> {
  const [pet, pets, card] = await Promise.all([
    getMyPatient(petId),
    getMyPatients(),
    getMyVaccinationCard(petId),
  ]);
  return { pet, pets, card };
}

type PetHistoryProps = {
  petId: string;
};

export function PetHistory({ petId }: PetHistoryProps) {
  const [state, setState] = useState<HistoryState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    loadHistory(petId)
      .then((data) => {
        if (active) setState({ status: "ready", data });
      })
      .catch((error: unknown) => {
        if (!active) return;
        // RN-40: una mascota ajena se trata como inexistente, sin pantalla de error.
        const notFound =
          error instanceof ApiError && (error.status === FORBIDDEN || error.status === NOT_FOUND);
        setState({ status: notFound ? "not-found" : "error" });
      });
    return () => {
      active = false;
    };
  }, [petId, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  if (state.status === "loading") return <LoadingState />;
  if (state.status === "error") return <ErrorState onRetry={reload} />;
  if (state.status === "not-found") {
    return (
      <EmptyState
        title="No encontramos esta mascota"
        description="Puede que el enlace esté mal escrito. Elige una de tus mascotas desde Inicio."
        action={
          <Link
            href={ROUTES.portal}
            className="inline-flex min-h-11 items-center font-semibold text-brand-700 underline underline-offset-2"
          >
            Ir a Inicio
          </Link>
        }
      />
    );
  }

  const { pet, pets, card } = state.data;
  const details: [string, string][] = [
    ["Especie", SPECIES_LABELS[pet.species]],
    ["Raza", pet.breed],
    ["Sexo", SEX_LABELS[pet.sex]],
    ["Edad", calculateAge(pet.birthDate)],
    ["Peso", `${weightFormatter.format(pet.weightKg)} kg`],
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-ink">Historial clínico</h1>

      <nav aria-label="Historial de" className="flex flex-wrap items-center gap-2">
        <span className="text-muted">Historial de:</span>
        {pets.map((item) => {
          const selected = item.id === pet.id;
          return (
            <Link
              key={item.id}
              href={ROUTES.portalPetHistory(item.id)}
              aria-current={selected ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 rounded-control border py-1 pr-4 pl-2 font-semibold text-ink transition-colors duration-150 ease-out",
                selected
                  ? "border-brand-600 bg-brand-50"
                  : "border-field-border bg-surface hover:bg-brand-50",
              )}
            >
              <PatientAvatar name={item.name} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <section className="flex flex-col gap-4 rounded-card border border-line bg-surface p-6">
        <h2 className="text-xl font-semibold text-ink">{pet.name}</h2>
        <dl className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {details.map(([label, value]) => (
            <div key={label} className="flex flex-col gap-1">
              <dt className="text-sm text-subtle">{label}</dt>
              <dd className="break-words text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <VaccineAlerts items={[{ pet, card }]} />

      <ClinicalHistory key={pet.id} pet={pet} card={card} />
    </div>
  );
}
