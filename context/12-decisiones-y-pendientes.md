# 12 — Decisiones y pendientes

Registro de cómo se alinearon los dos documentos de origen (`specs.pdf` y `ARCHITECTURE.md`, ya eliminados del repo; ver [README](README.md)) y de lo que aún no está definido. Al resolver un pendiente, se mueve a **Decisiones** (con fecha) y se actualizan los archivos afectados.

## 1. Decisiones tomadas

| ID | Decisión | Origen / motivo | Afecta |
|----|----------|-----------------|--------|
| D-01 | Sesión con **access token (~15 min) + refresh token (~7 días) rotativo**, no un JWT único de 8 h | Manda el stack de `ARCHITECTURE.md`; `specs.pdf` (RF-02) pedía 8 h | RN-10, 09 §3 |
| D-02 | **Solo el stack de `ARCHITECTURE.md`**. Se descartan: React + Vite + React Router + Axios, Java 21 + Spring Boot/Security/Data JPA/Mail, Oracle XE + PL/SQL, Maven, Swagger de Spring, SMTP, Jakarta Mail | Instrucción del equipo (2026-10-16) | 08 |
| D-03 | Estructura del monorepo: **`back/` y `front/`** en la raíz (no `apps/api` ni `apps/web`) | Instrucción del equipo (2026-10-16) | 08 §3 |
| D-04 | El registro del propietario **incluye verificación OTP por correo**; la cuenta nace `PENDING` y pasa a `ACTIVE` al verificar | Manda `ARCHITECTURE.md` (registro verificado por OTP); `specs.pdf` no lo contemplaba | RN-05, 09 §2 |
| D-05 | Roles ampliados de `USER/ADMIN` a `OWNER`, `RECEPTIONIST`, `VETERINARIAN`, `GROOMER`, `ADMIN` | Roles del negocio en `specs.pdf` | 06 §3, 09 §6 |
| D-06 | Las funciones PL/SQL (`fn_vet_disponible`, `fn_calcular_total_con_iva`, `fn_stock_critico`, `fn_tiene_vacunas_vencidas`) pasan a **reglas en la capa Service** (TypeScript) | Arquitectura en capas; sin lógica en BD | 04, 08 §4 |
| D-07 | **Tailwind CSS v4** como framework de estilos del frontend | Decisión del equipo (2026-10-16); `ARCHITECTURE.md` no lo definía | 08 §2 |
| D-08 | **Sin pruebas automatizadas**; validación funcional por criterios de aceptación y cliente HTTP | `ARCHITECTURE.md`; JMeter/Postman de `specs.pdf` no son parte del stack | 03 |
| D-09 | **Git Flow** y Conventional Commits, no las ramas `feature/frontend` y `feature/backend` de `specs.pdf` | `ARCHITECTURE.md` §12 | 11 |
| D-10 | Correo transaccional con **Brevo** (API), no SMTP/Spring Mail | `ARCHITECTURE.md` | 08, RN-35..38 |
| D-11 | Política de contraseña = unión de ambas fuentes: mín. 8, mayúscula y número (specs) y máx. 72 (límite bcrypt) | Alineación | RN-02 |
| D-12 | Despliegue de **una clínica por instalación** (sin entidad “clínica/tenant”); el modelo SaaS multi-clínica queda como evolución. *Supuesto a confirmar* | `specs.pdf` no modela clínica; “varias sedes” es trabajo futuro | 06 |
| D-13 | `ARCHITECTURE.md` y `specs.pdf` se **eliminan del repositorio**; `context/` es la única fuente de verdad (2026-10-16) | Instrucción del equipo, tras verificar que todo su contenido está en `context/` | README, CLAUDE.md, reglas |
| D-14 | **Prisma 6.x** (6.19.3), no Prisma 7 | Prisma 7 exige un adaptador de driver (`pg`) y `prisma.config.ts`, librerías fuera del stack de 08; se reevalúa al migrar | 08 §2 |
| D-15 | Rutas protegidas con **`proxy.ts`** (Next 16), no `middleware.ts`; se añade `@hookform/resolvers` para unir React Hook Form con Zod | `middleware` está deprecado en Next 16; el resolver es la pieza oficial del par RHF + Zod ya incluido en el stack | 08 §2, §7 |
| D-16 | **Replanificación del 2026-10-16**: Sprint 0 cerrado; 3 sprints (19 oct – 23 nov) con solo las historias Must (HU-01 a HU-16, 84 pts); HU-17 a HU-24 pasan a Reserva | Al 16 oct solo existía el esqueleto del Sprint 0 y la sustentación es el 24 nov | 10, 02 §3 |
| D-17 | **R-01 resuelto (2026-10-16)**: la cédula de un propietario existente solo se vincula si el correo del registro coincide con el que la clínica guardó. Si la cédula existe con otro correo o sin correo, el registro se rechaza (409) y se indica acudir a recepción; no se crea una cuenta huérfana sin propietario | Decisión del Product Owner; evita ver mascotas e historial de otra persona | 04 (RN-04), 09 §2 |
| D-18 | **Recuperación de acceso por cédula (2026-10-16)**: quien olvidó su correo y su clave puede identificar la cuenta con la cédula; el enlace de restablecimiento (RN-11) va siempre al correo ya registrado, con respuesta genérica y rate limit. Registrar una cédula que ya tiene cuenta devuelve 409 e indica iniciar sesión o recuperar el acceso. El correo solo se cambia en la clínica, con la identidad verificada en persona: la recepcionista lo actualiza en el propietario y el cambio se aplica también al correo de la cuenta (si el nuevo ya está en uso, 409; un propietario con cuenta no puede quedar sin correo). Un código de vinculación entregado en recepción queda como mejora opcional (Reserva) | Acuerdo con el equipo de frontend y la dueña del backend; completa D-17 sin certificar la identidad por el correo | 04 (RN-04, RN-11), 02 (RF-01, RF-03), 09 §5 |
| D-20 | **Primer administrador y gestión de personal (2026-10-17)**: el primer `ADMIN` se crea con `npm run db:seed` (`SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD` en `back/.env`; no modifica uno existente). Las cuentas del personal las crea el administrador con una contraseña inicial que él define; no se envía correo. Las cuentas no se eliminan: se suspenden y se cierran sus sesiones | Sin un administrador nadie puede crear al resto del personal (RN-12); el correo de bienvenida es de Reserva (HU-19) | 04 (RN-12), 08 §5, 09 §6 |
| D-21 | **Franjas y duraciones de las citas (2026-10-17)**: franjas de 30 minutos; consulta general, vacunación y control duran 30 min con veterinario, y estética 90 min con estilista. Las duraciones viven en la tabla `AppointmentTypeSetting` y las edita el administrador (siempre múltiplos de 30). Resuelve P-06 | Propuesta del frontend (Kenys) confirmada por la dueña del backend | 04 (RN-19), 07, 08 |
| D-22 | **Modelo del personal (2026-10-17)**: `Veterinarian` (con especialidad) y `Groomer` son tablas separadas, enlazadas a `User` por `veterinarianId` / `groomerId` únicos. El administrador crea primero la cuenta con rol (RN-12) y después el perfil. `Schedule` es un bloque semanal de un veterinario o un estilista (CHECK de un solo dueño, días 1–7, inicio < fin); el horario se guarda reemplazando el semanal completo y sin solapamientos en un día. Quien no es personal interno solo ve nombre y especialidad de los activos | 06 §4 ya pedía tablas separadas; HU-06 | 04 (RN-19), 06, 07, 08 |
| D-23 | **Identidad visual del frontend (2026-10-17)**: paleta petróleo, marino y hueso (reemplaza la verde inicial y conserva los nombres de token), logo petróleo, IBM Plex Sans y radios de 10, 14, 24 y 32 px. Menú del portal: Inicio, Mis citas, Agendar, Historial clínico, Facturas y Mi perfil; agendar en 5 pasos | Que la web combine con la app de escritorio; acuerdo entre frontend y Product Owner | 08 §7, §7.1, §7.2; 13 §2 |
| D-24 | **Datos de prueba en el frontend (2026-10-17)**: con `NEXT_PUBLIC_USE_MOCKS=true`, `services/` responde con datos de prueba en vez de llamar a la API. Sin librerías nuevas | Avanzar pantallas antes de que exista cada endpoint | 08 §7 |
| D-25 | **Rewrites de la API (2026-10-17)**: Next reescribe `/api/v1/*` hacia la API para que la cookie `refresh_token` quede en el mismo dominio y `proxy.ts` la lea | Acuerdo entre frontend y backend | 08 §7 |
| D-26 | **Motor de citas (2026-10-19, HU-08, 09, 10, 11)**: (1) el bloqueo transaccional de la franja (RN-27) lo hace la base con exclusiones GiST (`btree_gist`, verificado en Supabase) y el segundo en llegar recibe `409 La franja ya no esta disponible`; (2) las franjas y los horarios son hora de Colombia, UTC−5 fijo (`CLINIC_UTC_OFFSET_MINUTES`); (3) “cualquiera disponible” asigna al primer profesional libre por orden alfabético; (4) los límites de RN-21/22/24/28 (2 h, 30 días, 3 citas, 2 h) se aplican al propietario **y** a recepción al agendar, pero al reprogramar o cancelar la restricción de 2 h (RN-28) solo rige para el propietario; (5) reprogramar conserva la duración y el estado de la cita; (6) `no-show` exige que hayan pasado 15 min desde el inicio y admite `SCHEDULED` o `CONFIRMED` (RN-34); (7) el administrador no agenda: la matriz de 09 reserva RF-16 a recepción | La matriz de 09 y RN-28 no precisan estos puntos; se toma el supuesto más simple, a confirmar con la dueña del producto | 04 (RN-20 a RN-34), 06, 07, 08 |
| D-19 | **Tipos de paciente (2026-10-16)**: especie `DOG`/`CAT`/`OTHER` (enum), sexo `MALE`/`FEMALE` (enum), raza `VARCHAR(60)`, peso `DECIMAL(5,2)` en kg, fecha de nacimiento `DATE`, foto opcional (ruta en Storage). Resuelve P-05 para el paciente | Acuerdo con el frontend (coincide con sus datos de prueba); tamaños según 07 | 04 (RN-15), 02 (RF-06), 07 |

