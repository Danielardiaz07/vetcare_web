# Changelog de context/

Una línea por cambio, la más reciente arriba. Formato: `AAAA-MM-DD · archivos · qué cambió y por qué (IDs afectados)`.

- 2026-10-18 · 08, 12 · Script de datos de demostración `npm run db:seed:demo` y variable `SEED_DEMO_PASSWORD` (D-29).
- 2026-10-18 · 04, 05, 08, 12 · Ajustes de la API para el frontend: pacientes con propietario y filtro `ownerDocument`, `address` en `GET /users/me` y cierre de la cita de vacunación desde `POST /vaccinations` (RN-53, D-28).
- 2026-10-18 · 08 · Se agrega la ruta `/panel/owners/[id]`, la ficha del propietario con sus mascotas, desde donde recepción lo edita o lo desactiva (§7.2, RN-14).
- 2026-10-18 · 08 · Se agrega la ruta `/panel/attention` para que el menú del veterinario tenga un destino fijo en “Atención”; desde ahí se elige la cita (§7.2).
- 2026-10-18 · 08 · Se agrega la ruta `/portal/history` para que el menú del portal tenga un destino fijo en “Historial clínico”; desde ahí se elige la mascota (§7.2).
- 2026-10-19 · 04, 07, 08, 12 · MVP clínico y de facturación (HU-12 a HU-16; RF-09, 10, 18, 19, 23): tablas `Consultation`, `Vaccine`, `Vaccination`, `Invoice` e `InvoiceItem` con migraciones; endpoints de consulta, vacunación, historial, carné y facturas con IVA 19 %; RN-47 aplazada; P-04 y P-07 resueltos (D-27).
- 2026-10-19 · 06, 07, 08, 12 · Motor de citas (HU-08, 09, 10, 11; RF-11, 12, 13, 16): tabla `Appointment` con su migración y exclusiones GiST contra cruces; endpoints de disponibilidad, agendar, reprogramar, cancelar, llegada, inasistencia, reasignar, agenda y “mis citas”; supuestos en D-26 (RN-20 a RN-34).
- 2026-10-17 · 08, 12, 13 · Diseño del frontend: identidad visual, rutas, agendar en 5 pasos, datos de prueba y rewrites de la API (D-23 a D-25).
- 2026-10-17 · 04, 06, 07, 08, 12 · Personal y horarios (HU-06, RF-07): tablas `Veterinarian`, `Groomer`, `Schedule` y `AppointmentTypeSetting` con su migración; endpoints `/veterinarians`, `/groomers`, sus `/schedules` y `/appointment-types`; franjas de 30 min y duraciones iniciales 30/30/30/90 (D-21, D-22, RN-19); P-06 resuelto.
- 2026-10-17 · 04, 08, 12 · Gestión de usuarios del personal (HU-03, RF-04): `POST/GET /users`, `GET/PATCH /users/{id}` solo ADMIN, con suspensión que cierra sesiones y protección contra auto-bloqueo del administrador; seed del primer administrador con `npm run db:seed` y variables `SEED_ADMIN_*` (D-20, RN-12).
- 2026-10-17 · 04, 07 · Módulos `owners` y `patients` del backend (HU-04, HU-05, HU-07): modelo `Patient` y migración `add_patient`; se agregan el nombre y la ruta de la foto del paciente (RN-15, D-19); listados con paginación `?page=&limit=` y `meta`; el cambio de correo hecho en recepción actualiza también el correo de la cuenta (D-18).
- 2026-10-16 · 02, 04, 07, 09, 12 · Recuperación de acceso por cédula con enlace al correo registrado y cambio de correo solo en la clínica (D-18; RN-04, RN-11, RF-01, RF-03, 09 §5); tipos del paciente: especie, sexo, raza y peso (D-19; RN-15, RF-06, 07); P-05 acotado al resto de entidades.
- 2026-10-17 · 08, 10 · Se aplica la migración inicial `init` en Supabase (tablas de autenticación) y se retira la nota de migración pendiente del Sprint 0.
- 2026-10-16 · 04, 08, 09, 12 · Módulo `auth` del backend (registro, OTP, login con bloqueo, refresh rotativo, logout) y `GET /users/me`; R-01 resuelto: vinculación por cédula solo con correo coincidente (D-17, RN-04); se documentan la cookie `refresh_token`, la reutilización de refresh tokens y `BCRYPT_COST`.
- 2026-10-16 · 10, 02, 08, 12 · Cierre del Sprint 0 y replanificación: 3 sprints (19 oct – 23 nov) con las historias Must HU-01 a HU-16 (84 pts); HU-17 a HU-24 pasan a Reserva; se actualizan la trazabilidad de 02 §3, la nota de 08 §3, el riesgo R-03 y la decisión D-16; P-09 y P-10 retirados.
- 2026-10-16 · 08, 12 · Se crea la base del frontend (Next 16, Tailwind v4, cliente HTTP con refresh); rutas protegidas con `proxy.ts` en lugar de `middleware.ts` y se añade `@hookform/resolvers` (D-15).
- 2026-10-16 · 09, 12 · Se implementa el modelo base de autenticación en `schema.prisma` (`User`, `Owner`, `OtpCode`, `RefreshToken`, `PasswordResetToken`; bloqueo RN-08, recuperación RN-11, vínculo RN-04); se fija Prisma 6.x (D-14).
- 2026-10-16 · 08 · Se crea el esqueleto básico del monorepo (`back/`, `front/`, `packages/shared`); se actualiza la nota del estado del repositorio.
- 2026-10-16 · README, 08, 12 · Se eliminan `ARCHITECTURE.md` y `specs.pdf` del repositorio; `context/` queda como única fuente de verdad (D-13, P-11 retirado).
- 2026-10-16 · 08 · Se restituyen la tabla GRASP completa y la nota sobre el scaffold de Vite de `ARCHITECTURE.md`.
- 2026-10-16 · todos · Creación de `context/` consolidando `ARCHITECTURE.md` y `specs.pdf`. Stack únicamente el de `ARCHITECTURE.md`; estructura `front/` + `back/`; Tailwind CSS v4; alineaciones D-01 a D-12 registradas en [12](12-decisiones-y-pendientes.md).
