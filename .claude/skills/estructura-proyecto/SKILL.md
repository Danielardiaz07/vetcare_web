---
name: estructura-proyecto
description: Estructura de VetCare-Web (monorepo con back/ y front/). Úsala al crear o mover archivos, módulos, endpoints, entidades Prisma, páginas o features, para que queden en el lugar y capa correctos según context/08.
---

# estructura-proyecto

Fuente: `context/08-arquitectura-y-stack.md` y `.claude/rules/estructura-proyecto.md`. Antes de crear nada, lee la regla de negocio y el requerimiento en `context/` (04, 02) y verifica la rama con la skill `git-flow`.

## Nuevo módulo de backend (`back/src/modules/<dominio>/`)

1. Define el dominio y sus RF/RN/CU en `context/` (si no existen, actualízalo primero con `actualizar-context`).
2. Crea: `dto/` (schemas Zod + tipos `z.infer`: `XRequestDto`, `XResponseDto`), `<x>.repository.ts` (único acceso a Prisma), `<x>.service.ts` (reglas `RN-xx`, transacciones, sin `req`/`res`), `<x>.controller.ts` (HTTP ↔ servicio), `<x>.routes.ts` (verbo + path + middlewares: rate limit, `authenticate`, `authorize(roles)`, `validate(schema)`).
3. Registra las rutas en `back/src/routes/v1/index.ts` y compón dependencias en `app.ts` (inyección por constructor, dependencias externas tras interfaces).
4. Si hay entidades nuevas: modelo en `back/prisma/schema.prisma` con tipos/tamaños justificados (regla `modelado-datos`) y migración con `prisma migrate`.
5. Documenta los endpoints en OpenAPI/Swagger.
6. Refleja entidades/endpoints nuevos en `context/06` y `context/08 §4.6`.

## Nueva funcionalidad de frontend (`front/src/`)

1. Rutas en `app/` (Server Component por defecto; `'use client'` solo con interactividad). Portal del propietario y panel interno por rol; protegidas con `middleware.ts`.
2. Lógica en `features/<dominio>/{components,hooks,schemas}`; schemas Zod con los mismos límites que el DTO del backend.
3. Llamadas HTTP solo vía `services/` (cliente tipado, maneja 401 → refresh). Componentes compartidos en `components/`.
4. Estilos con Tailwind CSS v4, mobile-first (≥ 360 px), textos en español (`context/13`).

## Checklist antes de dar por terminado

- [ ] Cada regla `RN-xx` tocada está implementada en el Service (y el DTO si es de formato).
- [ ] Tipo/tamaño coinciden en columna, DTO y formulario.
- [ ] Ninguna librería fuera del stack de `context/08`.
- [ ] `context/` actualizado y línea en `context/CHANGELOG.md`.
- [ ] Sin archivos de test, sin `.env` versionado.
