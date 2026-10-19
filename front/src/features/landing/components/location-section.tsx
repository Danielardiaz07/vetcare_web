import { Icon } from "@/components/ui/icon";
import { SectionHeading } from "@/features/landing/components/section-heading";
import { CLINIC, directionsUrl, phoneUrl, whatsappUrl } from "@/features/landing/content";

const DIRECTIONS = [
  { label: "En bus:", text: CLINIC.busDirections },
  { label: "En carro o moto:", text: CLINIC.carDirections },
  {
    label: "Horario:",
    text: `lunes a viernes ${CLINIC.weekdayHours}, sábados ${CLINIC.saturdayHours} y urgencias ${CLINIC.emergencyHours}.`,
  },
];

export function LocationSection() {
  return (
    <section id="ubicacion" aria-labelledby="ubicacion-title" className="scroll-mt-28">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-16 sm:px-6">
        <SectionHeading id="ubicacion-title" title="Cómo llegar a la clínica">
          Estamos en {CLINIC.neighborhood}, {CLINIC.city}.
        </SectionHeading>
        <div className="grid gap-8 lg:grid-cols-2">
          {CLINIC.mapEmbedUrl ? (
            <iframe
              src={CLINIC.mapEmbedUrl}
              title="Mapa de la clínica"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="aspect-[4/3] w-full rounded-card border border-line"
            />
          ) : (
            <div
              role="img"
              aria-label="Espacio para el mapa de la clínica"
              className="flex aspect-[4/3] items-center justify-center rounded-card border border-sand-border bg-sand p-4 text-center font-semibold text-honey"
            >
              [MAPA DE GOOGLE MAPS]
            </div>
          )}
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <h3 className="font-semibold text-ink">Dirección</h3>
              <p className="text-muted">
                {CLINIC.address}, {CLINIC.neighborhood}, {CLINIC.city}
              </p>
              <p className="text-sm text-subtle">Referencia: {CLINIC.landmark}</p>
            </div>
            <ul className="flex flex-col gap-3">
              {DIRECTIONS.map((item) => (
                <li key={item.label} className="flex gap-3 text-muted">
                  <Icon
                    name="map-pin"
                    width={20}
                    height={20}
                    className="mt-0.5 flex-none text-brand-600"
                  />
                  <span>
                    <strong className="font-semibold text-ink">{item.label}</strong> {item.text}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-brand-600 px-5 font-medium text-white hover:bg-brand-700"
              >
                <Icon name="map-pin" width={18} height={18} />
                Cómo llegar
              </a>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-field-border bg-surface px-5 font-medium text-ink hover:bg-brand-50"
              >
                <Icon name="message" width={18} height={18} />
                WhatsApp
              </a>
              <a
                href={phoneUrl}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-field-border bg-surface px-5 font-medium text-ink hover:bg-brand-50"
              >
                <Icon name="phone" width={18} height={18} />
                Llamar
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
