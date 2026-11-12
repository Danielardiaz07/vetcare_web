# 08 — Arquitectura y stack

> **Este es el stack vigente del proyecto.** Se descartó el stack de la especificación académica original (React 18 + Vite, Java 21 + Spring Boot, Oracle XE, Maven, Spring Mail, Swagger de Spring, etc.).
> **Estructura**: el monorepo tiene dos carpetas en la raíz: **`back/`** (API) y **`front/`** (web); no se usan `apps/api` ni `apps/web`.

## 1. Visión general

```
┌──────────────────┐   HTTPS / JSON    ┌──────────────────────┐      ┌────────────────────┐
│  front/          │ ────────────────► │  back/               │ ───► │  Supabase          │
│  Next.js + React │   /api/v1/...     │  Node + Express + TS │      │  (PostgreSQL)      │
└──────────────────┘ ◄──────────────── └──────────────────────┘      └────────────────────┘
                          JWT                    │ Prisma ORM
                                                 └─► Servicio de correo (Brevo: OTP, notificaciones)
```

- **Frontend**: Next.js (App Router) + React + TypeScript.
- **Backend**: API REST con Node.js + Express + TypeScript.
- **Base de datos**: PostgreSQL en Supabase, accedido **solo desde la API** mediante Prisma.
- **Autenticación**: JWT (access + refresh) con registro verificado por OTP.

## 2. Stack tecnológico

| Capa | Tecnología | Propósito |
|------|-----------|-----------|
| Lenguaje | TypeScript (`strict: true`) | Tipado estático en front y back |
| Runtime | Node.js LTS | Ejecución del backend |
| API | Express | Framework HTTP |
| Frontend | Next.js (App Router) + React | UI, routing, SSR/CSR |
| Estilos | Tailwind CSS v4 *(decisión del equipo, 2026-10-16)* | UI responsiva (RNF-07) |
| Formularios | React Hook Form + Zod (+ `@hookform/resolvers`) | Formularios con los mismos esquemas de validación |
| ORM | Prisma | Acceso a datos, migraciones, tipos |
| Base de datos | Supabase (PostgreSQL) | Persistencia |
| Autenticación | JWT (`jsonwebtoken`) | Sesión stateless |
| Hash de contraseñas | `bcrypt` | Almacenamiento seguro de credenciales |
| Identificadores | UUID v4 / v7 | Claves primarias y tokens opacos |
| Validación / DTOs | Zod (+ `class-validator` opcional) | Validar y tipar entrada/salida |
| Rate limiting | `express-rate-limit` | Protección contra abuso y fuerza bruta |
| Seguridad HTTP | `helmet`, `cors` | Cabeceras y orígenes permitidos |
| Imágenes | Supabase Storage (`@supabase/supabase-js`) + `multer` | Fotos de mascotas y perfil |
| Correo | Brevo (API transaccional, `@getbrevo/brevo`) | OTP, confirmaciones, recordatorios, alertas |
| Logging | `pino` | Logs estructurados |
| Calidad | ESLint, Prettier, Husky, lint-staged | Estilo y control pre-commit |
| Documentación de API | OpenAPI/Swagger: `swagger-ui-express` (D-40) | Documentar endpoints (RNF-13); el documento se arma con los esquemas Zod, sin otra librería |

> Cualquier librería **no listada** (programador de tareas para recordatorios, generación de PDF de facturas, etc.) requiere decisión explícita antes de agregarse: ver [12](12-decisiones-y-pendientes.md).

## 3. Estructura del monorepo

