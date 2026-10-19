import type { Metadata } from "next";

export const metadata: Metadata = { title: "Agregar mascota" };

export default function NewPetPage() {
  return <h1 className="text-2xl font-semibold text-ink">Agregar mascota</h1>;
}
