import type { Metadata } from "next";
import { PanelPage } from "@/components/layout/panel-page";

export const metadata: Metadata = { title: "Propietarios" };

export default function OwnersPage() {
  return <PanelPage />;
}
