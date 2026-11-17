"use client";

import { useCallback, useEffect, useState } from "react";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { isNetworkError, NETWORK_ERROR_MESSAGE } from "@/features/auth/errors";
import { APPOINTMENT_TYPE_LABELS, DURATION_OPTIONS, durationLabel } from "@/features/staff/labels";
import { ApiError } from "@/services/http-client";
import { listAppointmentTypes, updateAppointmentType } from "@/services/staff";
import type { AppointmentType, AppointmentTypeSetting } from "@/types/domain";

type DurationsState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; settings: AppointmentTypeSetting[] };

// D-21: el administrador ajusta cuánto dura cada tipo de cita.
export function AppointmentDurations() {
  const { show } = useToast();
  const [state, setState] = useState<DurationsState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [saving, setSaving] = useState<AppointmentType | null>(null);

  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    listAppointmentTypes()
      .then((settings) => {
        if (active) setState({ status: "ready", settings });
      })
      .catch(() => {
        if (active) setState({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  async function handleChange(type: AppointmentType, minutes: number) {
    if (state.status !== "ready") return;
    const previous = state.settings;
    setState({
      status: "ready",
      settings: previous.map((item) =>
        item.type === type ? { ...item, durationMinutes: minutes } : item,
      ),
    });
    setSaving(type);
    try {
      await updateAppointmentType(type, minutes);
      show(`${APPOINTMENT_TYPE_LABELS[type]}: ${durationLabel(minutes)}`, "success");
    } catch (error) {
      setState({ status: "ready", settings: previous });
      show(
        isNetworkError(error) || !(error instanceof ApiError)
          ? NETWORK_ERROR_MESSAGE
          : error.message,
        "danger",
      );
    } finally {
      setSaving(null);
    }
  }

  return (
    <section aria-labelledby="durations-title" className="flex flex-col gap-4">
      <h2 id="durations-title" className="text-xl font-semibold text-ink">
        Duración de cada tipo de cita
      </h2>
      {state.status === "loading" && <LoadingState rows={1} />}
      {state.status === "error" && <ErrorState onRetry={reload} />}
      {state.status === "ready" && (
        <div className="grid gap-4 rounded-card border border-line bg-surface p-6 sm:grid-cols-2 lg:grid-cols-4">
          {state.settings.map((setting) => (
            <Select
              key={setting.type}
              label={APPOINTMENT_TYPE_LABELS[setting.type]}
              value={setting.durationMinutes}
              disabled={saving === setting.type}
              onChange={(event) => void handleChange(setting.type, Number(event.target.value))}
            >
              {DURATION_OPTIONS.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {durationLabel(minutes)}
                </option>
              ))}
            </Select>
          ))}
        </div>
      )}
    </section>
  );
}
