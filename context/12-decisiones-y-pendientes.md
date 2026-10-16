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

## 2. Riesgos a decidir

| ID | Tema | Detalle | Recomendación |
|----|------|---------|---------------|
| R-01 | **Vinculación por cédula (RN-04)** | Cualquiera con un correo válido podría registrarse con la cédula de otro propietario existente y ver sus mascotas e historial. El OTP solo verifica el correo, no la identidad | Vincular solo si el correo coincide con el registrado por la clínica, o dejar la vinculación pendiente de confirmación por recepción. **Pendiente de decisión del equipo (Product Owner)** |
| R-02 | Mensaje “El correo ya está registrado” (RN-03) | Permite enumerar correos (contradice la práctica de mensajes genéricos de login) | Se mantiene porque es criterio de aceptación explícito de RF-01; el rate limit de registro mitiga |

## 3. Pendientes (sin definir)

| ID | Pendiente | Necesario para | Nota |
|----|-----------|----------------|------|
| P-01 | **Programador de tareas** para recordatorios de 24 h y aviso de vacunas (RN-36, RN-37) | HU-19 (Sprint 5) | No hay scheduler en el stack. Opciones: tarea en el proceso de la API, tarea programada del proveedor o un cron externo que llame a un endpoint. Decidir antes de agregar librerías |
| P-02 | **Generación de PDF de facturas** (RN-76) | HU-16/17 (Sprint 5) | No hay librería de PDF en el stack |
| P-03 | Umbral de **stock crítico** y ventana de **por vencer** (RN-56) | HU-18 | No definidos en `specs.pdf` |
| P-04 | Qué conceptos están **gravados con IVA** (RN-71) | HU-16 | Solo se dice “productos gravados” |
| P-05 | Tipos y tamaños de los atributos propios del dominio (raza, especie, síntomas, diagnóstico, lote, resultados, etc.) | Modelado (07) | Se justifican entidad por entidad |
| P-06 | Duración por defecto de cada tipo de cita y esquema de franjas (RN-19) | HU-06, HU-08 | Configurable por el administrador |
| P-07 | Formato del **número de factura** | HU-16 | — |
| P-08 | **VetBot** (asistente de preguntas frecuentes heredado) | — | Aparece en el modelo de negocio y componentes, pero no en los RF. ¿Se migra? |
| P-09 | Campos de BD para bloqueo por intentos (RN-08) y tokens de recuperación (RN-11) | Sprint 1 / 6 | Ver 09 §4–5 |
| P-10 | Reconfirmar el avance del plan de sprints con el stack nuevo | 10 | El plan y su estado se escribieron para el stack anterior |
| P-11 | (retirado) `ARCHITECTURE.md` desactualizado respecto a `front/` y `back/` | — | Resuelto por D-13: el archivo se eliminó |
| P-12 | Verificar formato de cédula de extranjería y PPT, plan de numeración de la CRC y longitud del NIT | 07 | Ver notas de 07 |
| P-13 | Nombre y alcance finales de buckets de Storage | Cuando se enlace Supabase | 08 §5 |
| P-14 | Herramienta para la prueba de carga de RNF-05 | Cierre del proyecto | `specs.pdf` citaba JMeter |

## 4. Cómo se resolvió “qué manda” al consolidar

1. Reglas de negocio, roles, flujos, plazos y mensajes → de `specs.pdf` (se conservaron).
2. Stack, estructura, seguridad de sesión, flujo de Git y modelado de datos → de `ARCHITECTURE.md`.
3. Instrucciones posteriores del equipo (carpetas `front/` y `back/`, Tailwind v4) → prevalecieron sobre ambos documentos.

Desde D-13, `context/` es la única fuente: cualquier cambio futuro se hace aquí.
