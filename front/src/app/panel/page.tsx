import type { Metadata } from "next";
import { PanelHomeRedirect } from "@/components/layout/panel-home-redirect";

export const metadata: Metadata = { title: "Panel" };

export default function PanelHomePage() {
  return <PanelHomeRedirect />;
}
