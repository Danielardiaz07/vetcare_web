"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Icon } from "@/components/ui/icon";
import { LoadingState } from "@/components/ui/loading-state";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { OwnerForm } from "@/features/owners/components/owner-form";
import { ownerErrorMessage } from "@/features/owners/errors";
import { ownerDocument, ownerFullName, SPECIES_LABELS } from "@/features/owners/labels";
import { ROUTES } from "@/lib/constants";
import { ApiError } from "@/services/http-client";
import { deactivateOwner, getOwner, type OwnerWithPets } from "@/services/owners";

const NOT_FOUND = 404;

type DetailState =
  | { status: "loading" }
  | { status: "not-found" }
  | { status: "error" }
  | { status: "ready"; data: OwnerWithPets };

type OwnerDetailProps = {
  ownerId: string;
};

export function OwnerDetail({ ownerId }: OwnerDetailProps) {
  const { show } = useToast();
  const [state, setState] = useState<DetailState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [editing, setEditing] = useState(false);
  const [confirmingDeactivation, setConfirmingDeactivation] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    getOwner(ownerId)
      .then((data) => {
        if (active) setState({ status: "ready", data });
      })
      .catch((error: unknown) => {
        if (!active) return;
        const notFound = error instanceof ApiError && error.status === NOT_FOUND;
        setState({ status: notFound ? "not-found" : "error" });
      });
    return () => {
      active = false;
    };
  }, [ownerId, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  const backLink = (
    <Link
      href={ROUTES.panelOwners}
      className="inline-flex min-h-11 items-center self-start font-semibold text-brand-700 underline underline-offset-2"
    >
      Volver a propietarios
    </Link>
  );

  if (state.status === "loading") return <LoadingState />;
  if (state.status === "error") return <ErrorState onRetry={reload} />;
  if (state.status === "not-found") {
    return (
      <EmptyState
        title="No encontramos este propietario"
        description="Puede que el enlace esté mal escrito. Búscalo de nuevo en la lista."
        action={backLink}
      />
    );
  }

  const { owner, pets } = state.data;

  async function handleDeactivate() {
    setDeactivating(true);
    try {
      await deactivateOwner(owner.id);
      setConfirmingDeactivation(false);
      show("Propietario desactivado", "success");
      reload();
    } catch (error) {
      show(ownerErrorMessage(error), "danger");
    } finally {
      setDeactivating(false);
    }
  }

  const details: [string, string][] = [
    ["Documento", ownerDocument(owner)],
    ["Celular", owner.phone],
    ["Correo", owner.email ?? "Sin correo"],
    ["Dirección", owner.address ?? "Sin dirección"],
    ["Cuenta en el portal", owner.hasAccount ? "Sí" : "No"],
  ];

  return (
    <div className="flex flex-col gap-6">
      {backLink}

      <section className="flex flex-col gap-4 rounded-card border border-line bg-surface p-6">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-semibold text-ink">{ownerFullName(owner)}</h2>
          {owner.active ? (
            <StatusBadge tone="success">Activo</StatusBadge>
          ) : (
            <StatusBadge tone="neutral">Inactivo</StatusBadge>
          )}
        </div>
        <dl className="grid gap-4 sm:grid-cols-2">
          {details.map(([label, value]) => (
            <div key={label} className="flex flex-col gap-1">
              <dt className="text-sm text-subtle">{label}</dt>
              <dd className="break-words text-ink">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="secondary" onClick={() => setEditing(true)}>
            Editar
          </Button>
          {owner.active && (
            <Button variant="danger" onClick={() => setConfirmingDeactivation(true)}>
              Desactivar propietario
            </Button>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-ink">Mascotas</h2>
          <Button
            variant="secondary"
            onClick={() => show("Agregar mascota estará disponible pronto.")}
          >
            <Icon name="paw" className="size-5" />
            Agregar mascota
          </Button>
        </div>
        {pets.length === 0 ? (
          <EmptyState
            title="Sin mascotas"
            description="Este propietario todavía no tiene mascotas registradas."
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {pets.map((pet) => (
              <li
                key={pet.id}
                className="flex items-center justify-between gap-3 rounded-card border border-line bg-surface px-4 py-3"
              >
                <div className="flex flex-col">
                  <span className="font-semibold text-ink">{pet.name}</span>
                  <span className="text-sm text-muted">
                    {SPECIES_LABELS[pet.species]} · {pet.breed}
                  </span>
                </div>
                {!pet.active && <StatusBadge tone="neutral">Inactiva</StatusBadge>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal open={editing} title="Editar propietario" onClose={() => setEditing(false)}>
        {editing && (
          <OwnerForm
            owner={owner}
            onCancel={() => setEditing(false)}
            onSaved={() => {
              setEditing(false);
              show("Cambios guardados", "success");
              reload();
            }}
          />
        )}
      </Modal>

      <Modal
        open={confirmingDeactivation}
        title="Desactivar propietario"
        onClose={() => setConfirmingDeactivation(false)}
      >
        <div className="flex flex-col gap-4">
          <p>
            ¿Desactivar a <strong>{ownerFullName(owner)}</strong>?
          </p>
          <p className="text-muted">No se elimina: su historial y sus mascotas se conservan.</p>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              disabled={deactivating}
              onClick={() => setConfirmingDeactivation(false)}
            >
              Volver
            </Button>
            <Button variant="danger" loading={deactivating} onClick={() => void handleDeactivate()}>
              Desactivar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
