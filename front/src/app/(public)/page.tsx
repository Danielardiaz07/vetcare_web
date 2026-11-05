import { LandingBookingProvider } from "@/features/landing/booking-context";
import { BookingSection } from "@/features/landing/components/booking-section";
import { Hero } from "@/features/landing/components/hero";
import { LocationSection } from "@/features/landing/components/location-section";
import { PortalSection } from "@/features/landing/components/portal-section";
import { ServicesSection } from "@/features/landing/components/services-section";
import { TeamSection } from "@/features/landing/components/team-section";

export default function HomePage() {
  return (
    <LandingBookingProvider>
      <Hero />
      <ServicesSection />
      <BookingSection />
      <TeamSection />
      <PortalSection />
      <LocationSection />
    </LandingBookingProvider>
  );
}
