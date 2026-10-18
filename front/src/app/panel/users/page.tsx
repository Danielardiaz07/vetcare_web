import type { Metadata } from "next";
import { PanelPage } from "@/components/layout/panel-page";

export const metadata: Metadata = { title: "Usuarios" };

export default function UsersPage() {
  return <PanelPage />;
}
