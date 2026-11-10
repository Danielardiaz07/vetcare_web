import type { Metadata } from "next";
import { PanelPage } from "@/components/layout/panel-page";
import { InventoryManager } from "@/features/inventory/components/inventory-manager";

export const metadata: Metadata = { title: "Inventario" };

export default function InventoryPage() {
  return (
    <PanelPage>
      <InventoryManager />
    </PanelPage>
  );
}
