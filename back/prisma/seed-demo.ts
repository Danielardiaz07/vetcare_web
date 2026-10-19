import {
  AppointmentStatus,
  AppointmentType,
  PrismaClient,
  Role,
  Sex,
  Species,
  UserStatus,
} from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const DEFAULT_BCRYPT_COST = 12;
const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;
const SLOT_MS = 30 * MINUTE_MS;
const PHONE_PREFIX = "57";
const DEMO_DOMAIN = "vetcare.demo";
const WORKDAYS = [1, 2, 3, 4, 5, 6];

const time = (value: string) => new Date(`1970-01-01T${value}:00.000Z`);
const roundToSlot = (date: Date) => new Date(Math.floor(date.getTime() / SLOT_MS) * SLOT_MS);

// Datos de demostración para la presentación: no reemplazan al administrador (npm run db:seed).
async function main() {
  const password = process.env.SEED_DEMO_PASSWORD;
  if (!password) throw new Error("Define SEED_DEMO_PASSWORD en back/.env");

  if (await prisma.user.findUnique({ where: { email: `recepcion@${DEMO_DOMAIN}` } })) {
    console.log("Los datos de demostración ya existen; no se modifican.");
    return;
  }

  const passwordHash = await bcrypt.hash(
    password,
    Number(process.env.BCRYPT_COST ?? DEFAULT_BCRYPT_COST),
  );
  const account = (email: string, role: Role, links: object = {}) =>
    prisma.user.create({
      data: {
        email: `${email}@${DEMO_DOMAIN}`,
        passwordHash,
        role,
        status: UserStatus.ACTIVE,
        ...links,
      },
    });

  await account("recepcion", Role.RECEPTIONIST);

  const veterinarians = [];
  for (const [index, person] of [
    { firstNames: "Laura", lastNames: "Gomez Ruiz", specialty: "Medicina general" },
    { firstNames: "Andres", lastNames: "Perez Mora", specialty: "Medicina interna" },
  ].entries()) {
    const veterinarian = await prisma.veterinarian.create({
      data: {
        documentNumber: `1000000${index + 1}`,
        phone: `${PHONE_PREFIX}300000000${index + 1}`,
        ...person,
        schedules: {
          create: WORKDAYS.flatMap((weekday) => [
            { weekday, startTime: time("08:00"), endTime: time("12:00") },
            { weekday, startTime: time("14:00"), endTime: time("18:00") },
          ]),
        },
      },
    });
    await account(`vet${index + 1}`, Role.VETERINARIAN, { veterinarianId: veterinarian.id });
    veterinarians.push(veterinarian);
  }

  const groomer = await prisma.groomer.create({
    data: {
      documentNumber: "10000011",
      firstNames: "Camila",
      lastNames: "Torres Vega",
      phone: `${PHONE_PREFIX}3000000011`,
      schedules: {
        create: WORKDAYS.map((weekday) => ({
          weekday,
          startTime: time("08:00"),
          endTime: time("16:00"),
        })),
      },
    },
  });
  await account("estilista", Role.GROOMER, { groomerId: groomer.id });

  const owners = [];
  for (const [index, person] of [
    { firstNames: "Maria Fernanda", lastNames: "Rojas Diaz", address: "Calle 10 # 20-30, Bogota" },
    { firstNames: "Carlos", lastNames: "Ramirez Silva", address: "Carrera 5 # 12-45, Bogota" },
  ].entries()) {
    const email = `propietario${index + 1}`;
    const owner = await prisma.owner.create({
      data: {
        documentNumber: `2000000${index + 1}`,
        phone: `${PHONE_PREFIX}310000000${index + 1}`,
        email: `${email}@${DEMO_DOMAIN}`,
        dataConsentAt: new Date(),
        ...person,
      },
    });
    await account(email, Role.OWNER, { ownerId: owner.id });
    owners.push(owner);
  }

  const [owner1, owner2] = owners as [(typeof owners)[0], (typeof owners)[0]];
  const pet = (
    ownerId: string,
    name: string,
    species: Species,
    breed: string,
    sex: Sex,
    age: number,
    weightKg: number,
  ) =>
    prisma.patient.create({
      data: {
        ownerId,
        name,
        species,
        breed,
        sex,
        birthDate: new Date(Date.now() - age * 365 * DAY_MS),
        weightKg,
      },
    });
  const luna = await pet(owner1.id, "Luna", Species.DOG, "Labrador", Sex.FEMALE, 3, 24.5);
  const milo = await pet(owner1.id, "Milo", Species.CAT, "Criollo", Sex.MALE, 2, 4.2);
  const rocky = await pet(owner2.id, "Rocky", Species.DOG, "Criollo", Sex.MALE, 5, 18);

  const [vet1, vet2] = veterinarians as [(typeof veterinarians)[0], (typeof veterinarians)[0]];
  const now = new Date();
  const appointment = (
    patientId: string,
    type: AppointmentType,
    veterinarianId: string,
    startsAt: Date,
    status: AppointmentStatus,
    reason?: string,
  ) =>
    prisma.appointment.create({
      data: {
        patientId,
        type,
        veterinarianId,
        startsAt,
        endsAt: new Date(startsAt.getTime() + SLOT_MS),
        status,
        reason,
      },
    });

  // Listas para atender hoy: una consulta y una vacunación ya con llegada registrada.
  const nowSlot = roundToSlot(now);
  await appointment(
    luna.id,
    AppointmentType.GENERAL_CONSULTATION,
    vet1.id,
    nowSlot,
    AppointmentStatus.CONFIRMED,
    "Control general",
  );
  await appointment(
    rocky.id,
    AppointmentType.VACCINATION,
    vet2.id,
    new Date(nowSlot.getTime() + SLOT_MS),
    AppointmentStatus.CONFIRMED,
    "Refuerzo de vacuna",
  );
  // Futura: se ve en "Mis citas" y en la agenda de recepción.
  await appointment(
    milo.id,
    AppointmentType.CHECKUP,
    vet1.id,
    roundToSlot(new Date(now.getTime() + 2 * DAY_MS)),
    AppointmentStatus.SCHEDULED,
  );

  // Historia previa: una consulta y una vacunación aún sin facturar, y un carné con estados distintos.
  const pastAppointment = await appointment(
    luna.id,
    AppointmentType.GENERAL_CONSULTATION,
    vet1.id,
    roundToSlot(new Date(now.getTime() - 7 * DAY_MS)),
    AppointmentStatus.ATTENDED,
  );
  await prisma.consultation.create({
    data: {
      appointmentId: pastAppointment.id,
      patientId: luna.id,
      veterinarianId: vet1.id,
      symptoms: "Decaimiento y poco apetito",
      weightKg: 24.5,
      temperatureC: 38.7,
      diagnosis: "Gastroenteritis leve",
      treatment: "Dieta blanda e hidratacion",
      prescription: "Suero oral cada 8 horas",
      internalNotes: "Revisar en una semana si persiste",
      cost: 60000,
      createdAt: new Date(now.getTime() - 7 * DAY_MS),
    },
  });

  const vaccines = await prisma.vaccine.findMany({ orderBy: { name: "asc" } });
  const rabies = vaccines.find((vaccine) => vaccine.name === "Antirrabica");
  const parvo = vaccines.find((vaccine) => vaccine.name === "Parvovirus");
  if (rabies && parvo) {
    const vaccination = (
      patientId: string,
      vaccine: typeof rabies,
      lot: string,
      appliedDaysAgo: number,
      nextInDays: number,
    ) =>
      prisma.vaccination.create({
        data: {
          patientId,
          veterinarianId: vet1.id,
          vaccineId: vaccine.id,
          lot,
          appliedAt: new Date(
            new Date(now.getTime() - appliedDaysAgo * DAY_MS).toISOString().slice(0, 10),
          ),
          nextDoseAt: new Date(
            new Date(now.getTime() + nextInDays * DAY_MS).toISOString().slice(0, 10),
          ),
          price: vaccine.price,
        },
      });
    await vaccination(luna.id, rabies, "RB-2026-01", 355, 5); // próxima a vencer
    await vaccination(luna.id, parvo, "PV-2026-07", 30, 335); // al día
    await vaccination(rocky.id, rabies, "RB-2025-11", 400, -35); // vencida
  }

  console.log(
    `Datos de demostración creados. Cuentas @${DEMO_DOMAIN}: recepcion, vet1, vet2, estilista, propietario1, propietario2.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
