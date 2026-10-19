"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Field } from "@/components/ui/field";
import { LoadingState } from "@/components/ui/loading-state";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { invoiceErrorMessage, isConflict } from "@/features/invoices/errors";
import { INVOICE_STATUS, PAYMENT_METHOD_LABELS } from "@/features/invoices/labels";
import { ownerSearchSchema, type OwnerSearchInput } from "@/features/invoices/schemas";
import { ownerDocument, ownerFullName } from "@/features/owners/labels";
import { clinicDateOf } from "@/lib/clinic-time";
import { FIELD_LIMITS, IVA_RATE_PERCENT, ROUTES } from "@/lib/constants";
import { formatCop, formatDate } from "@/lib/format";
import { createInvoice, getPendingConcepts, taxOf } from "@/services/invoices";
import { listOwners } from "@/services/owners";
import type { Invoice, Owner, PaymentMethod, PendingConcept } from "@/types/domain";

const CONFLICT_MESSAGE = "Algún concepto ya fue facturado. Revisa los pendientes.";

type PendingState =
  { status: "loading" } | { status: "error" } | { status: "ready"; concepts: PendingConcept[] };

const conceptKey = (concept: PendingConcept) => `${concept.kind}:${concept.id}`;

// La API describe el concepto con la mascota al final ("Consulta - Luna"); la mascota ya tiene su columna.
const conceptLabel = (concept: PendingConcept) => {
  const suffix = ` - ${concept.patientName}`;
  return concept.description.endsWith(suffix)
    ? concept.description.slice(0, -suffix.length)
    : concept.description;
};

const conceptDate = (concept: PendingConcept) => formatDate(clinicDateOf(new Date(concept.date)));

