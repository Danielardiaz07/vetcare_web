import { Hero } from "@/features/landing/components/hero";
import { LocationSection } from "@/features/landing/components/location-section";
import { PortalSection } from "@/features/landing/components/portal-section";
import { ServicesSection } from "@/features/landing/components/services-section";
import { TeamSection } from "@/features/landing/components/team-section";

export default function HomePage() {
  return (
    <>
      <Hero />
      <ServicesSection />
      <PortalSection />
      <TeamSection />
      <LocationSection />
    </>
  );
}
