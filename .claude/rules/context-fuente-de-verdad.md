# `context/` es la fuente de verdad

Todo el trabajo del proyecto (código, migraciones, API, UI, documentación) se rige por la carpeta `context/`.

## Antes de trabajar

1. Lee `context/README.md` y los archivos de `context/` relacionados con la tarea (reglas `RN-xx`, requerimientos `RF-xx`, modelo, arquitectura, seguridad).
2. Cita el ID (`RF-11`, `RN-24`, `CU-09`, `HU-08`) de lo que implementas, en el commit/PR cuando aporte.
3. Si la tarea contradice `context/`, **detente y señálalo**: o se corrige el pedido/código, o se actualiza `context/` primero. No dejes la contradicción.
4. Si falta información (un pendiente `P-xx` en `context/12-decisiones-y-pendientes.md`), no inventes: pregunta o registra el supuesto.

## Qué manda

- `context/` es la **única fuente de verdad**. `ARCHITECTURE.md` y `specs.pdf` fueron eliminados (D-13); si aparecen mencionados, es solo procedencia.
- El stack es **únicamente** el de `context/08-arquitectura-y-stack.md`. No agregues librerías o servicios que no estén ahí sin una decisión registrada en `context/12-decisiones-y-pendientes.md`.

## Mantener `context/` actualizado (obligatorio)

Actualiza `context/` **en el mismo cambio** cuando:

- se cambia, agrega o elimina una regla de negocio, requerimiento, caso de uso, rol o permiso;
- cambia el modelo de datos (entidades, tipos, tamaños, enums);
- cambia el stack, la estructura de carpetas o la arquitectura;
- cambia el flujo de Git o la planeación;
- se toma o resuelve una decisión/pendiente.

Cómo: ver la skill `actualizar-context`. Resumen: edita los archivos afectados manteniendo la trazabilidad, **no renumeres ni reutilices IDs** (los retirados se marcan `(retirado)`), y añade una línea a `context/CHANGELOG.md`.

Al terminar una tarea, verifica que lo implementado y `context/` coinciden. Si cambió algo de negocio y no se tocó `context/`, la tarea no está terminada.
