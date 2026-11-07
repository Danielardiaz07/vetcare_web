import type { Metadata } from "next";
import { NewPet } from "@/features/patients/components/new-pet";

export const metadata: Metadata = { title: "Agregar mascota" };

export default function NewPetPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-ink">Agregar mascota</h1>
        <p className="text-muted">
          Registra a tu mascota para agendarle citas y ver su historial clínico.
        </p>
      </div>
      <NewPet />
    </div>
  );
}
