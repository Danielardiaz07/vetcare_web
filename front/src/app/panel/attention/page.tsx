import type { Metadata } from "next";
import { PanelPage } from "@/components/layout/panel-page";
import { AttentionQueue } from "@/features/clinical/components/attention-queue";

export const metadata: Metadata = { title: "Atención" };

export default function AttentionPage() {
  return (
    <PanelPage>
      <AttentionQueue />
    </PanelPage>
  );
}
