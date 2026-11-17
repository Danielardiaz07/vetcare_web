import type { Metadata } from "next";
import { PanelPage } from "@/components/layout/panel-page";
import { StaffManager } from "@/features/staff/components/staff-manager";

export const metadata: Metadata = { title: "Personal y horarios" };

export default function StaffPage() {
  return (
    <PanelPage>
      <StaffManager />
    </PanelPage>
  );
}
