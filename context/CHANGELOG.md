# Changelog de context/

Una línea por cambio, la más reciente arriba. Formato: `AAAA-MM-DD · archivos · qué cambió y por qué (IDs afectados)`.

- 2026-10-16 · 10, 02, 08, 12 · Cierre del Sprint 0 y replanificación: 3 sprints (19 oct – 23 nov) con las historias Must HU-01 a HU-16 (84 pts); HU-17 a HU-24 pasan a Reserva; se actualizan la trazabilidad de 02 §3, la nota de 08 §3, el riesgo R-03 y la decisión D-16; P-09 y P-10 retirados.
- 2026-10-16 · 08, 12 · Se crea la base del frontend (Next 16, Tailwind v4, cliente HTTP con refresh); rutas protegidas con `proxy.ts` en lugar de `middleware.ts` y se añade `@hookform/resolvers` (D-15).
- 2026-10-16 · 09, 12 · Se implementa el modelo base de autenticación en `schema.prisma` (`User`, `Owner`, `OtpCode`, `RefreshToken`, `PasswordResetToken`; bloqueo RN-08, recuperación RN-11, vínculo RN-04); se fija Prisma 6.x (D-14).
- 2026-10-16 · 08 · Se crea el esqueleto básico del monorepo (`back/`, `front/`, `packages/shared`); se actualiza la nota del estado del repositorio.
- 2026-10-16 · README, 08, 12 · Se eliminan `ARCHITECTURE.md` y `specs.pdf` del repositorio; `context/` queda como única fuente de verdad (D-13, P-11 retirado).
- 2026-10-16 · 08 · Se restituyen la tabla GRASP completa y la nota sobre el scaffold de Vite de `ARCHITECTURE.md`.
- 2026-10-16 · todos · Creación de `context/` consolidando `ARCHITECTURE.md` y `specs.pdf`. Stack únicamente el de `ARCHITECTURE.md`; estructura `front/` + `back/`; Tailwind CSS v4; alineaciones D-01 a D-12 registradas en [12](12-decisiones-y-pendientes.md).