```
VetCare-Web/
├── back/                         # Backend Express (antes apps/api)
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── src/
│   │   ├── config/               # env, cors, rate-limit, logger
│   │   ├── shared/               # errores, utils, middlewares, tipos comunes
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   │   ├── dto/
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── auth.routes.ts
│   │   │   │   └── otp.service.ts
│   │   │   └── users/
│   │   │       ├── dto/
│   │   │       ├── users.controller.ts
│   │   │       ├── users.service.ts
│   │   │       ├── users.repository.ts
│   │   │       └── users.routes.ts
│   │   │   # un módulo por dominio: owners, patients, appointments, ...
│   │   ├── routes/
│   │   │   └── v1/index.ts       # Agrega rutas de módulos bajo /api/v1
│   │   ├── app.ts                # Composición de Express (composition root)
│   │   └── server.ts             # Arranque (listen)
│   └── package.json
├── front/                        # Frontend Next.js (antes apps/web)
│   ├── src/
│   │   ├── app/                  # Rutas (App Router)
│   │   ├── components/           # UI reutilizable
│   │   ├── features/             # Lógica por dominio (auth, appointments, ...)
│   │   ├── services/             # Cliente HTTP hacia la API
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── types/
│   └── package.json
├── packages/
│   └── shared/                   # (opcional) tipos/DTOs compartidos front-back
├── context/                      # Fuente de verdad del proyecto (este directorio)
├── .claude/                      # Reglas y skills del agente
├── CLAUDE.md                     # Punto de entrada del agente (apunta a context/)
├── README.md
└── package.json                  # Workspaces (npm; pnpm no está instalado)
```

> **Nota**: el repositorio se inició con Vite + React Router. Al adoptar Next.js, el frontend se crea en `front/` y el scaffold de Vite se retira. Existe el esqueleto de carpetas (con `.gitkeep`), los `package.json` mínimos con workspaces y los `.env.example`; Desde el cierre del Sprint 0 hay base de `back/` (Express, config, errores, Prisma con el modelo de autenticación) y de `front/` (Next.js, Tailwind, cliente HTTP, `proxy.ts`); la migración inicial `init` ya está aplicada en Supabase y el módulo `auth` está implementado (se agregan los módulos siguiendo el orden de la sección 11).

Módulos de dominio previstos en `back/src/modules/` (uno por área de [02](02-requerimientos-funcionales.md)): `auth`, `users`, `owners`, `patients`, `staff` (veterinarios, estilistas, horarios), `appointments`, `clinical` (consultas, vacunaciones, cirugías, internaciones, exámenes), `grooming`, `inventory`, `invoices`, `notifications`, `reports`, `uploads`. Cada módulo replica la estructura `dto/ + controller + service + repository + routes`.

## 4. Backend en capas

```
Request → Route → Middleware (rate limit, auth, validación DTO)
        → Controller → Service (lógica de negocio) → Repository → Prisma → Supabase
        ← Response DTO ←
```

| Capa | Responsabilidad | Prohibido |
|------|-----------------|-----------|
| **Routes** | Mapear verbo + path a controller y middlewares | Lógica de negocio |
| **Controller** | Traducir HTTP ↔ casos de uso; devolver DTOs | Acceder a Prisma |
| **Service** | Reglas de negocio (RN-xx), orquestación, transacciones | Conocer `req`/`res` |
| **Repository** | Único punto de acceso a Prisma | Reglas de negocio |
| **DTO** | Contrato de entrada/salida validado | Contener lógica |

Las funciones PL/SQL de la versión de escritorio (`fn_vet_disponible`, `fn_calcular_total_con_iva`, `fn_stock_critico`, `fn_tiene_vacunas_vencidas`) se reimplementan como **reglas en la capa Service** (RN-20, RN-71, RN-56, RN-49), no como lógica en la base de datos.

### 4.1 Versionamiento

- Por URL: `/api/v1/...`, `/api/v2/...`. Cada versión vive en `src/routes/vN/` y puede reutilizar servicios.
- Cambios *breaking* ⇒ nueva versión; compatibles ⇒ misma versión. Versión obsoleta: cabeceras `Deprecation` / `Sunset`.

### 4.2 DTOs

