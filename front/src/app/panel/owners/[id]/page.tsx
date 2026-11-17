import type { Metadata } from "next";
import { PanelPage } from "@/components/layout/panel-page";
import { OwnerDetail } from "@/features/owners/components/owner-detail";

export const metadata: Metadata = { title: "Propietario" };

type OwnerPageProps = {
  params: Promise<{ id: string }>;
};

export default async function OwnerPage({ params }: OwnerPageProps) {
  const { id } = await params;
  return (
    <PanelPage>
      <OwnerDetail ownerId={id} />
    </PanelPage>
  );
}
