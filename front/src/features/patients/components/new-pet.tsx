"use client";

import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { PatientForm } from "@/features/patients/components/patient-form";
import { ROUTES } from "@/lib/constants";
import { createMyPatient } from "@/services/patients";

export function NewPet() {
  const router = useRouter();
  const { show } = useToast();

  return (
    <section className="rounded-card border border-line bg-surface p-6">
      <PatientForm
        createMine={createMyPatient}
        onCancel={() => router.push(ROUTES.portalProfile)}
        onSaved={(pet) => {
          show(`${pet.name} ya está en tu perfil`, "success");
          router.push(ROUTES.portalProfile);
        }}
      />
    </section>
  );
}