## 2. Riesgos a decidir

| ID | Tema | Detalle | Recomendación |
|----|------|---------|---------------|
| R-01 | (resuelto por D-17) **Vinculación por cédula (RN-04)** | Cualquiera con un correo válido podría registrarse con la cédula de otro propietario existente y ver sus mascotas e historial. El OTP solo verifica el correo, no la identidad | Se vincula solo si el correo coincide con el registrado por la clínica |
| R-02 | Mensaje “El correo ya está registrado” (RN-03) | Permite enumerar correos (contradice la práctica de mensajes genéricos de login) | Se mantiene porque es criterio de aceptación explícito de RF-01; el rate limit de registro mitiga |
| R-03 | **Capacidad del plan replanificado** | Se comprometen 84 pts en ~5½ semanas (≈ 26–29 pts por sprint) frente a una velocidad de referencia de 19 pts por sprint de 2 semanas; el Sprint 3 dura 8 días e incluye cierre y despliegue. Además HU-13 y HU-16 dependen de un catálogo mínimo de vacunas y medicamentos (el inventario completo es HU-18, en Reserva) | Confirmar el alcance con el Product Owner. Si el Sprint 1 no llega a ≈ 26 pts, recortar HU-11 o HU-15 del alcance comprometido y registrarlo aquí |

