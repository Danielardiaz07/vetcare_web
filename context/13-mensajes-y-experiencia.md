# 13 — Mensajes y experiencia de usuario

Fuente para los textos y flujos de pantalla. La interfaz va en español (RN-61) y es responsiva desde 360 px (RNF-07). Tomado del manual de usuario de `specs.pdf`.

## 1. Acceso

**Agendar desde la landing (D-50)**: cuatro grupos visibles en una tarjeta: mascota, tipo de cita, profesional y fecha/hora, con resumen al pie. La persona puede empezar sin sesión escribiendo nombre y especie; “Revisar cita” solicita acceso o registro con verificación, conservando lo elegido. Si el acceso se pidió al revisar, el nombre y la especie se comparan solo con sus mascotas: una coincidencia única abre el resumen listo para confirmar, ninguna abre la ficha de la nueva mascota con esos datos precargados y varias muestran tarjetas para desambiguar. Si entra desde el enlace bajo el nombre, permanece en el formulario y aparecen tarjetas de todas sus mascotas para elegir. El calendario parte de hoy en Colombia y muestra todas las horas del día, sin agrupación; cambiar de día limpia la hora. Sin cupos: “Sin horarios disponibles”. Antes de confirmar se revalida la franja; si ya no está libre, se informa sin perder los demás datos. El comprobante y los correos son los existentes.

- Requisitos: computador, tableta o celular con internet y Chrome, Edge o Firefox actualizados (últimas dos versiones, RNF-09).
- Los propietarios crean su cuenta; las cuentas del personal las crea el administrador (RN-12).

## 2. Portal del propietario

**Crear cuenta**: en inicio, “Crear cuenta” → cédula, nombres, apellidos, correo, teléfono y contraseña (≥ 8, con mayúscula y número) → marcar aceptación del tratamiento de datos → “Registrarme” → verificar el código enviado al correo (OTP) → correo de bienvenida. Si la clínica ya lo tenía con esa cédula, verá de inmediato a sus mascotas.

**Iniciar y cerrar sesión**: correo y contraseña → “Ingresar”. “¿Olvidaste tu contraseña?” envía un enlace válido 30 min. Para salir: ícono de salida en la barra superior derecha, identificado como “Cerrar sesión” para lectores de pantalla y al pasar el cursor. El mismo control se usa en los paneles de recepción, veterinario, estilista y administrador.

**Menú del portal**: Inicio · Mis citas · Agendar · Historial clínico · Facturas · Mi perfil. En escritorio, las opciones se agrupan en una tarjeta blanca con borde fino y 12 px de espacio interior; “Agendar cita” aparece fuera, 16 px debajo, con el mismo ancho de la tarjeta, 44 px de alto y radio de 16 px, fondo petróleo, borde blanco, calendario petróleo sobre un recuadro blanco y flecha blanca a la derecha (variante 3A invertida); el activo se destaca en azul claro con texto petróleo semibold. “Cerrar sesión” está en la barra superior.

**Inicio**: saludo con el nombre del propietario, la próxima cita y “Tus mascotas” (una tarjeta por mascota con acceso a su historial). Las mascotas se ven en Inicio y en Mi perfil; no tienen entrada propia en el menú.

**Recordatorios** (D-48): agrupa los avisos de vacunas vencidas o por vencer, con mascota, vacuna, fecha y enlace “Agendar vacunación”; conserva los colores de alerta.

**Campana de avisos (D-59)**: “Avisos” en la barra superior muestra el contador sin ver (hasta “99+”, con número completo accesible) y abre un panel unido visualmente a la campana, preferentemente hacia la derecha y ajustado a la pantalla. Incluye citas próximas, vacunas por vencer o vencidas, cambios de peso y facturas, con tipo, mensaje, fecha y marca “Nuevo”. Abrir un aviso lo marca visto y lleva a su destino; “Marcar todos como vistos” permite leerlos juntos. El contador permanece estable durante las actualizaciones y la lectura se recuerda por cuenta en ese navegador. Incluye carga inicial, “Reintentar” y “No tienes avisos por ahora.”; Escape, clic exterior o “Cerrar avisos” cierran el panel.

