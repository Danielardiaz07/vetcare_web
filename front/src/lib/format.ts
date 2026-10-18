const DAYS_PER_WEEK = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MONTHS_PER_YEAR = 12;

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

// es-CO escribe "17 de oct de 2026"; se arma con las partes para mostrar "17 oct 2026".
export function formatDate(iso: string): string {
  const parts = dateFormatter.formatToParts(new Date(iso));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value.replace(".", "") ?? "";
  return `${part("day")} ${part("month")} ${part("year")}`;
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

// RN-15: la edad nunca se guarda; se calcula con la fecha de nacimiento (AAAA-MM-DD).
export function calculateAge(birthDate: string, today: Date = new Date()): string {
  const [year = 0, month = 1, day = 1] = birthDate.split("-").map(Number);
  let months = (today.getFullYear() - year) * MONTHS_PER_YEAR + (today.getMonth() + 1 - month);
  if (today.getDate() < day) months -= 1;

  if (months >= MONTHS_PER_YEAR) {
    return plural(Math.floor(months / MONTHS_PER_YEAR), "año", "años");
  }
  if (months >= 1) return plural(months, "mes", "meses");

  const born = new Date(year, month - 1, day);
  const weeks = Math.max(
    0,
    Math.floor((today.getTime() - born.getTime()) / MS_PER_DAY / DAYS_PER_WEEK),
  );
  return plural(weeks, "semana", "semanas");
}
