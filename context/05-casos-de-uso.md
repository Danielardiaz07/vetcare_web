# 05 — Casos de uso

29 casos de uso en los 8 módulos, con 7 actores humanos y 2 de sistema (ver actores en [01](01-negocio.md)). Cada CU se traza a un RF ([02](02-requerimientos-funcionales.md)).

Módulos: M1 Seguridad y acceso · M2 Portal del propietario · M3 Gestión · M4 Agenda y notificaciones · M5 Atención clínica · M6 Estética · M7 Inventario · M8 Facturación y reportes.

## Catálogo y trazabilidad

| CU | Nombre | Actor principal | RF |
|----|--------|-----------------|----|
| CU-01 | Registrar cuenta | Propietario | RF-01 |
| CU-02 | Iniciar sesión | Usuario | RF-02 |
| CU-03 | Cerrar sesión | Usuario | RF-02 |
| CU-04 | Recuperar contraseña | Usuario | RF-03 |
| CU-05 | Gestionar usuarios del personal | Administrador | RF-04 |
| CU-06 | Consultar mis mascotas | Propietario | RF-08 |
| CU-07 | Consultar historial clínico | Propietario | RF-09 |
| CU-08 | Consultar carné de vacunación | Propietario | RF-10 |
| CU-09 | Agendar cita en línea | Propietario | RF-11 |
| CU-10 | Validar disponibilidad | (incluido) | RF-11, RF-16 |
| CU-11 | Reprogramar cita | Propietario | RF-12 |
| CU-12 | Cancelar cita | Propietario | RF-12 |
| CU-13 | Consultar mis citas | Propietario | RF-13 |
| CU-14 | Consultar facturas | Propietario | RF-14 |
| CU-15 | Gestionar mi perfil | Propietario | RF-15 |
| CU-16 | Gestionar propietarios | Recepcionista | RF-05 |
| CU-17 | Gestionar pacientes | Recepcionista | RF-06 |
| CU-18 | Gestionar personal y horarios | Administrador | RF-07 |
| CU-19 | Gestionar agenda | Recepcionista | RF-16 |
| CU-20 | Enviar notificaciones | Reloj del sistema | RF-17 |
| CU-21 | Registrar consulta | Veterinario | RF-18 |
| CU-22 | Registrar vacunación | Veterinario | RF-19 |
| CU-23 | Registrar cirugía | Veterinario | RF-20 |
| CU-24 | Registrar internación | Veterinario | RF-20 |
| CU-25 | Registrar examen de laboratorio | Veterinario | RF-20 |
| CU-26 | Registrar servicio estético | Estilista | RF-21 |
| CU-27 | Gestionar inventario | Administrador | RF-22 |
| CU-28 | Generar factura | Recepcionista | RF-23 |
| CU-29 | Consultar reportes e indicadores | Administrador | RF-24 |

## Especificación de los CU principales

### CU-02 Iniciar sesión

- **Actor**: Usuario (Propietario, Recepcionista, Veterinario, Estilista, Administrador). **Precondición**: cuenta activa.
- **Flujo básico**: 1) abre VetCare y elige “Iniciar sesión”; 2) ingresa correo y contraseña; 3) el sistema valida credenciales (*include* Validar credenciales); 4) genera la sesión (tokens); 5) redirige al portal o panel según el rol.
- **Alternos**: 3a) credenciales inválidas → mensaje genérico y suma un intento fallido; 3b) quinto intento fallido → bloqueo de 15 min (*extend*); 3c) cuenta inactiva → informa que contacte a la clínica.
- **Postcondición**: sesión iniciada. **Trazabilidad**: RF-02 · RNF-01, RNF-02 · RN-07 a RN-10.

### CU-09 Agendar cita en línea

