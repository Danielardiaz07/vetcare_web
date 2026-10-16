# 13 — Mensajes y experiencia de usuario

Fuente para los textos y flujos de pantalla. La interfaz va en español (RN-61) y es responsiva desde 360 px (RNF-07). Tomado del manual de usuario de `specs.pdf`.

## 1. Acceso

- Requisitos: computador, tableta o celular con internet y Chrome, Edge o Firefox actualizados (últimas dos versiones, RNF-09).
- Los propietarios crean su cuenta; las cuentas del personal las crea el administrador (RN-12).

## 2. Portal del propietario

**Crear cuenta**: en inicio, “Crear cuenta” → cédula, nombres, apellidos, correo, teléfono y contraseña (≥ 8, con mayúscula y número) → marcar aceptación del tratamiento de datos → “Registrarme” → verificar el código enviado al correo (OTP) → correo de bienvenida. Si la clínica ya lo tenía con esa cédula, verá de inmediato a sus mascotas.

**Iniciar y cerrar sesión**: correo y contraseña → “Ingresar”. “¿Olvidaste tu contraseña?” envía un enlace válido 30 min. Para salir: menú del nombre (arriba a la derecha) → “Cerrar sesión”.

**Mis mascotas**: menú lateral → “Mis mascotas”: una tarjeta por mascota con foto, nombre, especie, edad y próxima cita. Al abrir la ficha, tres pestañas: **Datos**, **Historial clínico** y **Vacunas**.

- Historial clínico: línea de tiempo de la más reciente a la más antigua, con filtros (consultas, cirugías, internaciones, exámenes).
- Vacunas (carné): verde = al día · amarillo = vence en los próximos 7 días · rojo = vencida.

**Agendar cita** (asistente de 4 pasos, ≤ 3 min, RNF-06): 1) mascota → 2) tipo de cita (consulta general, vacunación, control, estética) → 3) veterinario o “Cualquiera disponible” y fecha en el calendario (franjas en verde = libres) → 4) franja, motivo y “Confirmar cita”. Se muestra el comprobante, llega un correo y, un día antes, un recordatorio.

**Reprogramar o cancelar**: “Mis citas” → pestaña **Próximas** → “Reprogramar” (nueva fecha y franja) o “Cancelar” (motivo). Solo activo hasta 2 h antes (RN-28).

**Facturas y perfil**: “Mis facturas” (fecha, número, total; “Ver detalle” y “Descargar PDF”). “Mi perfil”: cambiar teléfono, dirección y contraseña; “Registrar mascota”.

## 3. Panel interno

| Rol | Menú | Tareas principales |
|-----|------|--------------------|
| Recepcionista | Agenda · Propietarios · Pacientes · Facturación | Ver la agenda del día por veterinario; crear citas para clientes presenciales o telefónicos; “Registrar llegada” o “No asistió” pasados 15 min; registrar propietarios y mascotas; Facturación > Nueva factura (buscar propietario por cédula) |
| Veterinario | Mi agenda · Pacientes · Atención | Abrir una cita confirmada; revisar historial y vacunas; diligenciar el formulario de atención (síntomas, peso, temperatura, diagnóstico, tratamiento); “+ Medicamento”; registrar vacunas, cirugías, internaciones o exámenes desde las pestañas del formulario; “Guardar atención” |
| Estilista | Mi agenda · Servicios | Abrir la cita de estética y registrar servicio, observaciones y costo |
| Administrador | Usuarios · Personal y horarios · Inventario · Reportes | Crear usuarios y asignar rol; registrar veterinarios y estilistas con sus horarios; gestionar medicamentos y vacunas (stock crítico o por vencer resaltados); tablero de indicadores; anular facturas con motivo |

El calendario de recepción muestra vista diaria y semanal por veterinario con **colores por estado** de cita.

## 4. Mensajes frecuentes

| Mensaje | Causa | Qué hacer |
|---------|-------|-----------|
| “Correo o contraseña incorrectos” | Datos mal escritos | Verificar los datos; tras 5 intentos fallidos esperar 15 min o recuperar la contraseña |
| “El correo ya está registrado” | Registro con un correo existente | Iniciar sesión o recuperar la contraseña |
| “La franja ya no está disponible” | Otra persona reservó esa hora mientras se elegía | Elegir otra de las franjas que muestra el sistema |
| “Esta mascota ya tiene 3 citas activas” | Se alcanzó el límite de citas futuras | Cancelar o esperar a que se atienda una de ellas |
| “Comunícate con la clínica” | Faltan menos de 2 h para la cita | Llamar a recepción para cambiarla |
| “Stock insuficiente de [medicamento]” | No hay unidades suficientes | Cambiar el medicamento o la cantidad, o informar al administrador |
| “Tu sesión expiró” | La sesión terminó (ver D-01) | Iniciar sesión de nuevo |

> Si se agrega o cambia un mensaje de negocio, actualizar esta tabla y la regla RN que lo origina.
