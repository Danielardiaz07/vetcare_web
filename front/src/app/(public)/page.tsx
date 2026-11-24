import type { Metadata } from "next";
import { LandingBookingProvider } from "@/features/landing/booking-context";
import { BookingSection } from "@/features/landing/components/booking-section";
import { Hero } from "@/features/landing/components/hero";
import { LocationSection } from "@/features/landing/components/location-section";
import { PortalSection } from "@/features/landing/components/portal-section";
import { ServicesSection } from "@/features/landing/components/services-section";
import { TeamSection } from "@/features/landing/components/team-section";
import { VetBotSection } from "@/features/landing/components/vetbot-section";
import { CLINIC, phoneUrl } from "@/features/landing/content";

const siteUrl = "https://vetcare-web-ebon.vercel.app/";
const title = `VetCare | Clínica veterinaria en ${CLINIC.city}`;
const description = `Clínica veterinaria en ${CLINIC.city}: consulta, vacunación, estética y urgencias 24 h. Agenda en línea.`;
const image = new URL("/hero.jpg", siteUrl).href;

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: siteUrl },
  openGraph: {
    title,
    description,
    url: siteUrl,
    siteName: "VetCare",
    locale: "es_CO",
    type: "website",
    images: [
      {
        url: image,
        width: 1376,
        height: 768,
        alt: "Una veterinaria examina a un perro en VetCare",
      },
    ],
  },
};

const appointmentDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const clinicStructuredData = {
  "@context": "https://schema.org",
  "@type": ["LocalBusiness", "VeterinaryCare"],
  name: "VetCare",
  description,
  url: siteUrl,
  image,
  telephone: phoneUrl.slice("tel:".length),
  address: {
    "@type": "PostalAddress",
    streetAddress: CLINIC.address,
    addressLocality: CLINIC.city,
    addressRegion: CLINIC.region,
    addressCountry: "CO",
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: appointmentDays,
      opens: "08:00",
      closes: "12:00",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: appointmentDays,
      opens: "14:00",
      closes: "18:00",
    },
  ],
};

export default function HomePage() {
  return (
    <LandingBookingProvider>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(clinicStructuredData).replace(/</g, "\\u003c"),
        }}
      />
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
