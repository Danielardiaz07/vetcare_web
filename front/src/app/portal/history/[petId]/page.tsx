import type { Metadata } from "next";
import { PetHistory } from "@/features/patients/components/pet-history";

export const metadata: Metadata = { title: "Historial clínico" };

type PetHistoryPageProps = {
  params: Promise<{ petId: string }>;
};

export default async function PetHistoryPage({ params }: PetHistoryPageProps) {
  const { petId } = await params;
  return <PetHistory petId={petId} />;
}