## 3. Pendientes (sin definir)

| ID | Pendiente | Necesario para | Nota |
|----|-----------|----------------|------|
| P-01 | **Programador de tareas** para recordatorios de 24 h y aviso de vacunas (RN-36, RN-37) | HU-19 (Reserva) | No hay scheduler en el stack. Opciones: tarea en el proceso de la API, tarea programada del proveedor o un cron externo que llame a un endpoint. Decidir antes de agregar librerías |
| P-02 | **Generación de PDF de facturas** (RN-76) | HU-16/17 (HU-16 en Sprint 3 sin PDF; HU-17 en Reserva) | No hay librería de PDF en el stack |
| P-03 | Umbral de **stock crítico** y ventana de **por vencer** (RN-56) | HU-18 | No definidos en `specs.pdf` |
| P-04 | Qué conceptos están **gravados con IVA** (RN-71) | HU-16 | Solo se dice “productos gravados” |
| P-05 | Tipos y tamaños de los atributos propios del dominio (síntomas, diagnóstico, lote, resultados, etc.); los del paciente (especie, raza, sexo, peso) quedaron en D-19 | Modelado (07) | Se justifican entidad por entidad |
| P-06 | (resuelto por D-21) Duración por defecto de cada tipo de cita y esquema de franjas (RN-19) | HU-06, HU-08 | Franjas de 30 min; duraciones editables por el administrador |
| P-07 | Formato del **número de factura** | HU-16 | — |
| P-08 | **VetBot** (asistente de preguntas frecuentes heredado) | — | Aparece en el modelo de negocio y componentes, pero no en los RF. Mientras no haya endpoint, VetBot queda como solo preguntas frecuentes |
| P-09 | (retirado) Campos de BD para bloqueo por intentos (RN-08) y tokens de recuperación (RN-11) | — | Resuelto: están en `schema.prisma` y en 09 §8 |
| P-10 | (retirado) Reconfirmar el avance del plan de sprints con el stack nuevo | — | Resuelto por D-16: se reconfirmó el avance y se replanificó |
| P-11 | (retirado) `ARCHITECTURE.md` desactualizado respecto a `front/` y `back/` | — | Resuelto por D-13: el archivo se eliminó |
| P-12 | Verificar formato de cédula de extranjería y PPT, plan de numeración de la CRC y longitud del NIT | 07 | Ver notas de 07 |
| P-13 | Nombre y alcance finales de buckets de Storage | Cuando se enlace Supabase | 08 §5 |
| P-14 | Herramienta para la prueba de carga de RNF-05 | Cierre del proyecto | `specs.pdf` citaba JMeter |

## 4. Cómo se resolvió “qué manda” al consolidar

1. Reglas de negocio, roles, flujos, plazos y mensajes → de `specs.pdf` (se conservaron).
2. Stack, estructura, seguridad de sesión, flujo de Git y modelado de datos → de `ARCHITECTURE.md`.
3. Instrucciones posteriores del equipo (carpetas `front/` y `back/`, Tailwind v4) → prevalecieron sobre ambos documentos.

Desde D-13, `context/` es la única fuente: cualquier cambio futuro se hace aquí.