export function NewInvoice() {
  const [owner, setOwner] = useState<Owner | null>(null);
  const [created, setCreated] = useState<Invoice | null>(null);

  if (created) {
    return (
      <InvoiceReceipt
        invoice={created}
        onNew={() => {
          setCreated(null);
          setOwner(null);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold text-ink">Nueva factura</h2>
      {owner ? (
        <OwnerBilling owner={owner} onChangeOwner={() => setOwner(null)} onCreated={setCreated} />
      ) : (
        <OwnerSearch onFound={setOwner} />
      )}
    </div>
  );
}

function OwnerSearch({ onFound }: { onFound: (owner: Owner) => void }) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<OwnerSearchInput>({
    resolver: zodResolver(ownerSearchSchema),
    defaultValues: { documentNumber: "" },
  });

  const onSubmit = handleSubmit(async ({ documentNumber }) => {
    setFormError(null);
    try {
      const result = await listOwners({ page: 1, q: documentNumber });
      const owner = result.data.find((item) => item.documentNumber === documentNumber);
      if (owner) onFound(owner);
      else setError("documentNumber", { message: "No hay un propietario con esa cédula" });
    } catch (error) {
      setFormError(invoiceErrorMessage(error));
    }
  });

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-4 rounded-card border border-line bg-surface p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="sm:w-72">
          <Field
            label="Cédula del propietario"
            inputMode="numeric"
            maxLength={FIELD_LIMITS.DOCUMENT_NUMBER_MAX}
            error={errors.documentNumber?.message}
            {...register("documentNumber")}
          />
        </div>
        <Button type="submit" loading={isSubmitting} className="sm:mt-7">
          Buscar
        </Button>
      </div>
      {formError && (
        <p role="alert" className="text-sm text-danger">
          {formError}
        </p>
      )}
    </form>
  );
}

type OwnerBillingProps = {
  owner: Owner;
  onChangeOwner: () => void;
  onCreated: (invoice: Invoice) => void;
};

function OwnerBilling({ owner, onChangeOwner, onCreated }: OwnerBillingProps) {
  const { show } = useToast();
  const [pending, setPending] = useState<PendingState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [methodError, setMethodError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    setPending({ status: "loading" });
    setSelected(new Set());
    getPendingConcepts(owner.id)
      .then((concepts) => {
        if (active) setPending({ status: "ready", concepts });
      })
      .catch(() => {
        if (active) setPending({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, [owner.id, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  const concepts = pending.status === "ready" ? pending.concepts : [];
  const chosen = concepts.filter((concept) => selected.has(conceptKey(concept)));
  // La API no previsualiza: el front calcula igual que ella y la factura creada trae los valores finales.
  const subtotal = chosen.reduce((sum, concept) => sum + concept.amount, 0);
  const tax = chosen.reduce((sum, concept) => sum + taxOf(concept.amount), 0);
  const allSelected = concepts.length > 0 && chosen.length === concepts.length;

  function toggle(concept: PendingConcept) {
    setSelected((current) => {
      const next = new Set(current);
      const key = conceptKey(concept);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleGenerate() {
    setFormError(null);
    if (!paymentMethod) {
      setMethodError("Elige el método de pago");
      return;
    }
    setSubmitting(true);
    try {
      const invoice = await createInvoice({
        ownerId: owner.id,
        paymentMethod,
        consultationIds: chosen
          .filter((item) => item.kind === "CONSULTATION")
          .map((item) => item.id),
        vaccinationIds: chosen.filter((item) => item.kind === "VACCINATION").map((item) => item.id),
      });
      show(`Factura ${invoice.number} generada`, "success");
      onCreated(invoice);
    } catch (error) {
      if (isConflict(error)) {
        setFormError(CONFLICT_MESSAGE);
        reload();
      } else {
        setFormError(invoiceErrorMessage(error));
      }
    } finally {
      setSubmitting(false);
    }
  }

  const columns: DataTableColumn<PendingConcept>[] = [
    {
      key: "select",
      header: "Facturar",
      render: (concept) => (
        <Checkbox
          label={<span className="sr-only">Facturar {concept.description}</span>}
          checked={selected.has(conceptKey(concept))}
          onChange={() => toggle(concept)}
        />
      ),
    },
    { key: "date", header: "Fecha", render: conceptDate },
    { key: "pet", header: "Mascota", render: (concept) => concept.patientName },
    { key: "concept", header: "Concepto", render: conceptLabel },
    {
      key: "amount",
      header: "Valor",
      render: (concept) => <span className="whitespace-nowrap">{formatCop(concept.amount)}</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-surface p-5">
        <div className="flex min-w-0 flex-col">
          <span className="font-semibold break-words text-ink">{ownerFullName(owner)}</span>
          <span className="text-sm text-muted">{ownerDocument(owner)}</span>
        </div>
        <Button variant="secondary" onClick={onChangeOwner}>
          Cambiar propietario
        </Button>
      </section>

      {pending.status === "loading" && <LoadingState />}
      {pending.status === "error" && <ErrorState onRetry={reload} />}
      {pending.status === "ready" && concepts.length === 0 && (
        <EmptyState
          title="Este propietario no tiene conceptos por facturar"
          description="Las consultas y vacunas que se atiendan aparecerán aquí."
        />
      )}
      {pending.status === "ready" && concepts.length > 0 && (
        <>
          <section aria-labelledby="pending-title" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 id="pending-title" className="text-lg font-semibold text-ink">
                Conceptos pendientes
              </h3>
              <Checkbox
                label="Seleccionar todos"
                checked={allSelected}
                onChange={() =>
                  setSelected(allSelected ? new Set() : new Set(concepts.map(conceptKey)))
                }
              />
            </div>
            <DataTable columns={columns} rows={concepts} getRowKey={conceptKey} />
          </section>

          <section
            aria-labelledby="totals-title"
            className="flex flex-col gap-5 rounded-card border border-line bg-surface p-6"
          >
            <h3 id="totals-title" className="text-lg font-semibold text-ink">
              Totales y pago
            </h3>
            <Totals subtotal={subtotal} tax={tax} />
            <div className="sm:w-72">
              <Select
                label="Método de pago"
                value={paymentMethod}
                error={methodError}
                onChange={(event) => {
                  setPaymentMethod(event.target.value as PaymentMethod);
                  setMethodError(undefined);
                }}
              >
                <option value="" disabled>
                  Elige el método de pago
                </option>
                {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((method) => (
                  <option key={method} value={method}>
                    {PAYMENT_METHOD_LABELS[method]}
                  </option>
                ))}
              </Select>
            </div>
            {formError && (
              <p
                role="alert"
                className="rounded-control border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger"
              >
                {formError}
              </p>
            )}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button disabled={chosen.length === 0} loading={submitting} onClick={handleGenerate}>
                Generar factura
              </Button>
              {chosen.length === 0 && (
                <span className="text-sm text-muted">Elige al menos un concepto.</span>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Totals({ subtotal, tax }: { subtotal: number; tax: number }) {
  const rows: [string, number][] = [
    ["Subtotal", subtotal],
    [`IVA (${IVA_RATE_PERCENT} %)`, tax],
  ];
  return (
    <dl className="flex flex-col gap-2 sm:max-w-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-4">
          <dt className="text-muted">{label}</dt>
          <dd className="text-ink">{formatCop(value)}</dd>
        </div>
      ))}
      <div className="flex justify-between gap-4 border-t border-line pt-2 text-lg font-semibold">
        <dt className="text-ink">Total</dt>
        <dd className="text-ink">{formatCop(subtotal + tax)}</dd>
      </div>
    </dl>
  );
}

// RN-76: la factura queda numerada; los totales son los que calculó la API.
function InvoiceReceipt({ invoice, onNew }: { invoice: Invoice; onNew: () => void }) {
  return (
    <section className="flex flex-col gap-5 rounded-card border border-line bg-surface p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-semibold text-ink">Factura {invoice.number}</h2>
        <StatusBadge tone={INVOICE_STATUS[invoice.status].tone}>
          {INVOICE_STATUS[invoice.status].label}
        </StatusBadge>
      </div>
      <p className="text-muted">
        {ownerFullName(invoice.owner)} · {invoice.owner.documentNumber} ·{" "}
        {PAYMENT_METHOD_LABELS[invoice.paymentMethod]}
      </p>
      <ul className="flex flex-col divide-y divide-divider">
        {invoice.items.map((item) => (
          <li key={item.id} className="flex justify-between gap-4 py-2">
            <span className="break-words text-ink">{item.description}</span>
            <span className="whitespace-nowrap text-ink">{formatCop(item.amount)}</span>
          </li>
        ))}
      </ul>
      <Totals subtotal={invoice.subtotal} tax={invoice.tax} />
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button onClick={onNew}>Nueva factura</Button>
        <Link
          href={ROUTES.panelInvoices}
          className="inline-flex min-h-11 items-center justify-center rounded-control border border-field-border bg-surface px-5 font-medium text-ink transition-colors duration-150 ease-out hover:bg-brand-50"
        >
          Ver facturas
        </Link>
      </div>
    </section>
  );
}