- **Request DTO**: validan y tipan `body`, `query` y `params` con Zod en un middleware `validate(schema)`.
- **Response DTO**: mapean entidades de Prisma a la forma pública (nunca exponer `passwordHash`, `codeHash`, etc.).
- Tipos TypeScript inferidos del esquema (`z.infer`): una sola fuente de verdad. Nombres: `RegisterRequestDto`, `UserResponseDto`.

### 4.3 Rate limiting

| Alcance | Límite sugerido |
|---------|-----------------|
| Global (`/api`) | 100 req / 15 min por IP |
| `POST /auth/login` | 5 intentos / 15 min por IP + email |
| `POST /auth/register`, `/auth/otp/*`, `/auth/password/reset` | 3–5 / 10 min por IP + email |
| `POST /auth/password/forgot` | 5 / 10 min por IP + correo o cédula |
| `PUT /users/me/password` | 5 / 15 min por usuario (D-32) |

`429 Too Many Requests` con `Retry-After`. En producción, store compartido (p. ej. Redis) si hay más de una instancia.

### 4.4 Errores

Jerarquía propia (`AppError`, `ValidationError`, `UnauthorizedError`, `NotFoundError`, ...) y un único *error-handling middleware*:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [] } }
```

### 4.5 Convenciones de respuesta

JSON consistente; HTTP correctos (`201` creación, `204` sin contenido, `401`, `403`, `404`, `409`, `422`, `429`); paginación `?page=&limit=` con `meta`.

### 4.6 Recursos de la API (provisional)

Rutas bajo `/api/v1`, en inglés. Están documentadas en OpenAPI (D-40): la interfaz en `/api/v1/docs` y el documento en `/api/v1/openapi.json`, ambos públicos. El catálogo de las operaciones vive en `back/src/routes/v1/openapi/operations.ts`; **al agregar o cambiar un endpoint hay que actualizarlo en el mismo cambio**, para que la documentación no se quede atrás.

| Módulo | Recursos |
|--------|----------|
| auth | `POST /auth/register`, `/auth/otp/verify`, `/auth/otp/resend`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `POST /auth/password/forgot` (correo o cédula) y `POST /auth/password/reset` (D-31) |
| users | `GET /users/me`; propietario: `PATCH /users/me` (`phone` y `address`, con las reglas del registro; responde el mismo perfil que `GET`; correo y cédula no se editan, D-18) y, para cualquier sesión, `PUT /users/me/password` (`currentPassword`, `password`, `confirmPassword`; `204`; D-32); personal, solo ADMIN: `POST /users`, `GET /users`, `GET /users/{id}`, `PATCH /users/{id}` (rol, estado y contraseña; no se elimina) |
| owners / patients | `/owners`, `/patients`, `/me/patients` (portal: `GET` y `POST`; el `POST` registra una mascota propia con los campos de `POST /patients` sin `ownerId`, que sale de la sesión; RN-18, D-32). Cada paciente trae `owner: { id, firstNames, lastNames, documentNumber }` y `GET /patients` filtra por `?ownerDocument=` (cédula exacta) además de `ownerId`, `species`, `q` y `active`, para que el veterinario no dependa de `/owners` (D-28). `GET /users/me` incluye `owner.address` |
| staff | `/veterinarians`, `/groomers` (alta y edición solo ADMIN; lectura para cualquier sesión, con vista reducida para el propietario) y `/veterinarians/{id}/schedules`, `/groomers/{id}/schedules` (`GET` y `PUT` que reemplaza el horario semanal completo) |
| appointment-types | `GET /appointment-types`, `PATCH /appointment-types/{type}` (duración, solo ADMIN) |
| appointments | `GET /appointments/availability?type=&date=&professionalId=` (franjas libres y, si no hay, tres fechas sugeridas; RN-33); `POST /appointments` (propietario o recepción; sin `professionalId` = cualquiera disponible); `GET /appointments?from=&to=` (agenda, máx. 7 días: recepción ve todo, veterinario y estilista solo lo suyo); `PUT /appointments/{id}/reschedule`, `/cancel` (propietario las suyas, recepción cualquiera); `PUT /appointments/{id}/arrival`, `/no-show`, `/reassign` (solo recepción); `GET /me/appointments?when=upcoming\|past` (portal). Detalle en D-26 |
| clinical | Implementados (D-27): `POST /consultations` (solo el veterinario asignado), `GET /vaccines`, `POST /vaccines` (ADMIN), `POST /vaccinations`, `GET /patients/{id}/history?type=&from=&to=` y `GET /patients/{id}/vaccination-card` (recepción y veterinario), y sus equivalentes del portal `GET /me/patients/{id}/history` y `/vaccination-card` (sin notas internas). Desde D-34: `POST /surgeries`, `POST /lab-exams`, `POST /hospitalizations` y `PUT /hospitalizations/{id}/discharge` (solo veterinario), `GET /hospitalizations?status=ADMITTED\|DISCHARGED&patientId=` (recepción y veterinario), y el historial suma las entradas `SURGERY`, `HOSPITALIZATION` y `LAB_EXAM` (también en `type=`) |
| grooming | Implementados (D-33): `POST /grooming-services` (solo el estilista; con `appointmentId` opcional que cierra la cita de estética), `GET /patients/{id}/grooming-services` (recepción, veterinario y estilista) y `GET /me/patients/{id}/grooming-services` (portal, solo las suyas) |
| inventory | Implementados (D-36, solo ADMIN): `GET /inventory/medications` y `GET /inventory/vaccines` (paginados; `?q=&active=&alert=LOW_STOCK\|EXPIRING`), `POST /inventory/medications`, `PATCH /inventory/medications/{id}` y `PATCH /inventory/vaccines/{id}` (nombre, precio, stock, mínimo, vencimiento y estado; `expiresAt: null` lo borra) y `GET /inventory/alerts` (productos activos con stock crítico, por vencer o vencidos). El stock no se descuenta solo; el catálogo de vacunas para vacunar sigue en `GET /vaccines` |
| invoices | Implementados (D-27): `GET /invoices/pending?ownerId=` (conceptos sin facturar: consultas, vacunaciones y, desde D-33, servicios de estética con `kind: "GROOMING"`), `POST /invoices` (acepta `consultationIds`, `vaccinationIds` y `groomingServiceIds`), `GET /invoices` y `GET /invoices/{id}` (recepción y administrador; el propietario solo las suyas), `PUT /invoices/{id}/void` (solo ADMIN, con motivo), `GET /me/invoices` (portal). Sin PDF en el servidor: el front usa “Imprimir / guardar como PDF” del navegador (D-37) |
| health | `GET /health` (la API está viva; lo usa Render) y `GET /health/db` (D-39, público): hace un `SELECT 1` con tope de 8 s y responde `200 {"status":"ok","database":"ok"}` o `503 {"status":"error","database":"unreachable"}`, sin detalles del error. Es el que debe consultar un monitor externo |
| notifications | Implementados (D-38, solo ADMIN): `GET /notifications?status=&kind=` (registro paginado de los correos, RN-39) y `POST /notifications/run` (ejecuta a mano lo mismo que el programador: encola recordatorios y avisos de vacuna y entrega los pendientes). Los correos de cita (agendar, cambiar, cancelar) los dispara `appointments`; el programador corre solo con `SCHEDULER_ENABLED=true` |
| reports | Implementado (D-35): `GET /reports/dashboard?from=&to=` (solo ADMIN; `AAAA-MM-DD`, por defecto los últimos 30 días, máximo 366): citas por estado y tasa de inasistencia, servicios más solicitados, ingresos (total, IVA, por método de pago y por día), mascotas y propietarios nuevos, internaciones abiertas y vacunas vencidas o por vencer |
| uploads | `POST /uploads/...` (multipart) |

## 5. Subida de imágenes (Supabase Storage)

Los **buckets se crearán en Supabase cuando el proyecto esté enlazado** (credenciales y `SUPABASE_URL` disponibles).

```
Front → POST /api/v1/uploads/... (multipart) → API (auth + rate limit + validación)
      → IStorageProvider (SupabaseStorageProvider) → Supabase Storage
      ← ruta del objeto → se guarda en la BD vía Prisma
