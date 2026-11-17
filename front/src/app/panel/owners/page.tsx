import type { Metadata } from "next";
import { PanelPage } from "@/components/layout/panel-page";
import { OwnersList } from "@/features/owners/components/owners-list";

export const metadata: Metadata = { title: "Propietarios" };

export default function OwnersPage() {
  return (
    <PanelPage>
      <OwnersList />
    </PanelPage>
  );
}
