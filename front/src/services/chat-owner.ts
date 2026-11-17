import { ALERT_LABELS, alertHref } from "@/features/alerts/labels";
import { VACCINE_STATUS } from "@/features/clinical/labels";
import { SPECIES_LABELS } from "@/features/patients/labels";
import { APPOINTMENT_TYPE_LABELS } from "@/features/staff/labels";
import { addDays, clinicDateOf, formatClinicTime } from "@/lib/clinic-time";
import { ROUTES } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { getMyAlerts } from "@/services/alerts";
import { getAllMyAppointments } from "@/services/appointments";
import type { ChatConsultation, ChatReply, OwnerChatTopic } from "@/services/chat";
import { getMyVaccinationCard, getWeightTrend } from "@/services/clinical";
import { getMyPatients } from "@/services/patients";
import type { Patient } from "@/types/domain";

const SUMMARY_LIMIT = 3;
const weightFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });
const percentFormatter = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});

const normalizeName = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const mentionedPets = (pets: Patient[], question: string) =>
  pets.filter((pet) => ` ${question} `.includes(` ${normalizeName(pet.name)} `));

function patientChoices(pets: Patient[], topic: OwnerChatTopic): ChatReply {
  return {
    text: "¿De cuál de tus mascotas quieres consultar la información?",
    choices: pets.map((pet) => ({
      label: `${pet.name} · ${SPECIES_LABELS[pet.species]} · ${pet.breed}${pets.filter((other) => normalizeName(other.name) === normalizeName(pet.name)).length > 1 ? ` · ${formatDate(pet.birthDate)}` : ""}`,
      topic,
      patientId: pet.id,
    })),
  };
}

async function appointmentsReply(
  question: string,
  patientId?: string,
  allPatients = false,
): Promise<ChatReply> {
  if (/\b(cancel|reprogram)/.test(question)) {
    return {
      text: "Puedes reprogramar o cancelar desde Mis citas cuando la cita permita cambios. Abre la cita para revisar las opciones disponibles.",
      links: [{ label: "Ver mis citas", href: ROUTES.portalAppointments }],
      consultation: { topic: "appointments", answered: false },
    };
  }
  const pets = await getMyPatients();
  const consultation: ChatConsultation = {
    topic: "appointments",
    answered: false,
    patients: pets.map(({ id, name }) => ({ id, name })),
  };
  if (!pets.length) {
    return {
      text: "Aún no tienes mascotas activas registradas. Agrega una para consultar sus citas.",
      links: [{ label: "Agregar mascota", href: ROUTES.portalNewPet }],
      consultation: { ...consultation, answered: true, allPatients: true },
    };
  }
  const includeAll =
    allPatients ||
    /\b(todas (?:mis|las) mascotas|ambas mascotas|las dos mascotas)\b/.test(question);
  const named = includeAll
    ? []
    : patientId
      ? pets.filter((pet) => pet.id === patientId)
      : mentionedPets(pets, question);
  if (patientId && !includeAll && !named.length) {
    return {
      text: "Esta mascota ya no está disponible en tu cuenta. Puedes revisar tus mascotas desde el portal.",
      links: [{ label: "Ver mis mascotas", href: ROUTES.portal }],
      consultation,
    };
  }
  if (!includeAll && named.length !== 1) {
    const selection = patientChoices(named.length ? named : pets, "appointments");
    return {
      ...selection,
      choices: [
        ...selection.choices!.map((choice) => ({ ...choice, question })),
        ...(pets.length > 1
          ? [
              {
                label: "Todas mis mascotas",
                topic: "appointments" as const,
                allPatients: true,
                question,
              },
            ]
          : []),
      ],
      consultation,
    };
  }
  const all = await getAllMyAppointments("upcoming");
  const today = clinicDateOf(new Date());
  const day = /\bmanana\b/.test(question)
    ? addDays(today, 1)
    : /\bhoy\b/.test(question)
      ? today
      : null;
  const appointments = all
    .filter(
      (appointment) =>
        (appointment.status === "SCHEDULED" || appointment.status === "CONFIRMED") &&
        new Date(appointment.startsAt).getTime() >= Date.now() &&
        (!named.length || named.some((pet) => pet.id === appointment.patient.id)) &&
        (!day || clinicDateOf(new Date(appointment.startsAt)) === day),
    )
    .sort((first, second) => first.startsAt.localeCompare(second.startsAt));
  const subject = named.length ? ` de ${named.map((pet) => pet.name).join(" y ")}` : "";
  const period = day ? ` para el ${formatDate(day)}` : "";
  return {
    text: appointments.length
      ? `Estas son las próximas citas${subject}${period}${appointments.length > SUMMARY_LIMIT ? ` (muestro ${SUMMARY_LIMIT} de ${appointments.length})` : ""}. Horas de Colombia.`
      : `No tienes próximas citas${subject}${period}.`,
    items: appointments.slice(0, SUMMARY_LIMIT).map((appointment) => ({
      title: `${appointment.patient.name} · ${APPOINTMENT_TYPE_LABELS[appointment.type]}`,
      detail: `${formatDate(clinicDateOf(new Date(appointment.startsAt)))} · ${formatClinicTime(appointment.startsAt)} · ${appointment.professional.firstNames} ${appointment.professional.lastNames}`,
      href: `${ROUTES.portalAppointments}?appointmentId=${encodeURIComponent(appointment.id)}`,
    })),
    links: [{ label: "Ver mis citas", href: ROUTES.portalAppointments }],
    bookingAction: appointments.length === 0,
    consultation: {
      ...consultation,
      answered: true,
      allPatients: includeAll,
      ...(named.length === 1 && { patient: { id: named[0]!.id, name: named[0]!.name } }),
    },
  };
}

