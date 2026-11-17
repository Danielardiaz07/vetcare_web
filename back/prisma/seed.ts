import { PrismaClient, Role, UserStatus } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const DEFAULT_BCRYPT_COST = 12;

// Primer administrador: sin él nadie puede crear el resto del personal (RN-12).
async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("Define SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD en back/.env");
  }

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    console.log(`El administrador ${email} ya existe; no se modifica.`);
    return;
  }

  const cost = Number(process.env.BCRYPT_COST ?? DEFAULT_BCRYPT_COST);
  await prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(password, cost),
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });
  console.log(`Administrador ${email} creado.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
