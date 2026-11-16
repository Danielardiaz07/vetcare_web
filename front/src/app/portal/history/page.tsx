import type { Metadata } from "next";
import { PetHistory } from "@/features/patients/components/pet-history";

export const metadata: Metadata = { title: "Historial clínico" };

export default function HistoryPage() {
  return <PetHistory />;
}
