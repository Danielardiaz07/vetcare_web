---
paths:
  - "back/prisma/**"
  - "back/src/**/dto/**"
  - "front/src/features/**/schemas/**"
---

# Modelado de datos

Fuente: `context/07-modelado-de-datos.md` y entidades en `context/06-modelo-de-dominio.md`.

- Todo atributo lleva **tipo y tamaño justificados** (sin `VARCHAR(255)` por defecto). Comenta el porqué en el schema o añádelo a las tablas de `context/07`.
- UUID nativo para ids (`@db.Uuid`); `TIMESTAMPTZ` para fechas con hora; `DECIMAL(p,s)` para dinero (COP: `DECIMAL(12,2)`); nunca `FLOAT`.
- En PostgreSQL no uses `CHAR(n)`; usa `VARCHAR(n)`. El tipo más pequeño que cubra el rango (`SMALLINT`, `BOOLEAN`, enum).
- Identificadores numéricos colombianos (cédula, DANE, código postal) como `VARCHAR`, nunca entero.
- Atómico (1FN) y hasta 3FN: sin listas en una columna ni catálogos repetidos como texto.
- Nulabilidad, `UNIQUE`, `DEFAULT` e índices explícitos y solo donde las consultas lo justifiquen.
- **El límite vive en tres capas y debe coincidir**: columna (`@db.*`), DTO Zod (`.max()`) y `maxLength` del formulario.
- Las reglas `RN-xx` de validación (p. ej. cédula 6–10 dígitos, contraseña 8–72) se implementan en el DTO y/o Service con la misma constante en las tres capas.
- Si cambias una entidad, un tipo o un tamaño, actualiza `context/06` o `context/07` en el mismo cambio.
