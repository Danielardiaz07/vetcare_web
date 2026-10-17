# 09 — Seguridad y autenticación

Implementa RN-01 a RN-13, RNF-01 a RNF-04. Stack: JWT + bcrypt + OTP por correo (Brevo), todo según [08](08-arquitectura-y-stack.md).

## 1. Contraseñas

- Solo se almacenan como **hash** con `bcrypt` (cost ≥ 12, configurable por entorno). El *salt* lo genera y embebe la librería.
- bcrypt solo procesa los primeros 72 bytes de la entrada: el DTO limita la contraseña a **máx. 72**.
- Política (RN-02): **mínimo 8 caracteres, al menos una mayúscula y un número**, validada en el DTO (y en el formulario).
- **Un UUID no es un algoritmo de hash ni de cifrado**: no protege contraseñas. Su rol: identificador (`id`) de entidades y token opaco (p. ej. `jti` del refresh token).

## 2. Registro con OTP

```
1. POST /api/v1/auth/register    → crea usuario (PENDING), hashea contraseña, genera OTP,
                                   guarda su hash + expiración, envía correo.
2. POST /api/v1/auth/otp/verify  → valida OTP → ACTIVE (+ correo de bienvenida).
3. POST /api/v1/auth/otp/resend  → reenvía OTP (rate limit y cooldown).
4. POST /api/v1/auth/login       → solo usuarios ACTIVE.
```

Reglas del OTP:

- 6 dígitos con `crypto.randomInt` (CSPRNG, no `Math.random`).
- Se guarda **hasheado**, nunca en claro.
- Expira en 5–10 min (`OTP_TTL_MINUTES`); **un solo uso**.
- Máximo 5 intentos de verificación; luego se invalida.

El registro del propietario recoge además los campos de negocio (RN-01) y la aceptación del tratamiento de datos (RN-60). La vinculación con un propietario existente por cédula (RN-04) se hace **al registrar** y solo si el correo coincide con el guardado por la clínica (D-17, resuelve R-01); el OTP posterior prueba que el solicitante controla ese correo. Un registro `PENDING` ya existente para el mismo correo se rechaza como duplicado: se continúa con `otp/resend`. `otp/resend` y `otp/verify` responden de forma genérica (sin revelar si el correo existe) y el reenvío tiene un *cooldown* de 60 s. Un fallo de Brevo no revierte el registro (RN-38): el usuario puede pedir otro código.

## 3. Sesión con JWT

- **Access token**: vida corta (~15 min), en `Authorization: Bearer`. Incluye `sub` (user id) y `role`.
- **Refresh token**: vida larga (~7 días), cookie `HttpOnly; Secure; SameSite`, con `jti` (UUID) persistido para **rotarlo y revocarlo**.
- Secretos en variables de entorno; algoritmo explícito (`HS256` o `RS256`).
- Middlewares `authenticate` (verifica token) y `authorize(roles)` (RBAC).
- Cookie `refresh_token` con `path=/` (el `proxy.ts` del front debe poder verla), `SameSite=Lax` y `Secure` en producción.
- `POST /auth/refresh` **rota** el token: revoca el anterior y emite uno nuevo; presentar un token ya revocado (reutilización) revoca todas las sesiones del usuario.
- Cerrar sesión revoca el refresh token y limpia la cookie.
- *(alineación)* `specs.pdf` pedía un JWT de 8 h; se sustituye por access corto + refresh (D-01).

## 4. Bloqueo por intentos fallidos (RN-08)

Tras **5 intentos fallidos consecutivos** de inicio de sesión de una cuenta, esta se bloquea **15 minutos**. Requiere persistir contador (`SMALLINT`) y marca de desbloqueo (`TIMESTAMPTZ`) en el usuario; se reinicia con un login exitoso. Convive con el rate limit por IP + email del endpoint (ver 08 §4.3).

## 5. Recuperación de contraseña (RN-11)

Enlace de restablecimiento al correo registrado, **válido 30 minutos**. Token opaco de un solo uso, guardado hasheado con su expiración; la respuesta no revela si el correo existe.

La cuenta se puede identificar por **correo o por cédula** (D-18). Con la cédula, el enlace va siempre al correo ya registrado y nunca a uno indicado por quien lo pide; así quien olvidó su correo y su clave recupera el acceso, y quien solo conoce la cédula de otra persona no obtiene nada. La respuesta es genérica (sin revelar si la cédula existe ni el correo completo) y el endpoint tiene rate limit. El correo de la cuenta solo se cambia en la clínica, tras verificar la identidad en persona.

## 6. Roles y permisos (RBAC)

Roles: `OWNER` (propietario), `RECEPTIONIST`, `VETERINARIAN`, `GROOMER`, `ADMIN`. Cada petición verifica JWT y rol (RN-13); además, para recursos del propietario se verifica la **propiedad** del dato (RN-16, RN-40 → 403).

