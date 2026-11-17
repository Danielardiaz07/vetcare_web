import { StatusBadge } from "@/components/ui/status-badge";
import { VACCINE_STATUS } from "@/features/clinical/labels";
import { SPECIES_LABELS } from "@/features/patients/labels";
import { formatDate } from "@/lib/format";
import { getPublicVaccinationCard, type PublicVaccinationCard } from "@/services/card-verification";
import { ApiError } from "@/services/http-client";

const ACTION_CLASS =
  "inline-flex min-h-11 items-center justify-center rounded-control border border-field-border bg-surface px-5 font-medium text-ink hover:bg-brand-50";

const verifiedDate = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Bogota",
});

export async function PublicVaccinationCardView({ token }: { token: string }) {
  const refreshHref = `/verify/${encodeURIComponent(token)}`;
  let card: PublicVaccinationCard;
  try {
    card = await getPublicVaccinationCard(token);
  } catch (error) {
    const unavailable = error instanceof ApiError && error.status === 404;
    return (
      <section
        role="alert"
        className="space-y-4 rounded-card border border-line bg-surface p-6 sm:p-8"
      >
        <h1 className="text-2xl font-semibold text-ink">
          {unavailable ? "Carné no disponible" : "No pudimos verificar el carné"}
        </h1>
        <p className="text-muted">
          {unavailable
            ? "Este enlace no existe o ya no está activo. Solicita al propietario el carné con su QR vigente."
            : "Revisa tu conexión e intenta de nuevo. No podemos confirmar el estado de las vacunas en este momento."}
        </p>
        <a href={refreshHref} className={ACTION_CLASS}>
          Reintentar verificación
        </a>
      </section>
    );
  }

  return <VerifiedVaccinationCard card={card} refreshHref={refreshHref} />;
}

export function VerifiedVaccinationCard({
  card,
  refreshHref,
}: {
  card: PublicVaccinationCard;
  refreshHref: string;
}) {
  const overdue = card.vaccines.filter((vaccine) => vaccine.status === "OVERDUE").length;
  const dueSoon = card.vaccines.filter((vaccine) => vaccine.status === "DUE_SOON").length;

  return (
    <article className="overflow-hidden rounded-card border border-line bg-surface">
      <header className="space-y-4 bg-brand-50 p-6 sm:p-8">
        <h1 className="text-2xl font-semibold text-ink">Carné de vacunación</h1>
        <div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="min-w-0 text-3xl font-semibold break-words text-brand-700">
              {card.patient.name}
            </h2>
            <div className="flex flex-wrap gap-2">
              {card.vaccines.length === 0 ? (
                <StatusBadge tone="neutral">Sin vacunas registradas</StatusBadge>
              ) : overdue === 0 && dueSoon === 0 ? (
                <StatusBadge tone="success">Vacunas registradas al día</StatusBadge>
              ) : (
                <>
                  {overdue > 0 && (
                    <StatusBadge tone="danger">
                      {overdue} {overdue === 1 ? "vacuna vencida" : "vacunas vencidas"}
                    </StatusBadge>
                  )}
                  {dueSoon > 0 && (
                    <StatusBadge tone="warning">
                      {dueSoon} {dueSoon === 1 ? "vacuna por vencer" : "vacunas por vencer"}
                    </StatusBadge>
                  )}
                </>
              )}
            </div>
          </div>
          <p className="mt-1 text-muted">
            {SPECIES_LABELS[card.patient.species]} · {card.clinic}
          </p>
        </div>
        <p className="text-sm text-muted">
          Consultado el{" "}
          <time dateTime={card.verifiedAt}>{verifiedDate.format(new Date(card.verifiedAt))}</time>{" "}
          (Colombia).
        </p>
      </header>
      <div className="space-y-6 p-6 sm:p-8">
        {card.vaccines.length === 0 ? (
          <p className="text-muted">
            No hay vacunas registradas para verificar. Esto no significa que la mascota esté al día.
          </p>
        ) : (
          <section aria-labelledby="verified-vaccines-title">
            <h3 id="verified-vaccines-title" className="text-lg font-semibold text-ink">
              Últimas dosis registradas
            </h3>
            <ul className="mt-2 divide-y divide-line">
              {card.vaccines.map((vaccine) => (
                <li key={vaccine.name} className="space-y-3 py-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h4 className="min-w-0 flex-1 font-semibold break-words text-ink">
                      {vaccine.name}
                    </h4>
                    <StatusBadge tone={VACCINE_STATUS[vaccine.status].tone}>
                      {VACCINE_STATUS[vaccine.status].label}
                    </StatusBadge>
                  </div>
                  <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-subtle">Aplicada</dt>
                      <dd className="mt-1 font-medium text-ink">{formatDate(vaccine.appliedAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-subtle">Próxima dosis</dt>
                      <dd className="mt-1 font-medium text-ink">
                        {vaccine.nextDoseAt
                          ? formatDate(vaccine.nextDoseAt)
                          : "Sin próxima dosis registrada"}
                      </dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          </section>
        )}
        <div className="space-y-4 border-t border-line pt-5">
          <p className="text-sm text-muted">
            Los estados se calculan al consultar. “Vence pronto” indica una próxima dosis en los
            siguientes 7 días.
          </p>
          <a href={refreshHref} className={ACTION_CLASS}>
            Actualizar verificación
          </a>
        </div>
      </div>
    </article>
  );
}
