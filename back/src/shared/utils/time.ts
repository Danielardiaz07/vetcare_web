// Los horarios son hora local de la clínica, sin zona (columna TIME): se manejan como "HH:mm".
export const TIME_OF_DAY_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const MINUTES_PER_HOUR = 60;
const TIME_OF_DAY_LENGTH = 5;
const TIME_OF_DAY_START = 11;

export function minutesOfDay(value: string): number {
  const [hours = 0, minutes = 0] = value.split(":").map(Number);
  return hours * MINUTES_PER_HOUR + minutes;
}

export const parseTimeOfDay = (value: string): Date => new Date(`1970-01-01T${value}:00.000Z`);

export const formatTimeOfDay = (value: Date): string =>
  value.toISOString().slice(TIME_OF_DAY_START, TIME_OF_DAY_START + TIME_OF_DAY_LENGTH);
