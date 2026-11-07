"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Icon } from "@/components/ui/icon";
import { LoadingState } from "@/components/ui/loading-state";
import { useToast } from "@/components/ui/toast";
import { ChangePasswordDialog } from "@/features/owners/components/change-password-dialog";
import { EditContactDialog } from "@/features/owners/components/edit-contact-dialog";
import { ownerDocument, ownerFullName } from "@/features/owners/labels";
import { PetCard } from "@/features/patients/components/pet-card";
import { ROUTES } from "@/lib/constants";
import { getMe } from "@/services/auth";
import { localPhone } from "@/services/owners";
import { getMyPatients } from "@/services/patients";
import type { OwnerSummary } from "@/types/auth";
import type { Patient } from "@/types/domain";

type ProfileData = { owner: OwnerSummary; email: string; pets: Patient[] };

type ProfileState =
  { status: "loading" } | { status: "error" } | { status: "ready"; data: ProfileData };

async function loadProfile(): Promise<ProfileData> {
  const [profile, pets] = await Promise.all([getMe(), getMyPatients()]);
  if (!profile.owner) throw new Error("La cuenta no tiene propietario vinculado");
  return { owner: profile.owner, email: profile.email, pets };
}

const initialsOf = ({ firstNames, lastNames }: OwnerSummary) =>
  `${firstNames.trim().charAt(0)}${lastNames.trim().charAt(0)}`.toUpperCase();

function addressLabel(address: string | null | undefined): string {
  if (address === undefined) return "No disponible";
  return address ?? "Sin dirección";
}

type OpenDialog = "contact" | "password" | null;

const ADD_PET_CLASSES =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-field-border bg-surface px-5 font-medium text-ink transition-colors duration-150 ease-out hover:bg-brand-50";

export function MyProfile() {
  const [state, setState] = useState<ProfileState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const { show } = useToast();

  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    loadProfile()
      .then((data) => {
        if (active) setState({ status: "ready", data });
      })
      .catch(() => {
        if (active) setState({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  if (state.status === "loading") return <LoadingState />;
  if (state.status === "error") return <ErrorState onRetry={reload} />;

  const { owner, email, pets } = state.data;
  const details: [string, string][] = [
    ["Documento", ownerDocument(owner)],
    ["Celular", localPhone(owner.phone)],
    ["Correo", email],
    ["Dirección", addressLabel(owner.address)],
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-ink">Mi perfil</h1>

      <section className="flex flex-col gap-5 rounded-card border border-line bg-surface p-6">
        <div className="flex items-center gap-4">
          <span
            aria-hidden="true"
            className="inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-brand-50 text-lg font-semibold text-brand-700"
          >
            {initialsOf(owner)}
          </span>
          <div className="flex min-w-0 flex-col">
            <h2 className="text-xl font-semibold break-words text-ink">{ownerFullName(owner)}</h2>
            <span className="text-sm text-muted">Tutor / Cliente</span>
          </div>
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
          <Button variant="secondary" onClick={() => setDialog("contact")}>
            Editar datos
          </Button>
          <Button variant="secondary" onClick={() => setDialog("password")}>
            Cambiar contraseña
          </Button>
        </div>
      </section>

      <section aria-labelledby="profile-pets-title" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 id="profile-pets-title" className="text-xl font-semibold text-ink">
            Mis mascotas
          </h2>
          <Link href={ROUTES.portalNewPet} className={ADD_PET_CLASSES}>
            <Icon name="paw" className="size-5" />
            Agregar mascota
          </Link>
        </div>
        {pets.length === 0 ? (
          <EmptyState
            title="Aún no tienes mascotas registradas"
            description="Agrégala aquí para poder agendarle citas y ver su historial."
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {pets.map((pet) => (
              <li key={pet.id}>
                <PetCard pet={pet} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <EditContactDialog
        open={dialog === "contact"}
        owner={owner}
        onClose={() => setDialog(null)}
        onSaved={() => {
          setDialog(null);
          show("Datos actualizados", "success");
          reload();
        }}
      />
      <ChangePasswordDialog
        open={dialog === "password"}
        onClose={() => setDialog(null)}
        onChanged={() => {
          setDialog(null);
          show("Contraseña actualizada", "success");
        }}
      />
    </div>
  );
}
