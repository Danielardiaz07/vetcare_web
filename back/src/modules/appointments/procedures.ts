import { AppointmentType } from "@prisma/client";

// D-70: la cirugía y el examen de laboratorio los agenda, reprograma y cancela solo recepción, con duración propia.
export const PROCEDURE_TYPES: readonly AppointmentType[] = [
  AppointmentType.SURGERY,
  AppointmentType.LAB_EXAM,
];

export const isProcedure = (type: AppointmentType): boolean => PROCEDURE_TYPES.includes(type);

export const PROCEDURE_RECEPTION_ONLY_MESSAGE =
  "Las cirugias y los examenes los agenda, reprograma y cancela la clinica. Comunicate con la clinica";
