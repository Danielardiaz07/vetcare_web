"use client";

import Image from "next/image";
import { useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { VACCINE_STATUS } from "@/features/clinical/labels";
import { ownerFullName } from "@/features/owners/labels";
import { SEX_LABELS, SPECIES_LABELS } from "@/features/patients/labels";
import { clinicDateOf } from "@/lib/clinic-time";
import { formatDate } from "@/lib/format";
import type { Patient, VaccinationCardEntry } from "@/types/domain";

type VaccinationCardPrintProps = {
  patient: Patient;
  card: VaccinationCardEntry[];
};

export function VaccinationCardPrint({ patient, card }: VaccinationCardPrintProps) {
  const [issuedOn, setIssuedOn] = useState<string | null>(null);
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
      <Button variant="secondary" onClick={() => setIssuedOn(clinicDateOf(new Date()))}>
        Imprimir carné
      </Button>
      {issuedOn &&
        createPortal(
          <Modal open title={`Carné de ${patient.name}`} onClose={() => setIssuedOn(null)} wide>
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
                Los estados corresponden a la fecha de emisión. Una vacuna vence pronto cuando su
                próxima dosis es en los siguientes 7 días.
              </p>
            </article>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted">Puedes guardar el carné como PDF al imprimir.</p>
              <Button onClick={() => window.print()} disabled={card.length === 0}>
                Imprimir / guardar PDF
              </Button>
            </div>
          </Modal>,
          document.body,
        )}
    </>
  );
}