- **Actor**: Propietario; secundario: Servidor de correo. **Precondición**: sesión como propietario con al menos una mascota.
- **Flujo básico**: 1) elige “Agendar cita”; 2) selecciona mascota y tipo de cita; 3) selecciona veterinario o “cualquiera disponible” y fecha; 4) el sistema calcula y muestra franjas libres (*include* CU-10); 5) elige franja y escribe el motivo; 6) confirma; 7) el sistema valida reglas y registra la cita `PROGRAMADA`; 8) muestra comprobante y envía el correo de confirmación; 9) programa el recordatorio de 24 h.
- **Alternos**: 4a) sin franjas ese día → sugiere las tres fechas más cercanas; 7a) otra persona tomó la franja → informa y vuelve al paso 4; 7b) la mascota ya tiene 3 citas activas o la cita es a menos de 2 h → muestra el motivo y no registra; 8a) falla el correo → la cita se conserva y el envío se reintenta.
- **Postcondición**: cita registrada, franja ocupada, visible en la agenda de recepción y del veterinario. **Trazabilidad**: RF-11, RF-17 · RNF-06, RNF-11 · RN-20 a RN-27, RN-33, RN-35, RN-36, RN-38.

### CU-11 / CU-12 Reprogramar o cancelar cita

- **Actor**: Propietario. **Precondición**: cita `PROGRAMADA` o `CONFIRMADA` a más de 2 h de su inicio.
- **Flujo básico**: 1) abre “Mis citas”; 2) elige una cita próxima; 3) elige “Reprogramar”; 4) el sistema muestra franjas libres (*include* CU-10); 5) elige la nueva franja y confirma; 6) el sistema actualiza la cita, libera la franja anterior y envía correo.
- **Alternos**: 3a) “Cancelar”: escribe motivo, confirma, estado `CANCELADA`, libera franja y envía correo; 2a) faltan menos de 2 h → opciones deshabilitadas con “Comunícate con la clínica”.
- **Trazabilidad**: RF-12, RF-17 · RN-28 a RN-30, RN-35.

### CU-21 Registrar consulta

- **Actor**: Veterinario. **Precondición**: sesión como veterinario; cita `CONFIRMADA` asignada a él.
- **Flujo básico**: 1) abre su agenda y elige la cita; 2) el sistema muestra historial y carné del paciente (*include*); 3) registra síntomas, peso, temperatura, diagnóstico y tratamiento; 4) guarda; 5) el sistema guarda la consulta, actualiza el peso del paciente, pasa la cita a `ATENDIDA` y deja la consulta pendiente de facturar.
- **Alternos**: 3a) formula medicamentos (*extend*): agrega medicamentos y cantidades, el sistema valida y descuenta stock; 3b) stock insuficiente → advierte y no permite entregar; 3c) aplica vacuna → continúa en CU-22; si la cita es de vacunación y no hubo consulta, CU-22 recibe la cita y la pasa a `ATENDIDA` en la misma transacción (RN-53).
- **Postcondición**: consulta en el historial, visible en el portal. **Trazabilidad**: RF-18, RF-19 · RNF-11 · RN-43 a RN-48.

### CU-28 Generar factura

- **Actor**: Recepcionista. **Precondición**: sesión como recepcionista; el propietario tiene conceptos pendientes o compra productos.
- **Flujo básico**: 1) busca al propietario por cédula; 2) el sistema lista los conceptos pendientes (*include*); 3) selecciona conceptos y agrega productos; 4) el sistema calcula subtotal, IVA y total (*include*); 5) elige método de pago y confirma; 6) el sistema registra factura y detalle, marca los conceptos como facturados y genera el PDF (*include*).
- **Alternos**: 2a) sin pendientes → informa y permite venta directa; 6a) error al guardar → la transacción se revierte y no queda factura parcial; *extend* Anular factura: solo el Administrador, con motivo.
- **Postcondición**: factura `PAGADA`, PDF disponible en el panel y en el portal. **Trazabilidad**: RF-23, RF-14 · RNF-11 · RN-70 a RN-76.

## Flujos de actividad que cubre el sistema

1. **Agendar cita en línea** (CU-09): propietario → sistema (disponibilidad) → correo.
2. **Atención clínica de una cita** (CU-19, CU-21, CU-22): recepción registra llegada → veterinario atiende, formula y vacuna → concepto pendiente de facturar.
3. **Generar factura** (CU-28): recepción selecciona conceptos → cálculo de IVA → pago → PDF.

Cadena de dominio: **sin propietario no hay paciente, sin paciente no hay cita, sin cita no hay consulta y sin consulta no hay factura**.
