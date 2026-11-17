"use client";

import Image from "next/image";
import { useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { VACCINE_STATUS } from "@/features/clinical/labels";
import { useCardVerification } from "@/features/clinical/hooks/use-card-verification";
import { ownerFullName } from "@/features/owners/labels";
import { SEX_LABELS, SPECIES_LABELS } from "@/features/patients/labels";
import { clinicDateOf } from "@/lib/clinic-time";
import { formatDate } from "@/lib/format";
import type { Patient, VaccinationCardEntry } from "@/types/domain";

type VaccinationCardPrintProps = {
  patient: Patient;
  card: VaccinationCardEntry[];
  staff?: boolean;
};

export function VaccinationCardPrint({ patient, card, staff = false }: VaccinationCardPrintProps) {
  const [issuedOn, setIssuedOn] = useState<string | null>(null);
  return (
    <>
      <Button variant="secondary" onClick={() => setIssuedOn(clinicDateOf(new Date()))}>
        Imprimir carné
      </Button>
      {issuedOn &&
        createPortal(
          <Modal open title={`Carné de ${patient.name}`} onClose={() => setIssuedOn(null)} wide>
            <VaccinationCardPreview
              key={`${patient.id}:${staff}`}
              patient={patient}
              card={card}
              staff={staff}
              issuedOn={issuedOn}
            />
          </Modal>,
          document.body,
        )}
    </>
  );
}

function VaccinationCardPreview({
  patient,
  card,
  staff,
  issuedOn,
}: VaccinationCardPrintProps & { staff: boolean; issuedOn: string }) {
  const { link, busy, error, change, retry } = useCardVerification(patient.id, staff);
  const [confirmation, setConfirmation] = useState<"rotate" | "disable" | null>(null);
  const [loadedSvg, setLoadedSvg] = useState<string | null>(null);
  const [failedSvg, setFailedSvg] = useState<string | null>(null);
  const qr = link?.active ? link : null;
  const imageFailed = Boolean(qr && failedSvg === qr.qrSvg);
  const waitingForImage = Boolean(qr && loadedSvg !== qr.qrSvg && !imageFailed);
  const details: [string, string][] = [
    ["Mascota", patient.name],
    ["Especie", SPECIES_LABELS[patient.species]],
    ["Raza", patient.breed],
    ["Sexo", SEX_LABELS[patient.sex]],
    ["Nacimiento", formatDate(patient.birthDate)],
    ["Propietario", ownerFullName(patient.owner)],
  ];

  return (
    <>
      <article className="vaccination-card-print flex flex-col gap-6">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="" width={44} height={44} loading="eager" />
            <div>
              <p className="font-semibold text-brand-700">VetCare</p>
              <h3 className="text-xl font-semibold text-ink">Carné de vacunación</h3>
            </div>
          </div>
          <p className="text-sm text-muted">Emitido el {formatDate(issuedOn)}</p>
        </header>

        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3 print:grid-cols-3">
          {details.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-subtle">{label}</dt>
              <dd className="font-medium break-words text-ink">{value}</dd>
            </div>
          ))}
        </dl>

        {card.length === 0 ? (
          <p className="text-muted">Sin vacunas registradas.</p>
        ) : (
          <table className="w-full table-fixed text-left text-sm">
            <caption className="pb-3 text-left text-muted">
              Última dosis registrada de cada vacuna
            </caption>
            <thead className="hidden border-b border-line text-subtle sm:table-header-group print:table-header-group">
              <tr>
                {["Vacuna", "Aplicada", "Lote", "Próxima dosis", "Estado", "Veterinario"].map(
                  (label) => (
                    <th key={label} scope="col" className="py-3 pr-3 align-top font-medium">
                      {label}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="block sm:table-row-group print:table-row-group">
              {card.map((entry) => {
                const cells: [string, string][] = [
                  ["Vacuna", entry.vaccine.name],
                  ["Aplicada", formatDate(entry.appliedAt)],
                  ["Lote", entry.lot],
                  [
                    "Próxima dosis",
                    entry.nextDoseAt ? formatDate(entry.nextDoseAt) : "Sin próxima dosis",
                  ],
                  ["Estado", VACCINE_STATUS[entry.status].label],
                  ["Veterinario", ownerFullName(entry.veterinarian)],
                ];

                return (
                  <tr
                    key={entry.id}
                    className="grid grid-cols-2 gap-3 border-b border-divider py-4 sm:table-row sm:py-0 print:table-row print:py-0"
                  >
                    {cells.map(([label, value]) => (
                      <td
                        key={label}
                        className="min-w-0 align-top break-words text-ink sm:py-3 sm:pr-3 print:py-3 print:pr-3"
                      >
                        <span className="block text-xs text-subtle sm:hidden print:hidden">
                          {label}
                        </span>
                        {value}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <p className="text-sm text-muted">
          Los estados corresponden a la fecha de emisión. Una vacuna vence pronto cuando su próxima
          dosis es en los siguientes 7 días.
        </p>
        {qr && !imageFailed && (
          <section className="flex flex-col items-start gap-4 border-t border-line pt-4 sm:flex-row sm:items-center print:break-inside-avoid print:flex-row print:items-center">
            <Image
              src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr.qrSvg)}`}
              alt={`QR para verificar las vacunas de ${patient.name}`}
              width={144}
              height={144}
              unoptimized
              loading="eager"
              onLoad={() => setLoadedSvg(qr.qrSvg)}
              onError={() => setFailedSvg(qr.qrSvg)}
              className="size-36 shrink-0 bg-white p-2 print:size-[35mm]"
            />
            <div className="min-w-0 space-y-2">
              <h4 className="font-semibold text-brand-700">Verifica sus vacunas</h4>
              <p className="text-sm text-muted">
                Escanea el QR para consultar el estado actualizado. Solo se muestran nombre, especie
                y vacunas; no requiere iniciar sesión.
              </p>
              <a
                href={qr.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block break-all text-xs text-brand-700 underline underline-offset-4"
              >
                {qr.url}
              </a>
            </div>
          </section>
        )}
      </article>
      <section
        aria-label="Verificación del carné"
        className="space-y-3 border-t border-line pt-4 print:hidden"
      >
        {busy ? (
          <p role="status" className="text-sm text-muted">
            Preparando verificación…
          </p>
        ) : error || imageFailed ? (
          <div role="alert" className="space-y-2">
            <p className="text-sm text-muted">
              No pudimos cargar el QR. Puedes reintentar o imprimir el carné sin QR.
            </p>
            <Button
              variant="secondary"
              onClick={() => {
                setLoadedSvg(null);
                setFailedSvg(null);
                retry();
              }}
            >
              Reintentar QR
            </Button>
          </div>
        ) : link && !link.active ? (
          <p role="status" className="text-sm text-muted">
            El QR está desactivado.{" "}
            {staff
              ? "Solo el propietario puede activarlo de nuevo."
              : "Los carnés con el QR anterior ya no permiten verificar las vacunas."}
          </p>
        ) : null}
        {!staff && link && !busy && !confirmation && (
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => setConfirmation("rotate")}>
              {link.active ? "Cambiar QR" : "Activar nuevo QR"}
            </Button>
            {link.active && (
              <Button variant="secondary" onClick={() => setConfirmation("disable")}>
                Desactivar QR
              </Button>
            )}
          </div>
        )}
        {confirmation && (
          <div className="space-y-3 rounded-control bg-canvas p-4">
            <p className="text-sm text-ink">
              {confirmation === "rotate"
                ? "Se creará un QR nuevo. Los carnés que tengan el anterior dejarán de permitir la verificación. Tendrás que imprimir el nuevo carné."
                : "El QR dejará de mostrar las vacunas, incluso en carnés ya impresos. Puedes activar uno nuevo después."}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                variant={confirmation === "disable" ? "danger" : "primary"}
                onClick={() => {
                  const action = confirmation;
                  setConfirmation(null);
                  setLoadedSvg(null);
                  setFailedSvg(null);
                  void change(action);
                }}
              >
                {confirmation === "rotate" ? "Crear nuevo QR" : "Desactivar QR"}
              </Button>
              <Button variant="secondary" onClick={() => setConfirmation(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">Puedes guardar el carné como PDF al imprimir.</p>
        <Button
          onClick={() => window.print()}
          disabled={card.length === 0 || busy || waitingForImage || Boolean(confirmation)}
        >
          {busy || waitingForImage
            ? "Preparando carné…"
            : qr && !imageFailed
              ? "Imprimir / guardar PDF"
              : "Imprimir sin QR / guardar PDF"}
        </Button>
      </div>
    </>
  );
}
