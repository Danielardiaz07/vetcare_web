# 02 — Requerimientos funcionales

24 RF en 8 módulos. Prioridad MoSCoW: **M** debe · **S** debería · **C** podría. `★` = nuevo frente a la versión de escritorio. Las reglas numéricas y de validación viven en [04-reglas-de-negocio.md](04-reglas-de-negocio.md) (RN-xx); aquí se referencian.

## 1. Catálogo

| ID | Módulo | Nombre | Descripción | Actor(es) | Prio |
|----|--------|--------|-------------|-----------|------|
| RF-01 ★ | Seguridad | Registrar cuenta de propietario | Crea su cuenta con cédula, nombres, correo, teléfono y contraseña; si la cédula ya existe en la clínica, la cuenta se vincula a ese registro | Propietario | M |
| RF-02 | Seguridad | Iniciar y cerrar sesión | Autenticación con correo y contraseña; redirige al portal o al panel según el rol | Todos | M |
| RF-03 ★ | Seguridad | Recuperar contraseña | Enlace de restablecimiento al correo registrado, válido 30 min | Todos | S |
| RF-04 | Seguridad | Gestionar usuarios del personal | Crear, editar, activar/desactivar usuarios y asignar rol (Administrador, Recepcionista, Veterinario, Estilista) | Administrador | M |
| RF-05 | Gestión | Gestionar propietarios | Registrar, consultar, actualizar y desactivar propietarios | Recepcionista, Administrador | M |
| RF-06 | Gestión | Gestionar pacientes | Registrar, consultar, actualizar y desactivar mascotas (especie, raza, sexo, peso, fecha de nacimiento, foto) asociadas a un propietario | Recepcionista, Veterinario | M |
| RF-07 | Gestión | Gestionar personal y horarios | Registrar veterinarios (especialidad) y estilistas; definir horarios de atención y duración de cada tipo de cita | Administrador | M |
| RF-08 ★ | Portal | Consultar mis mascotas | Lista y ficha de cada mascota (edad calculada, peso, especie, raza, próxima cita) | Propietario | M |
| RF-09 ★ | Portal | Consultar historial clínico | Línea de tiempo de consultas, cirugías, internaciones y exámenes, con diagnóstico y tratamiento | Propietario | M |
| RF-10 ★ | Portal | Consultar carné de vacunación | Vacunas aplicadas, fecha, lote, próxima dosis y estado (al día, próxima a vencer, vencida) | Propietario | M |
| RF-11 ★ | Portal | Agendar cita en línea | Mascota, tipo de cita, veterinario (opcional), fecha y franja disponible; el sistema valida disponibilidad y confirma | Propietario | M |
| RF-12 ★ | Portal | Reprogramar o cancelar cita | Cambio de fecha/franja o cancelación con motivo, hasta 2 h antes | Propietario | M |
| RF-13 ★ | Portal | Consultar mis citas | Citas próximas y pasadas con estado (programada, confirmada, atendida, cancelada, no asistió) | Propietario | M |
| RF-14 ★ | Portal | Consultar facturas | Lista de facturas con detalle y descarga en PDF | Propietario | S |
| RF-15 ★ | Portal | Gestionar mi perfil | Actualizar contacto y contraseña; registrar una nueva mascota | Propietario | S |
| RF-16 | Agenda | Gestionar agenda | Ver agenda por día y veterinario; crear citas para clientes presenciales/telefónicos; registrar llegada; marcar inasistencia; reasignar veterinario | Recepcionista | M |
| RF-17 ★ | Agenda | Enviar notificaciones | Correos de confirmación, cambio y cancelación de cita; recordatorio 24 h antes; aviso de vacuna próxima a vencer (7 días) | Sistema, Servidor de correo | S |
| RF-18 | Clínico | Registrar consulta | A partir de una cita: síntomas, peso, temperatura, diagnóstico, tratamiento, fórmula de medicamentos y costo | Veterinario | M |
| RF-19 | Clínico | Registrar vacunación | Vacuna aplicada, lote, fecha y fecha de próxima dosis; descuenta stock de la vacuna | Veterinario | M |
| RF-20 | Clínico | Registrar cirugía, internación y examen de laboratorio | Procedimientos, ingreso/egreso de internación y resultados de exámenes del paciente | Veterinario | S |
| RF-21 | Estética | Registrar servicio estético | Baño, corte o peluquería realizados por un estilista, con observaciones y costo | Estilista | C |
| RF-22 | Inventario | Gestionar medicamentos y vacunas | CRUD con stock, precio y vencimiento; alerta de stock crítico y productos por vencer | Administrador | S |
| RF-23 | Facturación | Generar factura | Factura de un propietario con detalle de consultas, servicios y medicamentos; subtotal, IVA y total; método de pago | Recepcionista | M |
| RF-24 | Reportes | Consultar reportes e indicadores | Tablero: citas por estado, inasistencias, servicios más solicitados, ingresos por periodo | Administrador | C |

## 2. Especificación detallada de los RF principales

Flujo central: **cuenta → cita → atención → factura**.

### RF-01 Registrar cuenta de propietario

