import type { Metadata } from "next";
import { PanelPage } from "@/components/layout/panel-page";
import { UsersManager } from "@/features/users/components/users-manager";

export const metadata: Metadata = { title: "Usuarios" };

export default function UsersPage() {
  return (
    <PanelPage>
      <UsersManager />
    </PanelPage>
  );
}
