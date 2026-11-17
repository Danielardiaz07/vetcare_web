"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { ChangePasswordDialog } from "@/features/auth/components/change-password-dialog";
import { ownerDocument } from "@/features/owners/labels";
import { WEEKDAY_LABELS, WEEKDAYS } from "@/features/staff/labels";
import { ownStaffProfile, staffFullName, type OwnStaffProfile } from "@/features/users/account";
import { isStaffRole, ROLE_LABELS } from "@/lib/panel-menu";
import { getMe } from "@/services/auth";
import { localPhone } from "@/services/owners";
import { getSchedule, type StaffKind } from "@/services/staff";
import type { StaffProfileSummary, UserProfile } from "@/types/auth";
import type { ScheduleBlock } from "@/types/domain";

type AccountState =
  { status: "loading" } | { status: "error" } | { status: "ready"; account: UserProfile };

type ScheduleState =
  { status: "loading" } | { status: "error" } | { status: "ready"; blocks: ScheduleBlock[] };

const kindOf = (account: UserProfile): StaffKind =>
  account.role === "VETERINARIAN" ? "veterinarians" : "groomers";

// Solo se informa aquí: los datos del perfil y el horario los edita el administrador (RF-07).
const PROFILE_NOTES: Record<Exclude<OwnStaffProfile["status"], "ready">, string> = {
  "not-applicable":
    "Tu cuenta no tiene datos personales en el sistema: se identifica por tu correo.",
  unavailable: "Tus datos personales y tu horario todavía no se pueden mostrar aquí.",
  missing:
    "Tu cuenta todavía no tiene perfil. Pídele al administrador que lo cree en Personal y horarios.",
};

const initialsOf = (account: UserProfile, own: OwnStaffProfile) =>
  own.status === "ready"
    ? `${own.profile.firstNames.trim().charAt(0)}${own.profile.lastNames.trim().charAt(0)}`.toUpperCase()
    : account.email.charAt(0).toUpperCase();

function profileDetails(account: UserProfile, profile: StaffProfileSummary): [string, string][] {
  return [
    ["Documento", ownerDocument(profile)],
    ["Celular", localPhone(profile.phone)],
    ...(account.role === "VETERINARIAN" && profile.specialty
      ? ([["Especialidad", profile.specialty]] as [string, string][])
      : []),
  ];
}

export function MyAccount() {
  const { show } = useToast();
  const [state, setState] = useState<AccountState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    getMe()
      .then((account) => {
        if (active) setState({ status: "ready", account });
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

  const { account } = state;
  const own = ownStaffProfile(account);
  const roleLabel = isStaffRole(account.role) ? ROLE_LABELS[account.role] : "";
  const details: [string, string][] = [
    ["Correo", account.email],
    ["Rol", roleLabel],
    ...(own.status === "ready" ? profileDetails(account, own.profile) : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-ink">Mi cuenta</h1>

      <section className="flex flex-col gap-5 rounded-card border border-line bg-surface p-6">
        <div className="flex items-center gap-4">
          <span
            aria-hidden="true"
            className="inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-brand-50 text-lg font-semibold text-brand-700"
          >
            {initialsOf(account, own)}
          </span>
          <div className="flex min-w-0 flex-col items-start gap-1">
            <h2 className="text-xl font-semibold break-words text-ink">
              {own.status === "ready" ? staffFullName(own.profile) : account.email}
            </h2>
            {own.status === "ready" && !own.profile.active && (
              <StatusBadge tone="neutral">Perfil inactivo</StatusBadge>
            )}
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
        <p className="text-sm text-muted">
          {own.status === "ready"
            ? "Si algún dato está mal, pídele al administrador que lo corrija en Personal y horarios."
            : PROFILE_NOTES[own.status]}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="secondary" onClick={() => setChangingPassword(true)}>
            Cambiar contraseña
          </Button>
        </div>
      </section>

      {own.status === "ready" && <MySchedule kind={kindOf(account)} profileId={own.profile.id} />}

      <ChangePasswordDialog
        open={changingPassword}
        onClose={() => setChangingPassword(false)}
        onChanged={() => {
          setChangingPassword(false);
          show("Contraseña actualizada", "success");
        }}
      />
    </div>
  );
}

function MySchedule({ kind, profileId }: { kind: StaffKind; profileId: string }) {
  const [state, setState] = useState<ScheduleState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    getSchedule(kind, profileId)
      .then((blocks) => {
        if (active) setState({ status: "ready", blocks });
      })
      .catch(() => {
        if (active) setState({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, [kind, profileId, reloadKey]);

  const days =
    state.status === "ready"
      ? WEEKDAYS.map((weekday) => ({
          weekday,
          blocks: state.blocks
            .filter((block) => block.weekday === weekday)
            .sort((a, b) => a.startTime.localeCompare(b.startTime)),
        })).filter((day) => day.blocks.length > 0)
      : [];

  return (
    <section aria-labelledby="my-schedule-title" className="flex flex-col gap-4">
      <h2 id="my-schedule-title" className="text-xl font-semibold text-ink">
        Mi horario
      </h2>
      {state.status === "loading" && <LoadingState rows={2} />}
      {state.status === "error" && <ErrorState onRetry={() => setReloadKey((key) => key + 1)} />}
      {state.status === "ready" && days.length === 0 && (
        <EmptyState
          title="Aún no tienes horario"
          description="El administrador lo define en Personal y horarios; mientras tanto no recibes citas."
        />
      )}
      {days.length > 0 && (
        <dl className="flex flex-col divide-y divide-divider rounded-card border border-line bg-surface">
          {days.map(({ weekday, blocks }) => (
            <div
              key={weekday}
              className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:gap-4"
            >
              <dt className="font-medium text-ink sm:w-32">{WEEKDAY_LABELS[weekday]}</dt>
              <dd className="text-muted">
                {blocks.map((block) => `${block.startTime} a ${block.endTime}`).join(" · ")}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