- **Entradas**: cédula (6–10 dígitos, obligatoria), nombres y apellidos (obligatorios), correo (formato válido, único), teléfono (10 dígitos), dirección (opcional), contraseña y confirmación, aceptación del tratamiento de datos.
- **Reglas**: RN-01 a RN-06, RN-60.
- **Salida**: cuenta con rol PROPIETARIO y correo de bienvenida. La activación pasa por verificación OTP (ver [09](09-seguridad-y-autenticacion.md)).
- **Aceptación**: (1) con datos válidos la cuenta queda activa y puede iniciar sesión; (2) con correo duplicado: “El correo ya está registrado” y no se crea; (3) las mascotas de una cédula existente aparecen en el portal tras el registro.

### RF-02 Iniciar y cerrar sesión

- **Entradas**: correo y contraseña.
- **Reglas**: RN-07 a RN-10.
- **Salida**: acceso al portal o al panel según el rol; menú con las opciones permitidas.
- **Aceptación**: (1) credenciales válidas → redirección por rol en < 2 s; (2) inválidas → mensaje genérico sin revelar cuál dato falló; (3) “Cerrar sesión” invalida la sesión y vuelve al inicio.

### RF-09 Consultar historial clínico

- **Entradas**: mascota seleccionada; filtros opcionales por tipo de atención y rango de fechas.
- **Reglas**: RN-40 a RN-42.
- **Salida**: línea de tiempo con fecha, tipo, veterinario, diagnóstico y tratamiento.
- **Aceptación**: (1) acceder al historial de una mascota ajena → **403**; (2) una consulta registrada por el veterinario aparece de inmediato en el portal.

### RF-11 Agendar cita en línea

- **Entradas**: mascota, tipo de cita (consulta general, vacunación, control, estética), veterinario o “cualquiera disponible”, fecha y franja, motivo.
- **Reglas**: RN-20 a RN-27.
- **Salida**: cita registrada, comprobante en pantalla y correo de confirmación.
- **Aceptación**: (1) si dos propietarios eligen la misma franja, el segundo recibe “La franja ya no está disponible” y se le ofrecen otras; (2) la cita aparece en la agenda de recepción y del veterinario; (3) el correo llega en < 1 min.

### RF-12 Reprogramar o cancelar cita

- **Entradas**: cita seleccionada; nueva fecha/franja (reprogramar) o motivo (cancelar).
- **Reglas**: RN-28 a RN-30.
- **Salida**: cita actualizada y correo de notificación.
- **Aceptación**: (1) a menos de 2 h, los botones aparecen deshabilitados con “Comunícate con la clínica”; (2) la franja liberada vuelve a estar disponible.

### RF-16 Gestionar agenda

- **Entradas**: fecha, veterinario; datos de la cita para clientes presenciales/telefónicos.
- **Reglas**: mismas validaciones de RF-11 (RN-20 a RN-27) y RN-31, RN-32.
- **Salida**: calendario diario y semanal por veterinario con colores por estado.
- **Aceptación**: (1) no se pueden guardar dos citas del mismo veterinario en la misma franja; (2) los cambios se reflejan en el portal del propietario.

### RF-18 Registrar consulta

- **Entradas**: cita CONFIRMADA; síntomas, peso (kg), temperatura (°C), diagnóstico, tratamiento, medicamentos formulados con cantidad, costo.
- **Reglas**: RN-43 a RN-47.
- **Salida**: consulta en el historial y concepto pendiente de facturar.
- **Aceptación**: (1) medicamento sin stock suficiente → advertencia y no se entrega; (2) la consulta aparece en el historial del portal (RF-09).

### RF-23 Generar factura

- **Entradas**: propietario, paciente, conceptos pendientes (consultas, servicios, medicamentos), método de pago (efectivo, tarjeta, transferencia).
- **Reglas**: RN-70 a RN-76.
- **Salida**: factura numerada, PDF descargable y visible en el portal (RF-14).
- **Aceptación**: (1) subtotal, IVA y total coinciden con la suma del detalle; (2) la factura queda disponible para el propietario de inmediato.

## 3. Trazabilidad RF → HU → CU

| RF | HU | CU | Sprint |
|----|----|----|--------|
| RF-01 | HU-01 | CU-01 | 1 |
| RF-02 | HU-02 | CU-02, CU-03 | 1 |
| RF-03 | HU-21 | CU-04 | 6 |
| RF-04 | HU-03 | CU-05 | 1 |
| RF-05 | HU-04 | CU-16 | 2 |
| RF-06 | HU-05 | CU-17 | 2 |
| RF-07 | HU-06 | CU-18 | 2 |
| RF-08 | HU-07 | CU-06 | 2 |
| RF-09 | HU-14 | CU-07 | 4 |
| RF-10 | HU-15 | CU-08 | 4 |
| RF-11 | HU-08 | CU-09, CU-10 | 3 |
| RF-12 | HU-09 | CU-11, CU-12 | 3 |
| RF-13 | HU-10 | CU-13 | 3 |
| RF-14 | HU-17 | CU-14 | 5 |
| RF-15 | HU-22 | CU-15 | 6 |
| RF-16 | HU-11 | CU-19, CU-10 | 3 |
| RF-17 | HU-19 | CU-20 | 5 |
| RF-18 | HU-12 | CU-21 | 4 |
| RF-19 | HU-13 | CU-22 | 4 |
| RF-20 | HU-20 | CU-23, CU-24, CU-25 | 6 |
| RF-21 | HU-23 | CU-26 | 6 |
| RF-22 | HU-18 | CU-27 | 5 |
| RF-23 | HU-16 | CU-28 | 5 |
| RF-24 | HU-24 | CU-29 | 6 |
