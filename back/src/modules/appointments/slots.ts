import { SLOT_MINUTES } from "@/config/constants";
import type {
  BusyRecord,
  ProfessionalRecord,
  ScheduleBlockRecord,
} from "@/modules/appointments/appointments.repository";
import { addMinutes, clinicInstant, clinicWeekdayOf } from "@/shared/utils/clinic-time";
import { formatTimeOfDay, minutesOfDay } from "@/shared/utils/time";

export interface SlotWindow {
  from: Date;
  to: Date;
}

export interface SlotOffer {
  startsAt: Date;
  endsAt: Date;
  professionals: ProfessionalRecord[];
}

const blockMinutes = (block: ScheduleBlockRecord) => ({
  start: minutesOfDay(formatTimeOfDay(block.startTime)),
  end: minutesOfDay(formatTimeOfDay(block.endTime)),
});

// RN-20: la franja cabe completa dentro de un bloque del horario del profesional.
export function scheduleCovers(
  schedules: ScheduleBlockRecord[],
  date: string,
  startMinute: number,
  endMinute: number,
): boolean {
  const weekday = clinicWeekdayOf(date);
  return schedules.some((block) => {
    if (block.weekday !== weekday) return false;
    const { start, end } = blockMinutes(block);
    return start <= startMinute && endMinute <= end;
  });
}

export const overlapsBusy = (
  busy: BusyRecord[],
  professionalId: string,
  startsAt: Date,
  endsAt: Date,
): boolean =>
  busy.some(
    (item) =>
      item.professionalId === professionalId && item.startsAt < endsAt && item.endsAt > startsAt,
  );

// Franjas libres de un día (RN-20 a RN-22), agrupadas por inicio con los profesionales disponibles (RN-26).
export function slotsOfDay(
  date: string,
  professionals: ProfessionalRecord[],
  busy: BusyRecord[],
  durationMinutes: number,
  window: SlotWindow,
): SlotOffer[] {
  const weekday = clinicWeekdayOf(date);
  const offers = new Map<number, SlotOffer>();

  for (const professional of professionals) {
    for (const block of professional.schedules) {
      if (block.weekday !== weekday) continue;
      const { start, end } = blockMinutes(block);

      for (let minute = start; minute + durationMinutes <= end; minute += SLOT_MINUTES) {
        const startsAt = clinicInstant(date, minute);
        const endsAt = addMinutes(startsAt, durationMinutes);
        if (startsAt < window.from || startsAt > window.to) continue;
        if (overlapsBusy(busy, professional.id, startsAt, endsAt)) continue;

        const offer = offers.get(startsAt.getTime());
        if (offer) offer.professionals.push(professional);
        else offers.set(startsAt.getTime(), { startsAt, endsAt, professionals: [professional] });
      }
    }
  }

  return [...offers.values()].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}
