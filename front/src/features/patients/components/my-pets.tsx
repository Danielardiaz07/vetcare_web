"use client";

import { useCallback, useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { NextAppointment } from "@/features/appointments/components/next-appointment";
import { VaccineAlerts, type PetVaccines } from "@/features/clinical/components/vaccine-alerts";
import { PetCard } from "@/features/patients/components/pet-card";
import { getMyAppointments } from "@/services/appointments";
import { getMe } from "@/services/auth";
import { getMyVaccinationCard } from "@/services/clinical";
import { getMyPatients } from "@/services/patients";
import type { Appointment } from "@/types/domain";

type HomeData = { firstName: string; pets: PetVaccines[]; nextAppointment: Appointment | null };

type HomeState = { status: "loading" } | { status: "error" } | { status: "ready"; data: HomeData };

async function loadHome(): Promise<HomeData> {
  const [profile, pets, upcoming] = await Promise.all([
    getMe(),
    getMyPatients(),
    getMyAppointments("upcoming", 1, 1),
  ]);
  const cards = await Promise.all(pets.map((pet) => getMyVaccinationCard(pet.id)));
  const firstName = profile.owner?.firstNames.split(" ")[0] ?? "";
  return {
    firstName,
    pets: pets.map((pet, index) => ({ pet, card: cards[index] ?? [] })),
    nextAppointment: upcoming.data[0] ?? null,
  };
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

  const { firstName, pets, nextAppointment } = state.data;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-ink">
        {firstName ? `Hola, ${firstName}` : "Hola"}
      </h1>

      <VaccineAlerts items={pets} />

      {pets.length > 0 && <NextAppointment appointment={nextAppointment} />}

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
            {pets.map(({ pet, card }) => (
              <li key={pet.id}>
                <PetCard pet={pet} card={card} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
