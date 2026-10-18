"use client";

import { useCallback, useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { PetCard } from "@/features/patients/components/pet-card";
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
              <li key={pet.id}>
                <PetCard pet={pet} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