| Capacidad | Propietario | Recepcionista | Veterinario | Estilista | Administrador |
|-----------|:-----------:|:-------------:|:-----------:|:---------:|:-------------:|
| Registrarse / iniciar sesión / recuperar contraseña | ✔ | ✔ | ✔ | ✔ | ✔ |
| Gestionar usuarios del personal (RF-04) | | | | | ✔ |
| Gestionar propietarios (RF-05) | | ✔ | | | ✔ |
| Gestionar pacientes (RF-06) | propias (alta, RF-15) | ✔ | ✔ | | |
| Gestionar personal y horarios (RF-07) | | | | | ✔ |
| Mis mascotas, historial, carné (RF-08/09/10) | ✔ (solo las suyas) | | | | |
| Agendar / reprogramar / cancelar / ver mis citas (RF-11/12/13) | ✔ (solo las suyas) | | | | |
| Gestionar agenda (RF-16) | | ✔ | consulta de la suya | consulta de la suya | |
| Consultar mis facturas (RF-14) | ✔ (solo las suyas) | | | | |
| Perfil (RF-15) | ✔ | | | | |
| Registrar consulta / vacunación / cirugía / internación / examen (RF-18/19/20) | | | ✔ (citas asignadas) | | |
| Registrar servicio estético (RF-21) | | | | ✔ | |
| Gestionar inventario (RF-22) | | | | | ✔ |
| Generar factura (RF-23) | | ✔ | | | |
| Anular factura (RN-74) | | | | | ✔ |
| Reportes (RF-24) | | | | | ✔ |

> La matriz deriva de los RF y actores de `specs.pdf`. Los matices no especificados (p. ej. si el veterinario puede ver propietarios, o recepción ver el historial clínico completo) se afinan al implementar el módulo y se registran aquí.

## 7. Endurecimiento general

- `helmet`, CORS con lista blanca de orígenes, límite de tamaño de body.
- Prisma parametriza consultas (previene SQL injection).
- Mensajes de error de login genéricos (RN-09).
- Nunca registrar contraseñas, OTP ni tokens en logs (`pino` con *redact*).
- `SUPABASE_SERVICE_ROLE_KEY` solo en el backend.
- Subidas: validación de tipo por *magic bytes*, tamaño máximo, nombres generados por la API.
- Datos personales (Ley 1581/2012): aceptación explícita y política visible (RN-60).

## 8. Modelo de referencia de autenticación (Prisma)

Implementado en `back/prisma/schema.prisma` (fuente de los tipos y tamaños). Extiende el punto de partida con los cinco roles del negocio, el bloqueo por intentos (§4), el token de recuperación (§5) y el vínculo 1–1 `User.ownerId` → `Owner` (06 §4, RN-04). `Owner` lleva `documentType` (enum `DocumentType`), `documentNumber` `VARCHAR(15)` único, `firstNames`/`lastNames` `VARCHAR(60)`, `email` `VARCHAR(254)` opcional, `phone` `VARCHAR(15)`, `address` `VARCHAR(100)` opcional, `dataConsentAt` (RN-60) y `active` (RN-14). Las demás entidades entran con el sprint de su módulo.

```prisma
enum UserStatus { PENDING ACTIVE SUSPENDED }
enum Role       { OWNER RECEPTIONIST VETERINARIAN GROOMER ADMIN }

model User {
  id           String     @id @default(uuid()) @db.Uuid
  email        String     @unique @db.VarChar(254)   // RFC 5321 (256 - "<>")
  passwordHash String     @db.VarChar(60)            // salida fija de bcrypt
  status       UserStatus @default(PENDING)
  role         Role       @default(OWNER)
  failedLoginAttempts Int @default(0) @db.SmallInt   // RN-08
  lockedUntil  DateTime?  @db.Timestamptz(3)
  ownerId      String?    @unique @db.Uuid          // RN-04
  createdAt    DateTime   @default(now()) @db.Timestamptz(3)
  updatedAt    DateTime   @updatedAt @db.Timestamptz(3)

  otps          OtpCode[]
  refreshTokens RefreshToken[]
  passwordResetTokens PasswordResetToken[]   // RN-11: tokenHash VARCHAR(64) SHA-256, expira a los 30 min
}

model OtpCode {
  id        String    @id @default(uuid()) @db.Uuid
  userId    String    @db.Uuid
  codeHash  String    @db.VarChar(60)                // OTP hasheado con bcrypt
  attempts  Int       @default(0) @db.SmallInt       // máx. 5
  expiresAt DateTime  @db.Timestamptz(3)
  usedAt    DateTime? @db.Timestamptz(3)
  createdAt DateTime  @default(now()) @db.Timestamptz(3)
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model RefreshToken {
  id        String    @id @default(uuid()) @db.Uuid   // jti
  userId    String    @db.Uuid
  expiresAt DateTime  @db.Timestamptz(3)
  revokedAt DateTime? @db.Timestamptz(3)
  createdAt DateTime  @default(now()) @db.Timestamptz(3)
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```
