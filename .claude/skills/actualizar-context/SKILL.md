---
name: actualizar-context
description: Mantiene context/ al día. Úsala cada vez que cambie o se agregue una regla de negocio, requerimiento, caso de uso, rol/permiso, entidad del modelo, stack, estructura, flujo de Git o decisión; y al cerrar una tarea para verificar que el código y context/ coinciden.
---

# actualizar-context

`context/` es la fuente de verdad del proyecto. Este es el procedimiento para cambiarla sin perder la trazabilidad. Detalle de política en `context/README.md`.

## 1. Ubicar qué archivos toca el cambio

| Cambio | Archivos |
|--------|----------|
| Regla de negocio | `04` (+ `02` si cambia un criterio, `05` si cambia un flujo, `13` si cambia un mensaje, `09` si es de seguridad/permisos) |
| Requerimiento funcional / HU / CU | `02`, `05`, `10` (backlog) |
| Requerimiento no funcional | `03` |
| Entidad, tipo, tamaño, enum | `06`, `07` (+ `09 §8` si es de autenticación) |
| Stack, carpetas, capas, API | `08` |
| Rol o permiso | `09 §6`, `04` |
| Planeación / sprints | `10` |
| Git | `11` y las reglas de `.claude/` |
| Decisión o pendiente | `12` |
| Negocio, actores, objetivos | `01` |

## 2. Reglas de edición

- **IDs estables**: no renumeres ni reutilices `RF-`, `RN-`, `CU-`, `HU-`, `NU-`, `RNF-`, `D-`, `P-`. Lo eliminado queda como `(retirado)` con el motivo.
- Una regla nueva usa el siguiente número libre de su rango (cuentas 01–13, datos 14–19, citas 20–34, notificaciones 35–39, clínico 40–52, inventario 55–57, datos personales 60–61, facturación 70–76, reportes 80).
- Mantén la **trazabilidad**: NU → RF → HU → CU → RN → entidad. Si una regla cita un RF, el RF debe citarla de vuelta (02 ↔ 04).
- Mantén los números y mensajes literales idénticos en todos los archivos donde aparezcan (p. ej. “2 horas”, “3 citas”, “15 minutos”).
- Si el cambio resuelve un pendiente `P-xx` o toma una decisión, muévelo a Decisiones en `12` con fecha y marca qué archivos cambió.
- Si el cambio altera algo ya implementado, deja la tarea de código correspondiente (o hazla en el mismo cambio).
- No metas en `context/` tecnología fuera del stack de `08` sin registrarla como decisión.

## 3. Registro

Añade una línea arriba en `context/CHANGELOG.md`:

```
AAAA-MM-DD · archivos · qué cambió y por qué (IDs afectados)
```

## 4. Verificación al cerrar una tarea

- [ ] Lo implementado coincide con `context/` (reglas, nombres, límites, mensajes).
- [ ] Los límites de longitud coinciden en columna, DTO y formulario.
- [ ] Los enlaces entre archivos de `context/` siguen vigentes.
- [ ] El cambio de `context/` va en la misma rama y commit que el código que lo motivó (rama `docs/*` si solo cambia documentación).
