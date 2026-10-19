import type { Metadata } from "next";
import { MyPets } from "@/features/patients/components/my-pets";

export const metadata: Metadata = { title: "Inicio" };

export default function PortalHomePage() {
  return <MyPets />;
}
