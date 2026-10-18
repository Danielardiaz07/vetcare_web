import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mi perfil" };

export default function ProfilePage() {
  return <h1 className="text-2xl font-semibold text-ink">Mi perfil</h1>;
}
