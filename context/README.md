# context/ — Fuente de verdad de VetCare-Web

Esta carpeta reúne **todo lo que define el proyecto**: negocio, requerimientos, reglas, modelo de datos, arquitectura, seguridad, gestión y flujo de Git.

> **Regla de oro**: todo el código, las migraciones, la documentación de la API y las decisiones del proyecto se rigen por `context/`. Si algo en el código contradice a `context/`, se corrige el código o se actualiza `context/` **antes** de seguir (nunca se deja la contradicción).

## Origen y fuente única

`context/` se construyó (2026-10-16) consolidando dos documentos que **ya no existen en el repositorio**:

- `ARCHITECTURE.md` — definición de arquitectura y stack.
- `specs.pdf` — especificación académica del proyecto (requerimientos, Scrum, UML, manual).

Las menciones a ellos en estos archivos son solo de **procedencia** (“de dónde viene una regla o una decisión”). **`context/` es la única fuente de verdad.**

- **Stack tecnológico**: el de `ARCHITECTURE.md`, ya recogido en [08](08-arquitectura-y-stack.md). El stack que mencionaba `specs.pdf` (React + Vite, Java/Spring Boot, Oracle, Maven, etc.) **se descartó**; sus reglas de negocio se conservaron y se alinearon al stack vigente ([12](12-decisiones-y-pendientes.md)).
- Los diagramas UML de `specs.pdf` (casos de uso, actividades, clases, secuencia, componentes) eran imágenes y **no se transcribieron**; su contenido está descrito en texto en 05, 06 y 08.

## Índice

| Archivo | Contenido |
|---------|-----------|
| [01-negocio.md](01-negocio.md) | Problema, objetivos, modelo de negocio (SaaS), actores y necesidades del usuario |
| [02-requerimientos-funcionales.md](02-requerimientos-funcionales.md) | RF-01 a RF-24, especificación detallada y trazabilidad |
| [03-requerimientos-no-funcionales.md](03-requerimientos-no-funcionales.md) | RNF-01 a RNF-14 alineados al stack |
| [04-reglas-de-negocio.md](04-reglas-de-negocio.md) | Reglas de negocio numeradas (RN-xx), base de las validaciones |
| [05-casos-de-uso.md](05-casos-de-uso.md) | Catálogo de CU y flujos principales |
| [06-modelo-de-dominio.md](06-modelo-de-dominio.md) | Entidades, relaciones, enums y glosario ES→EN |
| [07-modelado-de-datos.md](07-modelado-de-datos.md) | Regla de tipos/tamaños y tablas de referencia (incluye Colombia) |
| [08-arquitectura-y-stack.md](08-arquitectura-y-stack.md) | Stack, estructura `front/` + `back/`, capas, API, frontend, entorno |
| [09-seguridad-y-autenticacion.md](09-seguridad-y-autenticacion.md) | Contraseñas, OTP, JWT, roles y matriz de permisos |
| [10-gestion-del-proyecto.md](10-gestion-del-proyecto.md) | Scrum, roles, backlog, sprints, DoD, cronograma |
| [11-flujo-git.md](11-flujo-git.md) | Git Flow, commits y reglas para el agente |
| [12-decisiones-y-pendientes.md](12-decisiones-y-pendientes.md) | Decisiones de alineación specs ↔ architecture y temas abiertos |
| [13-mensajes-y-experiencia.md](13-mensajes-y-experiencia.md) | Flujos de pantalla por rol y mensajes al usuario |
| [CHANGELOG.md](CHANGELOG.md) | Historial de cambios de `context/` |

## Cuándo se actualiza `context/`

Se actualiza **en el mismo cambio** (misma rama y mismo commit) en que ocurra cualquiera de estos eventos:

- Cambia, se agrega o se elimina una **regla de negocio** (archivo 04 y, si aplica, 02/05/09/13).
- Cambia un **requerimiento**, un caso de uso, un rol o un permiso.
- Cambia el **modelo de datos** (entidades, tipos, tamaños, enums) → 06 y 07.
- Cambia el **stack, la estructura de carpetas o la arquitectura** → 08.
- Cambia el **flujo de Git o la planeación** → 11 / 10.
- Se toma o resuelve una **decisión o pendiente** → 12.

Procedimiento (también disponible como skill `actualizar-context`):

1. Identificar los archivos afectados y actualizarlos manteniendo la **trazabilidad** (NU → RF → HU → CU → RN → entidad).
2. Mantener los IDs estables: no renumerar RF/RN/CU/HU; los eliminados se marcan `(retirado)`, no se reutilizan.
3. Si el cambio mueve algo ya implementado, actualizar o dejar anotada la tarea en el código/migraciones.
4. Registrar una línea en [CHANGELOG.md](CHANGELOG.md).

## Convenciones de estos documentos

- Documentación en **español**; código, tablas, columnas y endpoints en **inglés** (ver glosario en 06).
- Prioridad MoSCoW: **M** debe, **S** debería, **C** podría. `★` = requerimiento nuevo respecto a la versión de escritorio.
- Estado de verificación de datos: ✅ respaldado por fuente oficial · ⚠️ fuente secundaria o contradictoria · 🔧 convención del proyecto.
