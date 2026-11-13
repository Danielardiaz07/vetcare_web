import { Icon, type IconName } from "@/components/ui/icon";
import { SectionHeading } from "@/features/landing/components/section-heading";
import {
  CLINIC,
  directionsUrl,
  HOURS_SUMMARY,
  mapEmbedUrl,
  phoneUrl,
  whatsappUrl,
} from "@/features/landing/content";

const DIRECTIONS: { icon: IconName; label: string; text: string }[] = [
  { icon: "bus", label: "En bus:", text: CLINIC.busDirections },
  { icon: "car", label: "En carro o moto:", text: CLINIC.carDirections },
  { icon: "clock", label: "Horario:", text: `${HOURS_SUMMARY}; urgencias 24 h.` },
];

const ACTION_CLASS =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-control px-5 text-[15px] font-semibold transition-[background-color,transform] duration-150 ease-out active:scale-[0.97] motion-reduce:active:scale-100";

// D-45: mapa grande y, al lado, una tarjeta con la dirección y cómo llegar. Sin etiqueta flotante
// sobre el mapa: Google ya muestra la suya en esa esquina y quedaban encimadas.
export function LocationSection() {
  return (
    <section
      id="ubicacion"
      aria-labelledby="ubicacion-title"
      className="scroll-mt-header-bar bg-surface"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-20 sm:px-6 lg:py-16">
        <SectionHeading id="ubicacion-title" title="Cómo llegar a la clínica.">
          Estamos en el {CLINIC.neighborhood} de {CLINIC.city}. Llega en bus, carro o moto; te
          contamos cómo.
        </SectionHeading>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-stretch">
          <div className="relative min-h-[25rem] min-w-0 overflow-hidden rounded-card border border-line bg-divider lg:flex-[1.4_1_32.5rem]">
            <iframe
              src={mapEmbedUrl}
              title="Mapa de la clínica"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="absolute inset-0 size-full"
            />
          </div>

          <div className="flex min-w-0 flex-col gap-4 rounded-card bg-surface p-6 shadow-soft lg:flex-[1_1_21.25rem]">
            <div>
              <h3 className="text-sm font-normal text-subtle">Dirección</h3>
              <p className="pt-0.5 text-lg font-semibold text-ink">
                {CLINIC.address}, {CLINIC.neighborhood}, {CLINIC.city}
              </p>
              <p className="pt-0.5 text-[15px] text-muted">Referencia: {CLINIC.landmark}</p>
            </div>
            <ul className="flex flex-col gap-3 text-[15px] leading-normal text-muted">
              {DIRECTIONS.map((item) => (
                <li key={item.label} className="flex gap-3">
                  <Icon
                    name={item.icon}
                    width={20}
                    height={20}
                    className="mt-px flex-none text-brand-600"
                  />
                  <span>
                    <strong className="font-semibold text-ink">{item.label}</strong> {item.text}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-auto flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`${ACTION_CLASS} bg-brand-600 text-white hover:bg-brand-700`}
              >
                <Icon name="map-pin" width={18} height={18} />
                Cómo llegar
              </a>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`${ACTION_CLASS} border-[1.5px] border-brand-200 bg-brand-100 text-brand-600 hover:bg-brand-200`}
              >
                <Icon name="message-circle" width={16} height={16} />
                Escribir por WhatsApp
              </a>
              <a
                href={phoneUrl}
                className={`${ACTION_CLASS} border-[1.5px] border-line bg-surface text-ink hover:bg-brand-50`}
              >
                <Icon name="phone" width={16} height={16} />
                Llamar a la clínica
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
