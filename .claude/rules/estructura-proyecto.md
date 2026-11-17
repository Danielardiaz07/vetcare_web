# Estructura del proyecto

Fuente: `context/08-arquitectura-y-stack.md`. Monorepo con **`back/`** y **`front/`** en la raíz (no `apps/`), más `packages/shared` opcional.

## Backend (`back/`)

```
back/
├── prisma/{schema.prisma, migrations/}
└── src/
    ├── config/        # env (Zod), cors, rate-limit, logger
    ├── shared/        # errors, middlewares, providers (interfaces + impl), types, utils
    ├── modules/<dominio>/{dto/, <x>.controller.ts, <x>.service.ts, <x>.repository.ts, <x>.routes.ts}
    ├── routes/v1/index.ts   # agrega módulos bajo /api/v1
    ├── app.ts         # composition root (inyección por constructor)
    └── server.ts
```

- Capas: **Route → Controller → Service → Repository → Prisma**. Controller no toca Prisma; Service no conoce `req`/`res` y concentra las reglas `RN-xx` y las transacciones; solo el Repository usa Prisma; los DTO no tienen lógica.
- Un módulo por dominio (`auth`, `users`, `owners`, `patients`, `staff`, `appointments`, `clinical`, `grooming`, `inventory`, `invoices`, `notifications`, `reports`, `uploads`).
- Dependencias externas (correo, storage, hash, tokens) detrás de interfaces (`IMailProvider`, `IStorageProvider`, `IHasher`, `ITokenService`).
- Versionado por URL `/api/v1`; errores con jerarquía `AppError` y un único error handler; DTO con Zod y tipos con `z.infer`.

## Frontend (`front/`)

```
front/src/
├── app/         # App Router (rutas, layouts)
├── components/  # UI reutilizable
├── features/<dominio>/{components, hooks, schemas}
├── services/    # único cliente HTTP hacia la API (maneja 401 → refresh)
├── hooks/  lib/  types/
```

- Server Components por defecto; Client Components solo con interactividad.
- Formularios: React Hook Form + Zod. Estilos: Tailwind CSS v4. Rutas protegidas con `proxy.ts` (Next 16 renombró `middleware.ts`).
- Variables públicas solo con prefijo `NEXT_PUBLIC_`.

## Convenciones

- Código, tablas, columnas, endpoints y nombres de archivo en **inglés**; docs y textos de UI en **español**. Glosario ES→EN en `context/06-modelo-de-dominio.md`.
- TypeScript `strict: true`; alias `@/`; sin números ni strings mágicos (constantes/enums, p. ej. `MIN_APPOINTMENT_LEAD_HOURS`).
- Sin comentarios que expliquen *qué*; solo *por qué* cuando no es obvio.
- Nunca versionar `.env`; mantener `.env.example`. `SUPABASE_SERVICE_ROLE_KEY` solo en el backend.
- No agregues dependencias fuera del stack de `context/08` sin registrar la decisión en `context/12`.
- Sin pruebas automatizadas (decisión del proyecto): no crees archivos de test.
