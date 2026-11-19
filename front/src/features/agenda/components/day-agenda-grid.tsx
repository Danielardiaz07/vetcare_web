"use client";

import { useMemo } from "react";
import { AgendaTimeGrid } from "@/features/agenda/components/agenda-time-grid";
import { dayTimeline, weekTimeline, type AgendaStaff } from "@/features/agenda/timeline";
import type { Appointment } from "@/types/domain";

type Props = {
  date: string;
  appointments: Appointment[];
  staff: AgendaStaff;
  professionalId?: string;
  weekly?: boolean;
  onOpen: (appointment: Appointment) => void;
};

export function DayAgendaGrid({
  date,
  appointments,
  staff,
  professionalId,
  weekly = false,
  ...actions
}: Props) {
  const timeline = useMemo(
    () =>
      weekly
        ? weekTimeline(date, appointments, staff, professionalId ?? "")
        : dayTimeline(date, appointments, staff, professionalId),
    [date, appointments, staff, professionalId, weekly],
  );
  return (
    <AgendaTimeGrid
      date={date}
      timeline={timeline}
      professionalId={professionalId}
      weekly={weekly}
      {...actions}
    />
  );
}
