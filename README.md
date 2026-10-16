# VetCare-Web

Sistema web de gestión integral para clínicas veterinarias, con un **portal para propietarios de mascotas**. Es la migración a la web de VetCare (versión de escritorio), desarrollada en la Universidad Popular del Cesar — Ingeniería de Software I (2026-II).

- **Panel interno** por rol: recepción, veterinaria, estética y administración (agenda, atención clínica, inventario, facturación, reportes).
- **Portal del propietario**: mis mascotas, historial clínico, carné de vacunación, facturas y autogestión de citas (agendar, reprogramar, cancelar) con recordatorios por correo.

## Documentación: `context/`

Toda la definición del proyecto vive en [`context/`](context/README.md), que es la **fuente de verdad** (y se actualiza cada vez que cambia una regla de negocio):

| Tema | Archivo |
|------|---------|
| Negocio, actores y necesidades | [01](context/01-negocio.md) |
| Requerimientos funcionales / no funcionales | [02](context/02-requerimientos-funcionales.md) · [03](context/03-requerimientos-no-funcionales.md) |
| **Reglas de negocio** | [04](context/04-reglas-de-negocio.md) |
| Casos de uso | [05](context/05-casos-de-uso.md) |
| Modelo de dominio y datos | [06](context/06-modelo-de-dominio.md) · [07](context/07-modelado-de-datos.md) |
| Arquitectura y stack | [08](context/08-arquitectura-y-stack.md) |
| Seguridad y roles | [09](context/09-seguridad-y-autenticacion.md) |
| Gestión (Scrum, backlog, sprints) | [10](context/10-gestion-del-proyecto.md) |
| Flujo de Git | [11](context/11-flujo-git.md) |
| Decisiones y pendientes | [12](context/12-decisiones-y-pendientes.md) |
| Mensajes y experiencia de usuario | [13](context/13-mensajes-y-experiencia.md) |

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend (`front/`) | Next.js (App Router) + React + TypeScript, Tailwind CSS v4, React Hook Form + Zod |
| Backend (`back/`) | Node.js + Express + TypeScript, Zod, JWT + bcrypt |
| Datos | PostgreSQL en Supabase, acceso solo desde la API con Prisma |
| Servicios | Supabase Storage (imágenes), Brevo (correo) |

Monorepo con `front/` y `back/` en la raíz. Detalle en [`context/08`](context/08-arquitectura-y-stack.md).

## Estado

En fase de definición: el repositorio contiene la documentación (`context/`) y la configuración del agente (`.claude/`, `CLAUDE.md`). El código de `back/` y `front/` aún no se ha creado; el orden de construcción está en [`context/08`](context/08-arquitectura-y-stack.md) §11 y el plan por sprints en [`context/10`](context/10-gestion-del-proyecto.md).

## Cómo se trabaja

- **Git Flow**: ramas `tipo/nombre-en-kebab-case` desde `develop`; nunca se trabaja directo en `main` ni en `develop`; commits convencionales y PR revisado por la otra integrante. Ver [`context/11`](context/11-flujo-git.md).
- **Asistente (Claude Code)**: se rige por `CLAUDE.md`, `.claude/rules/` y `.claude/skills/`. No hace `commit`, `push` ni PR: entrega los comandos al escribir `_git`.
- **Cambios de negocio**: se actualizan en `context/` en el mismo cambio que el código.

## Equipo

Daniela Rojas Díaz (Product Owner, backend) · Kenys Padilla Villareal (Scrum Master, frontend). Docente: Ing. Patricia Álvarez Ortega.
