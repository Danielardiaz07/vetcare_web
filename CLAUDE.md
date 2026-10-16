# VetCare-Web

Sistema web de gestión para clínicas veterinarias con portal del propietario. Monorepo con `back/` (Express + Prisma + Supabase) y `front/` (Next.js).

## Fuente de verdad: `context/`

**Todo se rige por `context/`.** Antes de planear, escribir o revisar código, lee `context/README.md` y los archivos que apliquen:

- Reglas de negocio (`RN-xx`) → `context/04-reglas-de-negocio.md`
- Requerimientos / casos de uso → `02`, `03`, `05`
- Entidades y datos → `06`, `07`
- Stack, carpetas y capas → `08`; seguridad y roles → `09`
- Planeación → `10`; Git → `11`; decisiones y pendientes → `12`

Si el código contradice `context/`, no sigas: corrige uno de los dos. **Cada vez que cambie una regla de negocio, requerimiento, modelo, stack o flujo, actualiza `context/` en el mismo cambio** (y `context/CHANGELOG.md`). Usa la skill `actualizar-context`.

`context/` es la única fuente de verdad (los documentos de origen `ARCHITECTURE.md` y `specs.pdf` ya no existen). El stack es solo el de `context/08-arquitectura-y-stack.md`.

## Reglas y skills

Reglas en `.claude/rules/` (siempre vigentes):

- `context-fuente-de-verdad.md` — cómo usar y mantener `context/`.
- `git-flujo.md` — Git Flow, ramas, commits; el agente nunca hace commit/push/PR.
- `estructura-proyecto.md` — dónde va cada archivo en `back/` y `front/`.
- `modelado-datos.md` — tipos y tamaños justificados (BD, DTO y formulario coinciden).

Skills en `.claude/skills/`: `git-flow` (se activa con `_git`), `estructura-proyecto`, `actualizar-context`.

## Idioma

Documentación y mensajes al usuario en español; código, tablas, columnas y endpoints en inglés.