**Historial clínico**: al abrir desde el menú se muestra la primera mascota activa y se puede cambiar mediante el selector. Sin mascotas se ofrece “Agregar mascota”; un fallo de carga permite reintentar. El acceso “Ver historial” desde Inicio abre directamente la mascota elegida. La ficha muestra las pestañas **Consultas**, **Vacunaciones**, **Cirugías**, **Internaciones**, **Exámenes** y **Estética**, de lo más reciente a lo más antiguo.

- Vacunas (carné): verde = al día · amarillo = vence en los próximos 7 días · rojo = vencida.

**Imprimir carné (D-57)**: en la ficha de la mascota, “Imprimir carné” abre una vista previa con sus datos, el nombre del propietario, la fecha de emisión y la última dosis de cada vacuna (aplicación, lote, próxima dosis, estado y veterinario). “Imprimir / guardar PDF” abre la impresión del navegador, donde se puede guardar el documento como PDF. Los estados se incluyen por escrito para leerlos en blanco y negro. Sin vacunas aparece “Sin vacunas registradas.” y se deshabilita la impresión. Recepción y veterinario tienen la misma acción junto al carné de la ficha del paciente.

**Evolución del peso** (D-58, RN-81): en el historial de cada mascota, una gráfica muestra las mediciones de sus consultas y destaca el último peso con su fecha. Pulsar o enfocar un punto lo resalta y muestra una etiqueta compacta con fecha y kg, fondo celeste y una punta estrecha que se alarga según la distancia. Se coloca preferentemente cerca y arriba, evitando otras mediciones, y permanece hasta otra selección, Escape o salir de la gráfica con clic o foco. “Selecciona un punto para ver su fecha y peso.” explica la interacción; los puntos se recorren con Tab. “Ver registros de peso” despliega una tabla accesible. Con menos de dos consultas aparece “Aún no hay suficientes consultas para graficar”; una medición sigue disponible en la tabla. El cambio frente a la consulta anterior se muestra con signo y un decimal como máximo: ámbar con ícono cuando la API lo marca, neutro cuando no y ausente sin comparación. Si está marcado, el último punto adopta forma de rombo y se muestra “Conviene revisarlo en la próxima consulta”. Un error en este bloque ofrece “Reintentar” y permite seguir usando el historial.

**Agendar cita** (asistente de 4 pasos, ≤ 3 min, RNF-06, D-49): 1) mascota → 2) tipo de cita (consulta general, vacunación, control, estética) → 3) profesional (veterinario o estilista según el tipo de cita) o “Cualquiera disponible” → 4) fecha y hora: un calendario mensual compacto siempre visible bajo la etiqueta Fecha, sin un recuadro adicional que repita la selección; el encabezado muestra mes y año, el día elegido queda marcado en azul y la fecha aparece junto a los horarios. El calendario ocupa su propio espacio y permanece visible al elegir un día; al elegir el día se muestran todas sus horas disponibles al lado, debajo en móvil. Al entrar queda seleccionada la fecha actual de Colombia y se consultan sus horarios; si no quedan horas válidas se muestra el aviso. Cambiar de día limpia la hora anterior. Un día sin cupos muestra únicamente “Sin horarios disponibles”, sin enlaces a otros días (RN-33); luego la revisión con el motivo y “Confirmar cita”. Se muestra el comprobante, llega un correo y, un día antes, un recordatorio.

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

**Peso en la ficha y la consulta** (D-58): recepción y veterinario ven la misma gráfica, tabla y marca de cambio en la ficha del paciente. Junto al peso y la temperatura del formulario de consulta se muestra “Último cambio de peso registrado”, calculado entre las dos últimas consultas guardadas; el aviso acompaña la valoración del veterinario. Si no hay comparación no aparece. Su error de carga permite reintentar sin impedir diligenciar la consulta.

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
