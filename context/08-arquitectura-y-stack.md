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
| Documentación de API | OpenAPI/Swagger | Documentar endpoints (RNF-13) |

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
| `POST /auth/register`, `/auth/otp/*` | 3–5 / 10 min por IP + email |

`429 Too Many Requests` con `Retry-After`. En producción, store compartido (p. ej. Redis) si hay más de una instancia.

### 4.4 Errores

Jerarquía propia (`AppError`, `ValidationError`, `UnauthorizedError`, `NotFoundError`, ...) y un único *error-handling middleware*:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [] } }
```

### 4.5 Convenciones de respuesta

JSON consistente; HTTP correctos (`201` creación, `204` sin contenido, `401`, `403`, `404`, `409`, `422`, `429`); paginación `?page=&limit=` con `meta`.

### 4.6 Recursos de la API (provisional)

Rutas bajo `/api/v1`, en inglés. Se detallan en OpenAPI al implementar cada módulo.

| Módulo | Recursos |
|--------|----------|
| auth | `POST /auth/register`, `/auth/otp/verify`, `/auth/otp/resend`, `/auth/login`, `/auth/refresh`, `/auth/logout`, recuperación de contraseña |
| users | `GET /users/me`; personal, solo ADMIN: `POST /users`, `GET /users`, `GET /users/{id}`, `PATCH /users/{id}` (rol, estado y contraseña; no se elimina) |
| owners / patients | `/owners`, `/patients`, `/me/patients` (portal) |
| staff | `/veterinarians`, `/groomers` (alta y edición solo ADMIN; lectura para cualquier sesión, con vista reducida para el propietario) y `/veterinarians/{id}/schedules`, `/groomers/{id}/schedules` (`GET` y `PUT` que reemplaza el horario semanal completo) |
| appointment-types | `GET /appointment-types`, `PATCH /appointment-types/{type}` (duración, solo ADMIN) |
| appointments | `GET /appointments/availability?type=&date=&professionalId=` (franjas libres y, si no hay, tres fechas sugeridas; RN-33); `POST /appointments` (propietario o recepción; sin `professionalId` = cualquiera disponible); `GET /appointments?from=&to=` (agenda, máx. 7 días: recepción ve todo, veterinario y estilista solo lo suyo); `PUT /appointments/{id}/reschedule`, `/cancel` (propietario las suyas, recepción cualquiera); `PUT /appointments/{id}/arrival`, `/no-show`, `/reassign` (solo recepción); `GET /me/appointments?when=upcoming\|past` (portal). Detalle en D-26 |
| clinical | Implementados (D-27): `POST /consultations` (solo el veterinario asignado), `GET /vaccines`, `POST /vaccines` (ADMIN), `POST /vaccinations`, `GET /patients/{id}/history?type=&from=&to=` y `GET /patients/{id}/vaccination-card` (recepción y veterinario), y sus equivalentes del portal `GET /me/patients/{id}/history` y `/vaccination-card` (sin notas internas). Previstos: `/surgeries`, `/hospitalizations`, `/lab-exams` |
| grooming | `/grooming-services` |
| inventory | `/medications`, `/vaccines` |
| invoices | Implementados (D-27): `GET /invoices/pending?ownerId=` (conceptos sin facturar), `POST /invoices`, `GET /invoices` y `GET /invoices/{id}` (recepción y administrador; el propietario solo las suyas), `PUT /invoices/{id}/void` (solo ADMIN, con motivo), `GET /me/invoices` (portal). Pendiente: `/invoices/{id}/pdf` (P-02) |
| reports | `/reports/...` |
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

| Ruta | Quién entra | Para qué |
|------|-------------|----------|
| `/` | Cualquiera | Portada |
| `/login` | Cualquiera | Iniciar sesión |
| `/register` | Cualquiera | Crear cuenta con verificación OTP |
| `/portal` | Propietario | Inicio: saludo, próxima cita y mascotas |
| `/portal/appointments` | Propietario | Mis citas |
| `/portal/appointments/new` | Propietario | Agendar cita |
| `/portal/history` | Propietario | Historial clínico: elegir la mascota (destino del menú) |
| `/portal/history/[petId]` | Propietario | Historial clínico de una mascota |
| `/portal/invoices` | Propietario | Facturas y su PDF |
| `/portal/profile` | Propietario | Mi perfil |
| `/portal/pets/new` | Propietario | Agregar mascota |
| `/panel/agenda` | Recepcionista, veterinario, estilista | Agenda (Mi agenda para veterinario y estilista) |
| `/panel/owners` | Recepcionista | Propietarios |
| `/panel/patients` | Recepcionista, veterinario | Pacientes |
| `/panel/attention` | Veterinario | Atención: elegir la cita por atender (destino del menú) |
| `/panel/attention/[appointmentId]` | Veterinario | Atención de la cita |
| `/panel/invoices` | Recepcionista | Facturación |
| `/panel/users` | Administrador | Usuarios |
| `/panel/staff` | Administrador | Personal y horarios |

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
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=      # solo backend, jamás exponer al frontend
BREVO_API_KEY=
MAIL_FROM_EMAIL=
MAIL_FROM_NAME=
CORS_ORIGINS=
SEED_ADMIN_EMAIL=               # solo para `npm run db:seed` (primer administrador)
SEED_ADMIN_PASSWORD=

# front/
NEXT_PUBLIC_API_URL=
```

Validación de variables al arrancar con Zod (falla rápido si falta alguna).

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
