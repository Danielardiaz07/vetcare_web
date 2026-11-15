# 13 — Mensajes y experiencia de usuario

Fuente para los textos y flujos de pantalla. La interfaz va en español (RN-61) y es responsiva desde 360 px (RNF-07). Tomado del manual de usuario de `specs.pdf`.

## 1. Acceso

- Requisitos: computador, tableta o celular con internet y Chrome, Edge o Firefox actualizados (últimas dos versiones, RNF-09).
- Los propietarios crean su cuenta; las cuentas del personal las crea el administrador (RN-12).

## 2. Portal del propietario

**Crear cuenta**: en inicio, “Crear cuenta” → cédula, nombres, apellidos, correo, teléfono y contraseña (≥ 8, con mayúscula y número) → marcar aceptación del tratamiento de datos → “Registrarme” → verificar el código enviado al correo (OTP) → correo de bienvenida. Si la clínica ya lo tenía con esa cédula, verá de inmediato a sus mascotas.

**Iniciar y cerrar sesión**: correo y contraseña → “Ingresar”. “¿Olvidaste tu contraseña?” envía un enlace válido 30 min. Para salir: ícono de salida en la barra superior derecha, identificado como “Cerrar sesión” para lectores de pantalla y al pasar el cursor. El mismo control se usa en los paneles de recepción, veterinario, estilista y administrador.

**Menú del portal**: Inicio · Mis citas · Agendar · Historial clínico · Facturas · Mi perfil. En escritorio, las opciones se agrupan en una tarjeta blanca con borde fino y 12 px de espacio interior; “Agendar cita” aparece fuera, 16 px debajo, con el mismo ancho de la tarjeta, 44 px de alto y radio de 16 px, fondo petróleo, borde blanco, calendario petróleo sobre un recuadro blanco y flecha blanca a la derecha (variante 3A invertida); el activo se destaca en azul claro con texto petróleo semibold. “Cerrar sesión” está en la barra superior.

**Inicio**: saludo con el nombre del propietario, la próxima cita y “Tus mascotas” (una tarjeta por mascota con acceso a su historial). Las mascotas se ven en Inicio y en Mi perfil; no tienen entrada propia en el menú.

**Recordatorios** (D-48): agrupa los avisos de vacunas vencidas o por vencer, con mascota, vacuna, fecha y enlace “Agendar vacunación”; conserva los colores de alerta.

**Historial clínico**: se elige la mascota y se ve su ficha con 7 pestañas: **Consultas**, **Internaciones**, **Vacunaciones**, **Medicaciones**, **Cirugías**, **Estética** y **Laboratorio**, de lo más reciente a lo más antiguo.

- Vacunas (carné): verde = al día · amarillo = vence en los próximos 7 días · rojo = vencida.

**Agendar cita** (asistente de 4 pasos, ≤ 3 min, RNF-06, D-49): 1) mascota → 2) tipo de cita (consulta general, vacunación, control, estética) → 3) profesional (veterinario o estilista según el tipo de cita) o “Cualquiera disponible” → 4) fecha y hora: la fecha elegida y un calendario mensual compacto siempre visible debajo, que ocupa su propio espacio y permanece visible al elegir un día; al elegir el día se muestran todas sus horas disponibles al lado, debajo en móvil. Al entrar queda seleccionada la fecha actual de Colombia y se consultan sus horarios; si no quedan horas válidas se muestra el aviso. Cambiar de día limpia la hora anterior. Un día sin cupos muestra únicamente “Sin horarios disponibles”, sin enlaces a otros días (RN-33); luego la revisión con el motivo y “Confirmar cita”. Se muestra el comprobante, llega un correo y, un día antes, un recordatorio.

**Cuenta en la landing**: con sesión iniciada, “Mi portal” lleva directamente al portal del propietario o al panel del personal según el rol. A su lado, un ícono de salida muestra “Cerrar sesión” al pasar el cursor y permite salir con un clic. En móvil, “Mi portal” y “Cerrar sesión” aparecen con sus nombres completos dentro del menú principal.

**Ventana de sesión**: cuando una acción pide sesión (por ejemplo, agendar desde la portada), se abre una ventana para iniciar sesión o crear cuenta sin salir de la página.

**Estados de pantalla**: cada vista del portal contempla **cuenta nueva** (sin mascotas ni citas, con la acción siguiente), **cargando** y error de red con el mensaje “No pudimos cargar tus datos” y “Reintentar”.

**Reprogramar o cancelar**: “Mis citas” → pestaña **Próximas** → “Reprogramar” (nueva fecha y franja) o “Cancelar” (motivo). Solo activo hasta 2 h antes (RN-28).

**Facturas y perfil**: “Facturas” (fecha, número, total y “Descargar PDF”; no hay página de detalle). “Mi perfil”: cambiar teléfono, dirección y contraseña; “Registrar mascota”.

## 3. Panel interno

Los menús laterales de recepción, veterinario, estilista y administrador se agrupan en la misma tarjeta blanca compacta del portal, con altura ajustada a sus opciones y hover azul tenue (D-48).

| Rol | Menú | Tareas principales |
|-----|------|--------------------|
| Recepcionista | Agenda · Propietarios · Pacientes · Facturación | Ver la agenda del día por veterinario; crear citas para clientes presenciales o telefónicos; “Registrar llegada” o “No asistió” pasados 15 min; registrar propietarios y mascotas; Facturación > Nueva factura (buscar propietario por cédula) |
| Veterinario | Mi agenda · Pacientes · Atención | Abrir una cita confirmada; revisar historial y vacunas; diligenciar el formulario de atención (síntomas, peso, temperatura, diagnóstico, tratamiento); “+ Medicamento”; registrar vacunas, cirugías, internaciones o exámenes desde las pestañas del formulario; “Guardar atención” |
| Estilista | Mi agenda · Servicios | Abrir la cita de estética y registrar servicio, observaciones y costo |
| Administrador | Usuarios · Personal y horarios · Inventario · Indicadores | Crear usuarios y asignar rol; registrar veterinarios y estilistas con sus horarios; gestionar medicamentos y vacunas (stock crítico o por vencer resaltados); tablero de indicadores; anular facturas con motivo |

El calendario de recepción muestra vista diaria y semanal por veterinario con **colores por estado** de cita. “Ir a fecha”, junto a las flechas y Hoy, abre el calendario de VetCare con mes, año y fecha escrita para saltar directamente a cualquier día; en vista semanal abre la semana que contiene ese día (D-49). La ventana “Elegir fecha” agrupa las flechas en el encabezado y evita repetir el mes y el formato de fecha para reducir su altura.

**Presentación en móvil** (D-48): la agenda reúne los controles de vista y fecha y alinea el filtro de profesional con “Nueva cita”. En atención veterinaria y estética se muestran primero la mascota y la hora; “Ver datos y antecedentes” despliega toda la información del resumen, que sigue visible al lado del formulario en escritorio. Usuarios y Personal y horarios muestran tarjetas con toda la información y sus acciones; desde `md` vuelven a tablas.

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
