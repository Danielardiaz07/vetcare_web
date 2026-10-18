"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Icon } from "@/components/ui/icon";
import { LoadingState } from "@/components/ui/loading-state";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { isNetworkError, NETWORK_ERROR_MESSAGE } from "@/features/auth/errors";
import { ownerFullName } from "@/features/owners/labels";
import { TIME_OPTIONS, WEEKDAY_LABELS, WEEKDAYS } from "@/features/staff/labels";
import { scheduleSchema, type ScheduleFormInput } from "@/features/staff/schemas";
import { ApiError } from "@/services/http-client";
import { getSchedule, saveSchedule, type StaffKind } from "@/services/staff";
import type { ScheduleBlock, StaffProfile } from "@/types/domain";

const DEFAULT_BLOCK = { startTime: "08:00", endTime: "12:00" };

// Un bloque nuevo empieza donde termina el último del día.
function nextBlock(weekday: number, dayBlocks: ScheduleBlock[]): ScheduleBlock {
  const last = dayBlocks.at(-1);
  if (!last) return { weekday, ...DEFAULT_BLOCK };
  const nextIndex = Math.min(TIME_OPTIONS.indexOf(last.endTime) + 1, TIME_OPTIONS.length - 1);
  return { weekday, startTime: last.endTime, endTime: TIME_OPTIONS[nextIndex] ?? last.endTime };
}

const sortBlocks = (blocks: ScheduleBlock[]) =>
  [...blocks].sort((a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime));

type ScheduleFormProps = {
  kind: StaffKind;
  profile: StaffProfile;
  initialBlocks: ScheduleBlock[];
  onCancel: () => void;
  onSaved: () => void;
};

function ScheduleForm({ kind, profile, initialBlocks, onCancel, onSaved }: ScheduleFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ScheduleFormInput>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: { blocks: sortBlocks(initialBlocks) },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "blocks" });
  const blocks = watch("blocks");

  const onSubmit = handleSubmit(async ({ blocks: week }) => {
    setFormError(null);
    try {
      await saveSchedule(kind, profile.id, sortBlocks(week));
      onSaved();
    } catch (error) {
      setFormError(
        isNetworkError(error) || !(error instanceof ApiError)
          ? NETWORK_ERROR_MESSAGE
          : error.message,
      );
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {formError && (
        <p
          role="alert"
          className="rounded-control border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger"
        >
          {formError}
        </p>
      )}
      {WEEKDAYS.map((weekday) => {
        const dayFields = fields
          .map((field, index) => ({ field, index }))
          .filter(({ index }) => blocks[index]?.weekday === weekday);
        const dayLabel = WEEKDAY_LABELS[weekday];
        return (
          <fieldset key={weekday} className="flex flex-col gap-3 border-b border-divider pb-4">
            <legend className="font-semibold text-ink">{dayLabel}</legend>
            {dayFields.length === 0 && <p className="text-sm text-muted">Sin atención</p>}
            {dayFields.map(({ field, index }, position) => {
              const blockErrors = errors.blocks?.[index];
              return (
                <div key={field.id} className="flex flex-wrap items-start gap-3">
                  <div className="min-w-32 flex-1">
                    <Select
                      label={`Inicio, bloque ${position + 1}`}
                      error={blockErrors?.startTime?.message}
                      {...register(`blocks.${index}.startTime`)}
                    >
                      {TIME_OPTIONS.map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="min-w-32 flex-1">
                    <Select
                      label={`Fin, bloque ${position + 1}`}
                      error={blockErrors?.endTime?.message}
                      {...register(`blocks.${index}.endTime`)}
                    >
                      {TIME_OPTIONS.map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <Button
                    variant="secondary"
                    className="mt-6.5"
                    onClick={() => remove(index)}
                    aria-label={`Quitar el bloque ${position + 1} del ${dayLabel.toLowerCase()}`}
                  >
                    <Icon name="close" className="size-5" />
                  </Button>
                </div>
              );
            })}
            <Button
              variant="secondary"
              className="self-start"
              onClick={() =>
                append(
                  nextBlock(
                    weekday,
                    sortBlocks(blocks.filter((block) => block.weekday === weekday)),
                  ),
                )
              }
            >
              Agregar bloque
            </Button>
          </fieldset>
        );
      })}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={isSubmitting}>
          Guardar horario
        </Button>
      </div>
    </form>
  );
}

type LoadState =
  { status: "loading" } | { status: "error" } | { status: "ready"; blocks: ScheduleBlock[] };

type ScheduleEditorProps = {
  kind: StaffKind;
  profile: StaffProfile | null;
  onClose: () => void;
};

export function ScheduleEditor({ kind, profile, onClose }: ScheduleEditorProps) {
  const { show } = useToast();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!profile) return;
    let active = true;
    setState({ status: "loading" });
    getSchedule(kind, profile.id)
      .then((blocks) => {
        if (active) setState({ status: "ready", blocks });
      })
      .catch(() => {
        if (active) setState({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, [kind, profile, reloadKey]);

  return (
    <Modal
      open={profile !== null}
      title={profile ? `Horario de ${ownerFullName(profile)}` : "Horario"}
      onClose={onClose}
    >
      {profile && state.status === "loading" && <LoadingState rows={2} />}
      {profile && state.status === "error" && (
        <ErrorState onRetry={() => setReloadKey((key) => key + 1)} />
      )}
      {profile && state.status === "ready" && (
        <ScheduleForm
          key={profile.id}
          kind={kind}
          profile={profile}
          initialBlocks={state.blocks}
          onCancel={onClose}
          onSaved={() => {
            show("Horario guardado", "success");
            onClose();
          }}
        />
      )}
    </Modal>
  );
}
