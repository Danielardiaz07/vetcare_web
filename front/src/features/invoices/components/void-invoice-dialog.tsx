"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { invoiceErrorMessage } from "@/features/invoices/errors";
import { voidInvoiceSchema, type VoidInvoiceInput } from "@/features/invoices/schemas";
import { FIELD_LIMITS } from "@/lib/constants";
import { voidInvoice } from "@/services/invoices";
import type { Invoice } from "@/types/domain";

type VoidInvoiceDialogProps = {
  invoice: Invoice | null;
  onClose: () => void;
  onVoided: (invoice: Invoice) => void;
};

export function VoidInvoiceDialog({ invoice, onClose, onVoided }: VoidInvoiceDialogProps) {
  return (
    <Modal
      open={invoice !== null}
      title={invoice ? `¿Anular la factura ${invoice.number}?` : "Anular factura"}
      onClose={onClose}
    >
      {invoice && <VoidForm invoice={invoice} onClose={onClose} onVoided={onVoided} />}
    </Modal>
  );
}

function VoidForm({
  invoice,
  onClose,
  onVoided,
}: {
  invoice: Invoice;
  onClose: () => void;
  onVoided: (invoice: Invoice) => void;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<VoidInvoiceInput>({
    resolver: zodResolver(voidInvoiceSchema),
    defaultValues: { reason: "" },
  });

  const onSubmit = handleSubmit(async ({ reason }) => {
    setFormError(null);
    try {
      onVoided(await voidInvoice(invoice.id, reason));
    } catch (error) {
      setFormError(invoiceErrorMessage(error));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <p className="text-muted">
        La factura no se borra: queda anulada y sus conceptos vuelven a quedar pendientes para
        facturarlos de nuevo.
      </p>
      <Textarea
        label="Motivo"
        maxLength={FIELD_LIMITS.VOID_REASON_MAX}
        error={errors.reason?.message}
        {...register("reason")}
      />
      {formError && (
        <p
          role="alert"
          className="rounded-control border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger"
        >
          {formError}
        </p>
      )}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" disabled={isSubmitting} onClick={onClose}>
          No, mantener
        </Button>
        <Button type="submit" variant="danger" loading={isSubmitting}>
          Sí, anular
        </Button>
      </div>
    </form>
  );
}
