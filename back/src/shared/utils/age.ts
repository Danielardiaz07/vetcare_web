export interface Age {
  years: number;
  months: number;
}

// RN-15: la edad no se guarda, se calcula desde la fecha de nacimiento (DATE, sin zona).
export function ageFrom(birthDate: Date, now: Date = new Date()): Age {
  let months =
    (now.getUTCFullYear() - birthDate.getUTCFullYear()) * 12 +
    (now.getUTCMonth() - birthDate.getUTCMonth());
  if (now.getUTCDate() < birthDate.getUTCDate()) months -= 1;
  const total = Math.max(months, 0);
  return { years: Math.floor(total / 12), months: total % 12 };
}
