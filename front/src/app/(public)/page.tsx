import type { Metadata } from "next";
import { LandingBookingProvider } from "@/features/landing/booking-context";
import { BookingSection } from "@/features/landing/components/booking-section";
import { Hero } from "@/features/landing/components/hero";
import { LocationSection } from "@/features/landing/components/location-section";
import { PortalSection } from "@/features/landing/components/portal-section";
import { ServicesSection } from "@/features/landing/components/services-section";
import { TeamSection } from "@/features/landing/components/team-section";
import { VetBotSection } from "@/features/landing/components/vetbot-section";
import { CLINIC } from "@/features/landing/content";

export const metadata: Metadata = {
  title: { absolute: `VetCare | Clínica veterinaria en ${CLINIC.city}` },
};

// D-45: mismo orden del prototipo; el portal va justo después de agendar porque ahí sigue la cita.
export default function HomePage() {
  return (
    <LandingBookingProvider>
      <Hero />
      <ServicesSection />
      <BookingSection />
      <PortalSection />
      <TeamSection />
      <LocationSection />
      <VetBotSection />
    </LandingBookingProvider>
  );
}