```

- La subida pasa **siempre por la API**; el frontend nunca recibe la `service_role key`.
- `multer` con `memoryStorage` y límite de tamaño (p. ej. 5 MB).
- Tipos permitidos: `image/jpeg`, `image/png`, `image/webp`, verificando también la firma real (*magic bytes*).
- Nombre del objeto: `<carpeta>/<uuid>.<ext>`; nunca el nombre original del cliente.
- En la BD se guarda la **ruta** (no la URL completa).
- Abstracción `IStorageProvider` (`upload`, `delete`, `getUrl`/`getSignedUrl`) para aislar a Supabase.

| Bucket (provisional) | Visibilidad | Uso |
|----------------------|-------------|-----|
| `avatars` | Público | Fotos de perfil |
| `private-images` | Privado (URLs firmadas) | Imágenes no públicas (p. ej. fotos de pacientes si se decide protegerlas) |

Creación de buckets mediante script reproducible `back/scripts/setup-storage.ts` (idempotente, con políticas RLS de `storage.objects` y límites de tamaño/MIME por bucket).

## 6. Base de datos (Prisma + Supabase)

- Supabase como **PostgreSQL gestionado**; la API se conecta con Prisma vía `DATABASE_URL` (pooler) y `DIRECT_URL` (migraciones).
- Autenticación propia (JWT); **no** se usa Supabase Auth.
- Claves primarias `String @id @default(uuid()) @db.Uuid`.
- Migraciones versionadas con `prisma migrate`.
- Modelo inicial de referencia (`User`, `OtpCode`, `RefreshToken`) y extensión al dominio completo: ver [06](06-modelo-de-dominio.md) y [09](09-seguridad-y-autenticacion.md).

## 7. Frontend

- **Next.js App Router** con TypeScript. Server Components por defecto; Client Components solo con interactividad.
- Capa `services/` única para hablar con la API (cliente HTTP tipado; maneja 401 → refresh).
- Organización por **features** (`features/auth`, `features/appointments`, ...) con componentes, hooks y esquemas.
- Formularios con React Hook Form + Zod (mismos esquemas que los DTOs, vía `packages/shared` si se desea).
- Rutas protegidas con `proxy.ts` de Next (en Next 16 `middleware.ts` está deprecado y se llama `proxy`): solo comprueba que exista la cookie de sesión (`refresh_token`) y redirige a `/login?next=<ruta>`; la verificación real y el rol los hace la API. La navegación por rol se resuelve en la UI.
- `services/http-client.ts` guarda el access token en memoria, envía cookies (`credentials: include`) y, ante un 401, hace un único `POST /auth/refresh` compartido entre peticiones concurrentes y reintenta.
- Next reescribe `/api/v1/*` hacia la API (*rewrites* en `next.config.ts`) para que la cookie `refresh_token` quede en el mismo dominio del front y `proxy.ts` la pueda leer (D-25).
- `NEXT_PUBLIC_USE_MOCKS=true` activa los datos de prueba: `services/` responde con datos locales en vez de llamar a la API (D-24).
- Variables públicas solo con prefijo `NEXT_PUBLIC_`.
- Responsivo desde 360 px (RNF-07), en español (RNF-08).

Áreas de la interfaz: **portal del propietario** (Inicio, Mis citas, Agendar, Historial clínico, Facturas y Mi perfil; ver [13](13-mensajes-y-experiencia.md) §2) y **panel interno** por rol (recepción, clínico, estética, administración). Flujo de autenticación: `Registro → Verificación OTP → Login → Área protegida`.

### 7.1 Identidad visual (D-23)

| Token | Hexadecimal |
|-------|-------------|
| `brand-50` / `brand-100` / `brand-200` | `#EEF7FA` / `#E3F1F5` / `#C5E1E9` |
| `brand-500` / `brand-600` / `brand-700` | `#2B87A0` / `#1F6F85` / `#185A6C` |
| `navy`, `ink` | `#1A2E3B` |
| `muted` / `subtle` | `#44535C` / `#55636B` |
| `canvas` / `surface` | `#F5F5F0` / `#FFFFFF` |
| `line` / `divider` / `field-border` | `#E6E4DC` / `#ECEBE4` / `#8C8D84` |
| `sand` / `sand-border` / `honey` | `#F3E9DC` / `#E8D5BD` / `#8A4F1C` |
| `success` / `success-bg` / `success-border` | `#047857` / `#ECFDF5` / `#A7F3D0` |
| `warning` / `warning-bg` / `warning-border` | `#B45309` / `#FFFBEB` / `#FDE68A` |
| `danger` / `danger-bg` / `danger-border` | `#BE123C` / `#FFF1F2` / `#FECDD3` |
| `info` / `info-bg` / `info-border` | `#1F6F85` / `#EEF7FA` / `#C5E1E9` |

- Fuente: **IBM Plex Sans**.
- Logo: `front/public/logo.png`; ícono de la pestaña: `front/src/app/icon.png`.
- Radios: 10, 14, 24 y 32 px.

### 7.2 Rutas del frontend

Cada ruta define su `metadata.title` y el layout raíz lo completa como “Título | VetCare”; la portada usa “VetCare | Clínica veterinaria en Valledupar”. Una sección del panel que no está en el menú del rol devuelve a `/panel` (RN-13). En la barra superior del panel, el botón con el usuario y su rol abre “Cambiar contraseña” (D-43).

| Ruta | Quién entra | Para qué |
|------|-------------|----------|
| `/` | Cualquiera | Portada |
| `/login` | Cualquiera | Iniciar sesión |
| `/register` | Cualquiera | Crear cuenta con verificación OTP |
| `/reset-password` | Cualquiera | Crear la contraseña nueva desde el enlace del correo (`?token=`, D-31) |
| `/portal` | Propietario | Inicio: saludo, próxima cita y mascotas |
| `/portal/appointments` | Propietario | Mis citas |
| `/portal/appointments/new` | Propietario | Agendar cita |
| `/portal/history` | Propietario | Historial clínico: elegir la mascota (destino del menú) |
| `/portal/history/[petId]` | Propietario | Historial clínico de una mascota |
| `/portal/invoices` | Propietario | Facturas y su PDF |
| `/portal/profile` | Propietario | Mi perfil |
| `/portal/pets/new` | Propietario | Agregar mascota |
| `/panel` | Personal | Sin contenido propio: lleva a la primera sección del menú del rol |
| `/panel/agenda` | Recepcionista, veterinario, estilista | Agenda (Mi agenda para veterinario y estilista) |
| `/panel/owners` | Recepcionista | Propietarios |
| `/panel/owners/[id]` | Recepcionista | Ficha del propietario: datos, mascotas, editar, desactivar y agregar mascota |
| `/panel/patients` | Recepcionista, veterinario | Pacientes |
| `/panel/patients/[id]` | Recepcionista, veterinario | Ficha del paciente: datos, carné, historial con notas internas y estética; el veterinario registra cirugías, exámenes e internaciones (D-34) |
| `/panel/attention` | Veterinario, estilista | Atención: citas confirmadas de hoy por atender (destino del menú) |
| `/panel/attention/[appointmentId]` | Veterinario, estilista | Atención de la cita: consulta o vacuna (veterinario) o servicio estético (estilista, D-33) |
| `/panel/invoices` | Recepcionista, administrador | Facturación: listado con filtro por estado; recepción ve “Nueva factura” y el administrador solo consulta y anula (RN-74, D-42) |
| `/panel/invoices/new` | Recepcionista | Nueva factura con los conceptos pendientes de un propietario (RF-23); el administrador vuelve a `/panel/invoices` (D-42) |
| `/panel/users` | Administrador | Usuarios: cuentas del personal con nombre (del perfil de veterinario o estilista), correo, rol y estado (D-43) |
| `/panel/staff` | Administrador | Personal y horarios |
| `/panel/inventory` | Administrador | Inventario: pestañas Medicamentos y Vacunas con nombre, stock, precio, vencimiento y estado (stock crítico, por vencer o vencido); conteo de alertas con filtro, buscador por nombre, paginación y modal para crear y editar. Los umbrales los da la API; una vacuna nueva se crea en `POST /vaccines` y luego se completa su stock (RN-55, RN-56, RN-57, D-36) |
| `/panel/reports` | Administrador | Indicadores: citas por estado, inasistencias, servicios más solicitados e ingresos del periodo elegido (por defecto el mes actual), con barras en CSS sin librería de gráficas (RN-80, D-35) |

## 8. Principios de diseño

### SOLID

| Principio | Aplicación |
|-----------|------------|
| **S** | Controller, Service y Repository separados; `OtpService` aparte de `AuthService` |
| **O** | Estrategias intercambiables (p. ej. proveedor de correo) sin modificar el servicio |
| **L** | Cualquier implementación de `IMailProvider` / `IUserRepository` es intercambiable |
| **I** | Interfaces pequeñas (`IHasher`, `ITokenService`, `IMailProvider`) |
| **D** | Servicios dependen de abstracciones inyectadas por constructor (composition root en `app.ts`) |

### GRASP

| Patrón | Aplicación |
|--------|-----------|
| **Information Expert** | La lógica vive donde está la información (reglas de OTP en `OtpService`; de disponibilidad en el servicio de citas) |
| **Creator** | Las factorías/servicios crean las entidades que agregan |
| **Controller** | Controllers HTTP como punto de entrada que delega al servicio |
| **Low Coupling** | Módulos independientes; comunicación vía interfaces |
| **High Cohesion** | Cada módulo agrupa solo lo relacionado a su dominio |
| **Polymorphism** | Proveedores y estrategias intercambiables por interfaz |
| **Pure Fabrication** | `Repository`, `Hasher`, `TokenService` como clases sin equivalente de dominio |
| **Indirection** | `Repository` entre servicio y Prisma; `IMailProvider` (implementación `BrevoMailProvider`) entre negocio y Brevo |
| **Protected Variations** | Prisma y proveedores externos encapsulados tras interfaces |

### Código limpio

- Nombres descriptivos en un solo idioma (**código en inglés, documentación en español**).
- Funciones pequeñas de una sola responsabilidad; sin números/strings mágicos (constantes y enums: p. ej. `MIN_APPOINTMENT_LEAD_HOURS = 2`).
- Sin comentarios que expliquen *qué*; solo *por qué* cuando no es obvio.
- *Guard clauses* en vez de anidamiento profundo; DRY sin abstracciones prematuras; KISS/YAGNI.
- Errores explícitos mediante excepciones tipadas; composición sobre herencia; inmutabilidad cuando sea posible.
- Alias de importación (`@/`) y orden consistente de imports.

## 9. Configuración y entorno

Nunca versionar `.env`; mantener `.env.example`.

```
# back/
NODE_ENV=
PORT=
DATABASE_URL=
DIRECT_URL=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
OTP_TTL_MINUTES=10
BCRYPT_COST=12                  # mínimo 12 (09 §1)
TRUST_PROXY_HOPS=0              # proxies delante de la API: 0 en local, 2 en producción (D-30)
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=      # solo backend, jamás exponer al frontend
BREVO_API_KEY=
MAIL_FROM_EMAIL=
MAIL_FROM_NAME=
CORS_ORIGINS=
FRONTEND_URL=                   # opcional; dominio del front para el enlace de recuperación (D-31); si se omite, el primer origen de CORS_ORIGINS
SCHEDULER_ENABLED=false         # true solo en el servidor desplegado: activa el programador de recordatorios por correo (D-38)
SEED_ADMIN_EMAIL=               # solo para `npm run db:seed` (primer administrador)
SEED_ADMIN_PASSWORD=
SEED_DEMO_PASSWORD=             # solo para `npm run db:seed:demo` (datos de demostración, D-29)

# front/
NEXT_PUBLIC_API_URL=            # local: http://localhost:3001/api/v1; producción: https://<dominio-del-front>/api/v1
API_PROXY_TARGET=               # solo servidor; en producción, la URL base de la API (activa los rewrites, D-25)
```

Validación de variables al arrancar con Zod (falla rápido si falta alguna).

### 9.1 Despliegue (D-30)

| Pieza | Plataforma | Configuración |
|-------|------------|---------------|
| Base de datos | Supabase (la misma de desarrollo, ya migrada) | Migraciones nuevas con `npm run db:migrate:deploy -w back` |
| API (`back/`) | Render, servicio web (`render.yaml`) | Build `NODE_ENV=development npm ci && npm run db:generate -w back` (con `production` npm omite `husky` y falla el script `prepare`); start `npm run start -w back`; `NODE_ENV=production`, `TRUST_PROXY_HOPS=2`, `SCHEDULER_ENABLED=true`, `HUSKY=0`; secretos en el panel |
| Front (`front/`) | Vercel, con *Root Directory* `front` | `NEXT_PUBLIC_API_URL` y `API_PROXY_TARGET` (arriba) |

- El navegador solo habla con el dominio del front; Next reenvía `/api/v1/*` a la API (*rewrites*, D-25). Así la cookie `refresh_token` queda en el dominio del front y `proxy.ts` la puede leer.
- `CORS_ORIGINS` de la API debe contener la URL del front.
- En producción el arranque no lee `.env`: las variables vienen del panel de la plataforma (`npm run start`); `npm run start:local` conserva la lectura de `.env`.
- El plan gratuito de Render duerme la API tras un rato sin tráfico: la primera petición tarda unos 50 s. Antes de una demostración, abrir `/api/v1/health` para despertarla.
- Supabase pausa los proyectos gratuitos tras una semana sin actividad. Para evitarlo, y de paso mantener despierta la API y su programador de recordatorios, un monitor externo gratuito consulta `https://<api>/api/v1/health/db` cada 5 minutos (D-39). Render no usa ese endpoint como *health check*: sigue con `/health`, para no reiniciar la API por un parpadeo de la base.

## 10. Calidad

- **Git**: Git Flow y commits convencionales ([11](11-flujo-git.md)).
- **Hooks**: Husky + lint-staged ejecutan ESLint, Prettier y typecheck antes del commit.
- **CI** (sugerido): lint → typecheck → build.
- **Pruebas automatizadas**: omitidas por decisión del proyecto ([03](03-requerimientos-no-funcionales.md)).

## 11. Orden sugerido de construcción

1. Monorepo con workspaces, TypeScript, ESLint y Prettier.
2. `back/`: Express base, config/env, logger, error handler, `helmet`/`cors`.
3. Prisma + conexión a Supabase, modelo inicial y primera migración.
4. Rate limiting global y versionado `/api/v1`.
5. Módulo `auth`: registro, OTP, login, refresh, logout (Sprint 1).
6. Módulo `users`: perfil y RBAC. Con Supabase enlazado: buckets (`setup-storage`) y módulo `uploads`.
7. `front/`: Next.js, layout base, cliente HTTP.
8. Pantallas de registro, verificación OTP y login; rutas protegidas.
9. Documentación de la API (OpenAPI/Swagger) y CI.

Luego, los módulos de dominio siguiendo el backlog por sprints ([10](10-gestion-del-proyecto.md)).
