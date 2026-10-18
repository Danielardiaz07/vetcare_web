import type { Metadata } from "next";
import { MyProfile } from "@/features/owners/components/my-profile";

export const metadata: Metadata = { title: "Mi perfil" };

export default function ProfilePage() {
  return <MyProfile />;
}
