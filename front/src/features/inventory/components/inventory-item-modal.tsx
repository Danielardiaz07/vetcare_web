"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { inventoryErrorMessage } from "@/features/inventory/errors";
import { KIND_LABELS, NAME_MAX } from "@/features/inventory/labels";
import { inventoryItemSchema, type InventoryItemFormInput } from "@/features/inventory/schemas";
import { FormError } from "@/features/users/components/form-error";
import { FIELD_LIMITS } from "@/lib/constants";
import {
  createInventoryItem,
  updateInventoryItem,
  VaccineStockNotSavedError,
  type UpdateInventoryInput,
} from "@/services/inventory";
import type { InventoryItem, InventoryKind } from "@/types/domain";

const PRICE_STEP = 1 / 10 ** FIELD_LIMITS.PRICE_DECIMALS;

export type InventoryModalTarget = { kind: InventoryKind; item: InventoryItem | null };

type InventoryItemModalProps = {
  target: InventoryModalTarget | null;
  onClose: () => void;
  onSaved: (message: string, tone: "success" | "warning") => void;
};

export function InventoryItemModal({ target, onClose, onSaved }: InventoryItemModalProps) {
  const singular = target ? KIND_LABELS[target.kind].singular : "";
  const title = target?.item
    ? `Editar ${singular}`
    : target?.kind === "VACCINE"
      ? "Nueva vacuna"
      : "Nuevo medicamento";

  return (
    <Modal open={target !== null} title={title} onClose={onClose}>
      {target && (
        <InventoryItemForm
          key={target.item?.id ?? target.kind}
          kind={target.kind}
          item={target.item}
          onCancel={onClose}
          onSaved={onSaved}
        />
      )}
    </Modal>
  );
}

type InventoryItemFormProps = {
  kind: InventoryKind;
  item: InventoryItem | null;
  onCancel: () => void;
  onSaved: InventoryItemModalProps["onSaved"];
};

// Solo se envía lo que cambió; la API exige al menos un campo.
function changesOf(item: InventoryItem, input: InventoryItemFormInput): UpdateInventoryInput {
  const changes: UpdateInventoryInput = {};
  if (input.name !== item.name) changes.name = input.name;
  if (input.price !== item.price) changes.price = input.price;
  if (input.stock !== item.stock) changes.stock = input.stock;
  if (input.minStock !== item.minStock) changes.minStock = input.minStock;
  const expiresAt = input.expiresAt || null;
  if (expiresAt !== item.expiresAt) changes.expiresAt = expiresAt;
  if (input.active !== item.active) changes.active = input.active;
  return changes;
}

function InventoryItemForm({ kind, item, onCancel, onSaved }: InventoryItemFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const nameMax = NAME_MAX[kind];
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<InventoryItemFormInput>({
    resolver: zodResolver(inventoryItemSchema(nameMax)),
    defaultValues: {
      name: item?.name ?? "",
      price: item?.price,
      stock: item?.stock ?? 0,
      minStock: item?.minStock ?? 0,
      expiresAt: item?.expiresAt ?? "",
      active: item?.active ?? true,
    },
  });

  async function save(input: InventoryItemFormInput) {
    if (item) {
      const changes = changesOf(item, input);
      if (Object.keys(changes).length === 0) {
        setFormError("No hay cambios para guardar");
        return;
      }
      await updateInventoryItem(kind, item.id, changes);
      onSaved("Cambios guardados", "success");
      return;
    }
    const { name, price, stock, minStock, expiresAt } = input;
    await createInventoryItem(kind, {
      name,
      price,
      stock,
      minStock,
      ...(expiresAt && { expiresAt }),
    });
    onSaved(kind === "VACCINE" ? "Vacuna creada" : "Medicamento creado", "success");
  }

  const onSubmit = handleSubmit(async (input) => {
    setFormError(null);
    setSaving(true);
    try {
      await save(input);
    } catch (error) {
      // La vacuna ya existe aunque falte su stock: se cierra para no crearla dos veces.
      if (error instanceof VaccineStockNotSavedError) onSaved(error.message, "warning");
      else setFormError(inventoryErrorMessage(error));
    } finally {
      setSaving(false);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <FormError message={formError} />
      <Field
        label="Nombre"
        maxLength={nameMax}
        autoComplete="off"
        error={errors.name?.message}
        {...register("name")}
      />
      <Field
        label="Precio (COP)"
        type="number"
        inputMode="decimal"
        min={0}
        max={FIELD_LIMITS.PRICE_MAX}
        step={PRICE_STEP}
        error={errors.price?.message}
        {...register("price", { valueAsNumber: true })}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Stock"
          type="number"
          inputMode="numeric"
          min={0}
          max={FIELD_LIMITS.STOCK_MAX}
          step={1}
          hint="Unidades disponibles"
          error={errors.stock?.message}
          {...register("stock", { valueAsNumber: true })}
        />
        <Field
          label="Stock mínimo"
          type="number"
          inputMode="numeric"
          min={0}
          max={FIELD_LIMITS.STOCK_MAX}
          step={1}
          hint="Con este valor o menos se marca como stock crítico"
          error={errors.minStock?.message}
          {...register("minStock", { valueAsNumber: true })}
        />
      </div>
      <Field
        label="Vencimiento"
        type="date"
        hint="Déjalo vacío si el producto no vence"
        error={errors.expiresAt?.message}
        {...register("expiresAt")}
      />
      {item && (
        <Checkbox
          label="Activo"
          hint="Un producto inactivo no genera alertas"
          {...register("active")}
        />
      )}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={saving}>
          {item ? "Guardar" : "Crear"}
        </Button>
      </div>
    </form>
  );
}
