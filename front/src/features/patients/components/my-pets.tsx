"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { PatientAvatar } from "@/features/patients/components/patient-avatar";
import { SPECIES_LABELS } from "@/features/patients/labels";
import { ROUTES } from "@/lib/constants";
import { calculateAge } from "@/lib/format";
import { getMe } from "@/services/auth";
import { getMyPatients } from "@/services/patients";
import type { Patient } from "@/types/domain";

type HomeData = { firstName: string; pets: Patient[] };

type HomeState = { status: "loading" } | { status: "error" } | { status: "ready"; data: HomeData };

async function loadHome(): Promise<HomeData> {
  const [profile, pets] = await Promise.all([getMe(), getMyPatients()]);
  const firstName = profile.owner?.firstNames.split(" ")[0] ?? "";
  return { firstName, pets };
}

export function MyPets() {
  const [state, setState] = useState<HomeState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    loadHome()
      .then((data) => {
        if (active) setState({ status: "ready", data });
      })
      .catch(() => {
        if (active) setState({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  if (state.status === "loading") return <LoadingState />;
  if (state.status === "error") return <ErrorState onRetry={reload} />;

  const { firstName, pets } = state.data;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-ink">
        {firstName ? `Hola, ${firstName}` : "Hola"}
      </h1>

      <section aria-labelledby="my-pets-title" className="flex flex-col gap-4">
        <h2 id="my-pets-title" className="text-xl font-semibold text-ink">
          Tus mascotas
        </h2>
        {pets.length === 0 ? (
          <EmptyState
            title="Aún no tienes mascotas registradas"
            description="Pídele a recepción que las registre en tu próxima visita."
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {pets.map((pet) => (
              <li
                key={pet.id}
                className="flex items-center justify-between gap-3 rounded-card border border-line bg-surface px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <PatientAvatar name={pet.name} />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-semibold text-ink">{pet.name}</span>
                    <span className="text-sm text-muted">
                      {SPECIES_LABELS[pet.species]} · {calculateAge(pet.birthDate)}
                    </span>
                  </div>
                </div>
                <Link
                  href={ROUTES.portalPetHistory(pet.id)}
                  aria-label={`Ver historial de ${pet.name}`}
                  className="inline-flex min-h-11 shrink-0 items-center rounded-control px-3 font-semibold text-brand-700 underline underline-offset-2 hover:bg-brand-50"
                >
                  Ver historial
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
