import type { Metadata } from "next";
import { MyAccount } from "@/features/users/components/my-account";

export const metadata: Metadata = { title: "Mi cuenta" };

// No usa PanelPage: "Mi cuenta" no está en el menú de ningún rol, se entra desde la barra superior.
export default function MyAccountPage() {
  return <MyAccount />;
}
