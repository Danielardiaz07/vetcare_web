import type { AppointmentType } from "@/types/domain";

// Recomendaciones generales para el propietario; no reemplazan lo que indique el veterinario.
export const APPOINTMENT_PREP: Record<AppointmentType, string[]> = {
  GENERAL_CONSULTATION: [
    "Anota los síntomas y desde cuándo los notaste.",
    "Trae los medicamentos que esté tomando.",
    "Los gatos, en guacal; los perros, con correa.",
  ],
  VACCINATION: [
    "Trae su carné de vacunas.",
    "Que haya comido normal y esté sano ese día: sin fiebre, vómito ni diarrea.",
    "Es normal que esté algo decaído hasta 24 horas después.",
  ],
  CHECKUP: [
    "Trae las indicaciones o la fórmula de la consulta anterior.",
    "Cuéntanos cómo ha seguido desde la última visita.",
    "Trae los medicamentos que esté tomando.",
  ],
  GROOMING: [
    "Llega 10 minutos antes para que se adapte al lugar.",
    "Si es nervioso o no tolera el secador, avísanos al llegar.",
    "Trae su correa o guacal y, si tiene, su champú medicado.",
  ],
};
