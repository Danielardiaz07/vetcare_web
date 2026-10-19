import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/toast";
import { AuthProvider } from "@/features/auth/auth-provider";
import { AuthDialogProvider } from "@/features/auth/components/auth-dialog";
import "./globals.css";

const ibmPlex = IBM_Plex_Sans({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-ibm-plex-sans",
});

export const metadata: Metadata = {
  title: { default: "VetCare", template: "%s | VetCare" },
  description: "Gestión de la clínica veterinaria y portal para propietarios de mascotas.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={ibmPlex.variable}>
      <body className="flex min-h-dvh flex-col">
        <ToastProvider>
          <AuthProvider>
            <AuthDialogProvider>{children}</AuthDialogProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