async function alertsReply(): Promise<ChatReply> {
  const { data } = await getMyAlerts();
  return {
    text: data.length
      ? `Estos son tus avisos recientes${data.length > SUMMARY_LIMIT ? ` (muestro ${SUMMARY_LIMIT} de ${data.length})` : ""}. Consultarlos aquí no los marca como vistos; puedes gestionarlos desde la campana.`
      : "No tienes avisos recientes. Puedes consultar tus citas y el historial de tus mascotas desde el portal.",
    items: data.slice(0, SUMMARY_LIMIT).map((alert) => ({
      title: ALERT_LABELS[alert.kind].label,
      detail: alert.message,
      href: alertHref(alert),
    })),
  };
}

export async function ownerChatReply(
  topic: OwnerChatTopic,
  question: string,
  patientId?: string,
  allPatients = false,
): Promise<ChatReply> {
  if (topic === "appointments") return appointmentsReply(question, patientId, allPatients);
  if (topic === "alerts") return alertsReply();
  const pets = await getMyPatients();
  const consultation: ChatConsultation = {
    topic,
    answered: false,
    patients: pets.map(({ id, name }) => ({ id, name })),
  };
  if (!pets.length) {
    return {
      text: "Aún no tienes mascotas activas registradas. Agrega una para consultar sus vacunas y pesos registrados.",
      links: [{ label: "Agregar mascota", href: ROUTES.portalNewPet }],
      consultation: { ...consultation, answered: true },
    };
  }
  const matches = patientId
    ? pets.filter((pet) => pet.id === patientId)
    : mentionedPets(pets, question);
  if (matches.length !== 1) {
    return { ...patientChoices(matches.length ? matches : pets, topic), consultation };
  }
  const pet = matches[0]!;
  const answered = { ...consultation, answered: true, patient: { id: pet.id, name: pet.name } };
  const historyLink = {
    label: topic === "weight" ? "Ver evolución del peso" : "Ver carné e historial",
    href: topic === "weight" ? ROUTES.portalPetWeight(pet.id) : ROUTES.portalPetHistory(pet.id),
  };
  if (topic === "vaccines") {
    const card = await getMyVaccinationCard(pet.id);
    const order = { OVERDUE: 0, DUE_SOON: 1, UP_TO_DATE: 2 };
    const doses = [...card].sort((first, second) => order[first.status] - order[second.status]);
    return {
      text: doses.length
        ? `Estas son las vacunas registradas en el carné de ${pet.name}${doses.length > SUMMARY_LIMIT ? ` (muestro ${SUMMARY_LIMIT} de ${doses.length})` : ""}. El estado corresponde a las dosis registradas; el plan completo lo define su veterinario.`
        : `${pet.name} aún no tiene vacunas registradas en su carné.`,
      items: doses.slice(0, SUMMARY_LIMIT).map((dose) => ({
        title: `${dose.vaccine.name} · ${VACCINE_STATUS[dose.status].label}`,
        detail: `Aplicada el ${formatDate(dose.appliedAt)}. ${dose.nextDoseAt ? `Próxima dosis: ${formatDate(dose.nextDoseAt)}.` : "Sin fecha de próxima dosis registrada."}`,
      })),
      links: [historyLink],
      consultation: answered,
    };
  }
  const trend = await getWeightTrend(pet.id);
  const latest = [...trend.points]
    .sort((first, second) => first.date.localeCompare(second.date))
    .at(-1);
  if (!latest)
    return {
      text: `${pet.name} aún no tiene pesos de consultas registrados para mostrar su evolución.`,
      links: [historyLink],
      consultation: answered,
    };
  const change = trend.change;
  return {
    text: `El último peso registrado de ${pet.name} es ${weightFormatter.format(latest.weightKg)} kg, del ${formatDate(clinicDateOf(new Date(latest.date)))}. ${change ? `Variación frente a la consulta anterior: ${percentFormatter.format(change.percent)} %.${change.flagged ? " Conviene revisarlo en la próxima consulta." : ""}` : "Aún no hay suficientes mediciones para comparar."}`,
    links: [historyLink],
    consultation: answered,
  };
}
