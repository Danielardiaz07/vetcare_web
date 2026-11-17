# 04 — Reglas de negocio

Fuente de verdad de las reglas que el sistema debe hacer cumplir. Cada regla tiene ID estable (`RN-xx`): **no se renumera ni se reutiliza**. Las reglas se validan en la capa de **Service** (y en el DTO cuando es de formato); los límites de longitud siguen [07](07-modelado-de-datos.md).

> **Si una regla cambia, se actualiza este archivo en el mismo cambio** (y los demás afectados). Ver [README](README.md).

Origen: `specs.pdf` salvo donde diga *(alineación)*, que indica una adaptación al stack/seguridad de `ARCHITECTURE.md` (ver [12](12-decisiones-y-pendientes.md)).

## Cuentas y acceso

| ID | Regla | RF |
|----|-------|----|
| RN-01 | Datos de registro del propietario: cédula (solo dígitos, 6–10, obligatoria), nombres y apellidos (obligatorios), correo (formato válido), teléfono (10 dígitos), dirección (opcional), contraseña y confirmación (deben coincidir) | RF-01 |
| RN-02 | Contraseña: mínimo 8 caracteres, al menos una mayúscula y un número; máximo 72 (límite de entrada de bcrypt); se guarda solo como hash bcrypt | RF-01, RF-15 |
| RN-03 | El correo es único. Si ya existe: “El correo ya está registrado” y no se crea la cuenta | RF-01 |
| RN-04 | Vinculación por cédula: si la cédula ya existe como propietario **sin cuenta** y el **correo del registro coincide** con el que la clínica guardó para ese propietario, se crea el usuario y se vincula (sus mascotas aparecen en el portal). Si la cédula ya tiene cuenta, se rechaza (409) y se indica iniciar sesión o recuperar el acceso con la cédula (RN-11, D-18); si existe con otro correo (o sin correo), se rechaza con el aviso de acercarse a recepción para actualizarlo (D-17). El correo de una cuenta solo se cambia en la clínica, tras verificar la identidad en persona (D-18) | RF-01, RF-03 |
| RN-05 | *(alineación)* La cuenta nace `PENDING` con rol PROPIETARIO y pasa a `ACTIVE` al verificar el OTP de correo. Solo usuarios `ACTIVE` pueden iniciar sesión | RF-01 |
| RN-06 | Tras activarse la cuenta se envía un correo de bienvenida | RF-01 |
| RN-07 | Inicio de sesión con correo y contraseña; el sistema redirige al portal del propietario o al panel interno según el rol | RF-02 |
| RN-08 | Tras 5 intentos fallidos consecutivos, la cuenta se bloquea 15 minutos | RF-02 |
| RN-09 | Credenciales inválidas → mensaje genérico (“Correo o contraseña incorrectos”) sin revelar cuál falló. Usuario inactivo → no ingresa e informa que contacte a la clínica | RF-02 |
| RN-10 | *(alineación)* Sesión con access token de vida corta + refresh token rotativo y revocable (ver [09](09-seguridad-y-autenticacion.md)). Al expirar: “Tu sesión expiró”. Cerrar sesión revoca el refresh token y vuelve al inicio | RF-02 |
| RN-11 | Recuperar contraseña: enlace de restablecimiento enviado al correo registrado, válido 30 minutos. La cuenta se identifica por **correo o por cédula**; con la cédula el enlace va siempre al correo ya registrado (nunca a uno indicado por quien lo pide) y la respuesta es genérica, sin revelar si la cédula existe ni el correo completo (D-18). El enlace es de **un solo uso** y pedir otro invalida el anterior; al cambiar la contraseña se cierran todas las sesiones, se reinicia el bloqueo de RN-08 y se avisa por correo (D-31) | RF-03 |
| RN-12 | Las cuentas del personal las crea el Administrador, que asigna rol (ADMINISTRADOR, RECEPCIONISTA, VETERINARIO, ESTILISTA) y puede activarlas/desactivarlas (nacen activas y no se eliminan). Desactivar una cuenta cierra sus sesiones; el administrador no puede desactivarse ni cambiarse el rol a sí mismo, y el primer administrador se crea con `npm run db:seed` (D-20) | RF-04 |
| RN-13 | Todos los endpoints exigen JWT válido y verifican el rol, excepto los públicos: registro, OTP, inicio de sesión, refresh, recuperación y consultas de tipos de cita, profesionales activos (solo identificador, nombre y especialidad) y disponibilidad desde la landing, y la verificación del carné de vacunación con su QR (RN-82) y el enlace personal de los correos para cambiar o cancelar una cita (RN-84). La confirmación y el registro de una mascota desde la landing exigen una sesión de propietario (D-50, D-51, D-56) | RNF-02 |

## Gestión de datos maestros

| ID | Regla | RF |
|----|-------|----|
| RN-14 | Propietarios y pacientes se **desactivan**, no se eliminan (se conserva el historial) | RF-05, RF-06 |
| RN-15 | Un paciente tiene: nombre (máx. 60), especie (`DOG`, `CAT`, `OTHER`), raza (texto, máx. 60), sexo (`MALE`, `FEMALE`), peso en kg (decimal, 2 decimales), fecha de nacimiento y foto (opcional); la **edad se calcula** a partir de la fecha de nacimiento (D-19) | RF-06, RF-08 |
| RN-16 | Todo paciente pertenece a un propietario. El propietario solo ve y gestiona las mascotas asociadas a su cédula | RF-06, RF-08 |
| RN-17 | La cédula identifica de forma única a un propietario dentro de la clínica | RF-05 |
| RN-18 | Un propietario puede registrar una nueva mascota desde su perfil | RF-15 |
| RN-19 | Veterinarios tienen especialidad; veterinarios y estilistas tienen horarios de atención; cada tipo de cita tiene una duración configurable. Las citas usan franjas de **30 minutos**; los horarios y las duraciones son múltiplos de 30 min, y los bloques de un mismo día no se solapan. Duraciones iniciales: consulta general, vacunación y control, 30 min con veterinario; estética, 90 min con estilista (D-21) | RF-07 |

## Agenda y citas

| ID | Regla | RF |
|----|-------|----|
| RN-20 | Solo se ofrecen franjas **libres y dentro del horario** del veterinario (regla de disponibilidad; equivale a `fn_vet_disponible` de la versión de escritorio) | RF-11, RF-16 |
| RN-21 | La cita se agenda con **al menos 2 horas de anticipación** | RF-11 |
| RN-22 | La cita se agenda **hasta 30 días** hacia adelante | RF-11 |
| RN-23 | Una mascota no puede tener dos citas en la misma franja | RF-11 |
| RN-24 | Máximo **3 citas futuras activas por mascota**. Mensaje: “Esta mascota ya tiene 3 citas activas” | RF-11 |
| RN-25 | Una cita nueva queda en estado `PROGRAMADA` | RF-11 |
| RN-26 | El propietario puede elegir un veterinario o “cualquiera disponible” | RF-11 |
| RN-27 | La franja se reserva con **bloqueo transaccional**: si dos usuarios eligen la misma, el segundo recibe “La franja ya no está disponible” y se le ofrecen otras | RF-11, RNF-11 |
| RN-28 | Solo se reprograman o cancelan citas `PROGRAMADA` o `CONFIRMADA` con **más de 2 horas** de anticipación. Si no: opciones deshabilitadas con “Comunícate con la clínica” | RF-12 |
| RN-29 | Reprogramar libera la franja anterior | RF-12 |
| RN-30 | Cancelar exige motivo, pasa la cita a `CANCELADA`, libera la franja y **conserva el registro** | RF-12 |
| RN-31 | Registrar la llegada pasa la cita a `CONFIRMADA`. Pasados 15 minutos sin llegada, la recepcionista puede marcarla `NO_ASISTIO` | RF-16 |
| RN-32 | Un veterinario no puede tener dos citas en la misma franja; recepción puede reasignar veterinario | RF-16 |
| RN-33 | Si no hay franjas libres el día elegido, el sistema sugiere las tres fechas más cercanas con disponibilidad. En el paso Fecha y hora del asistente de agendamiento (D-49), solo se muestra “Sin horarios disponibles”, sin enlaces a otras fechas; el usuario puede elegir otro día desde el calendario mensual siempre visible | RF-11 |
| RN-34 | Estados de cita y transiciones: `PROGRAMADA` → `CONFIRMADA` (llegada) → `ATENDIDA` (consulta guardada); `PROGRAMADA`/`CONFIRMADA` → `CANCELADA`; `PROGRAMADA`/`CONFIRMADA` → `NO_ASISTIO`. `ATENDIDA`, `CANCELADA` y `NO_ASISTIO` son finales | RF-13, RF-16 |

## Notificaciones

| ID | Regla | RF |
|----|-------|----|
| RN-35 | Se envía correo al **confirmar, cambiar o cancelar** una cita; debe llegar en menos de 1 minuto. El aviso se registra en el acto y el envío sale en segundo plano; reprogramar y reasignar al profesional cuentan como cambio (D-38). Los correos de confirmación y de cambio traen el enlace personal de RN-84 | RF-17, RF-11 |
| RN-36 | Recordatorio automático **24 horas antes** de la cita: se envía una vez, cuando la cita entra en las próximas 24 horas; si se reprograma, se avisa de nuevo para la hora nueva (D-38). Trae el enlace personal de RN-84 para reprogramar o cancelar con un clic | RF-17 |
| RN-37 | Aviso de vacuna próxima a vencer **7 días antes**: una sola vez por vacunación, sobre la última dosis aplicada de cada vacuna de las mascotas activas (D-38) | RF-17 |
| RN-38 | Si falla el envío de un correo, la operación de negocio **se conserva** y el envío se reintenta (hasta 3 intentos en total, D-38) | RF-11 |
| RN-39 | Cada correo programado/enviado se registra como Notificación asociada a su cita (o vacunación); la tabla `Notification` hace de cola de envío (D-38) | RF-17 |

## Atención clínica

| ID | Regla | RF |
|----|-------|----|
| RN-40 | El propietario solo accede al historial de sus propias mascotas; una mascota ajena responde **403** | RF-09 |
| RN-41 | El historial se muestra en orden cronológico inverso e incluye consultas, cirugías, internaciones y exámenes; admite filtros por tipo y rango de fechas | RF-09 |
| RN-42 | Las **notas internas** del veterinario no se muestran al propietario | RF-09 |
| RN-43 | Solo se registra una consulta sobre una cita `CONFIRMADA` | RF-18 |
| RN-44 | Solo el veterinario asignado a la cita puede registrar la consulta | RF-18 |
| RN-45 | Diagnóstico y tratamiento son obligatorios | RF-18 |
| RN-46 | Al guardar la consulta, en **una sola transacción**: la cita pasa a `ATENDIDA`, se actualiza el peso del paciente, se descuenta el stock de los medicamentos entregados *(aplazado, D-27 y D-36)* y la consulta queda como concepto pendiente de facturar | RF-18, RNF-11 |
| RN-47 | *(aplazada, D-27 y D-36: la fórmula sigue siendo texto libre)* Si un medicamento no tiene stock suficiente, el sistema advierte (“Stock insuficiente de [medicamento]”) y no permite entregarlo | RF-18 |
| RN-48 | Vacunación: registra vacuna, lote, fecha de aplicación y fecha de próxima dosis; descuenta el stock de la vacuna *(aplazado, D-36: el administrador ajusta el stock a mano)* | RF-19 |
| RN-49 | Estado de vacuna en el carné: `AL_DIA`, `PROXIMA_A_VENCER` (vence en los próximos 7 días) o `VENCIDA` | RF-10 |
| RN-50 | Cirugía, internación (con ingreso y egreso) y examen de laboratorio (con resultados) se asocian al paciente. Los registra solo el veterinario, sin cita obligatoria, y no se facturan en este alcance. Una mascota no puede tener dos internaciones abiertas y el egreso es posterior al ingreso; el ingreso y el egreso toman la hora del servidor (D-34) | RF-20 |
| RN-51 | Servicio estético: tipo (baño, corte, peluquería), estilista, observaciones y costo. Lo registra solo el estilista; la cita de estética es opcional y, si se indica, debe ser una cita de estética confirmada, asignada a ese estilista y de esa mascota, y pasa a `ATENDIDA` en la misma transacción. Queda como concepto pendiente de facturar (D-33) | RF-21 |
| RN-52 | Tipos de cita: consulta general, vacunación, control, estética | RF-11 |
| RN-53 | Una cita puede cerrarse con la **vacunación**, sin consulta: si `POST /vaccinations` recibe el `appointmentId`, exige las mismas condiciones que la consulta (veterinario asignado, RN-44; cita `CONFIRMADA`, RN-43; mascota de la cita) y, en la misma transacción, guarda la vacunación y pasa la cita a `ATENDIDA` (D-28) | RF-19 |

## Inventario

| ID | Regla | RF |
|----|-------|----|
| RN-55 | Medicamentos y vacunas se gestionan con stock, precio y fecha de vencimiento; solo el administrador los edita y el stock lo ajusta a mano (no se descuenta solo, D-36) | RF-22 |
| RN-56 | Se alerta el **stock crítico** (stock menor o igual al mínimo de cada producto) y los productos **por vencer** (vencen en los próximos 30 días; los ya vencidos se marcan aparte); solo cuentan los productos activos; equivale a `fn_stock_critico` (D-36) | RF-22 |
| RN-57 | El stock nunca queda negativo | RF-18, RF-19 |

## Datos personales y mensajes

| ID | Regla | RF |
|----|-------|----|
| RN-60 | Aceptación explícita del tratamiento de datos personales (Ley 1581 de 2012) obligatoria en el registro, con política visible | RNF-04 |
| RN-61 | La interfaz y los mensajes están en español y, ante un error, indican cómo corregirlo | RNF-08 |

## Facturación

| ID | Regla | RF |
|----|-------|----|
| RN-70 | La factura es de un propietario y detalla conceptos pendientes (consultas, servicios, medicamentos); sin pendientes se permite venta directa de productos | RF-23 |
| RN-71 | **IVA 19 %** solo sobre productos gravados (equivale a `fn_calcular_total_con_iva`); subtotal, IVA y total coinciden con la suma del detalle | RF-23 |
| RN-72 | Métodos de pago: efectivo, tarjeta, transferencia | RF-23 |
| RN-73 | Cada detalle referencia su concepto de origen; al facturar, esos conceptos quedan marcados como facturados | RF-23 |
| RN-74 | Una factura `PAGADA` no se edita; solo puede **anularse con motivo**, y la anulación es exclusiva del Administrador | RF-23 |
| RN-75 | Generar la factura es transaccional: ante un error no queda factura parcial | RF-23, RNF-11 |
| RN-76 | La factura queda numerada, con PDF descargable, y visible de inmediato para el propietario. El PDF se obtiene desde el navegador (“Imprimir / guardar como PDF”); el servidor no lo genera (D-37) | RF-23, RF-14 |

## Reportes

| ID | Regla | RF |
|----|-------|----|
| RN-80 | El tablero del Administrador muestra citas por estado, inasistencias, servicios más solicitados e ingresos por periodo. La tasa de inasistencia es `NO_SHOW / (ATTENDED + NO_SHOW)`; los servicios más solicitados son las citas por tipo sin contar las canceladas; los ingresos solo suman facturas pagadas (las anuladas no) y se agrupan por día de la clínica; sin fechas muestra los últimos 30 días y el rango máximo es de 366 días (D-35). El tablero incluye el periodo anterior de la misma duración para comparar y puede exportarse a CSV (D-53) | RF-24 |
| RN-81 | **Alerta de variación de peso**: se compara el peso de la última consulta de una mascota con el de la anterior; si varía 10 % o más (subida o bajada, un decimal) se marca como alerta. El propietario la ve como aviso en su portal durante 30 días desde esa consulta, y el personal puede ver la curva de peso y la marca. Es una ayuda para detectar cambios y no sustituye el criterio del veterinario (D-55) | RF-09, RF-18 |
| RN-82 | **Carné de vacunación verificable con QR**: cada mascota tiene un enlace único con un token aleatorio de 256 bits, que el propietario (o recepción y el veterinario, para imprimirlo) obtiene como un QR dentro del carné. Quien lo escanea ve, sin iniciar sesión, solo el nombre y la especie de la mascota y el estado de sus vacunas calculado en ese momento (RN-49), con el peor estado como resumen; **nunca** datos del propietario, contacto, raza, edad ni historial clínico (Ley 1581 de 2012). Un enlace desconocido, desactivado o de una mascota desactivada responde 404. El propietario puede cambiar el QR (el impreso anterior deja de servir) o desactivarlo (D-56) | RF-10 |
| RN-83 | **Llegada a la cita con QR**: el propietario muestra en recepción el QR de una cita programada; al escanearlo, recepción confirma la cita como con el registro manual de la llegada. El código está firmado y no se guarda; solo vale el día de la cita (hora de la clínica) y una sola vez, porque la cita pasa de programada a confirmada. Una cita cancelada, atendida o ya confirmada no genera código ni se acepta (D-56). **El código lleva la hora de inicio de la cita**: al reprogramarla, el código anterior deja de coincidir y se rechaza; el propietario usa el nuevo, que ve en Mis citas y en el recordatorio (D-66). El recordatorio trae el QR como imagen (D-66) | RF-16 |
| RN-84 | **Cambiar o cancelar la cita desde el correo**: los correos de confirmación, cambio y recordatorio traen un enlace personal firmado (no se guarda) que abre una página con la cita y dos acciones, reprogramar y cancelar, **sin iniciar sesión**. Abrir el enlace nunca cambia nada: cancelar o reprogramar es un segundo paso explícito, para que los programas que revisan los enlaces del correo no cancelen citas. Valen las mismas reglas que desde la cuenta del propietario: la cita debe estar activa y faltar **más de 2 horas** (RN-28), reprogramar respeta franjas, plazos y bloqueo transaccional (RN-20 a RN-27), y ambas acciones envían su correo (RN-35). El enlace no muestra datos del propietario, tiene límite de peticiones por IP y deja de servir cuando la cita se cancela o se atiende; un enlace inválido responde 404 (D-65) | RF-12, RF-17 |
| RN-85 | **Escaneo de recepción sin sesión**: recepción registra las llegadas (RN-83) desde una página `/scan/<token>` que no pide iniciar sesión, para no tener dos sesiones abiertas (computador y celular). La autoriza un **token secreto del enlace** (`CHECK_IN_SCANNER_TOKEN`, mínimo 32 caracteres) que la clínica entrega a recepción como enlace y como **QR fijo siempre activo**: se escanea con la cámara del celular y abre la página. Sin token configurado la página queda desactivada. Los propietarios no conocen el token, así que no pueden registrar su propia llegada a distancia. La página solo registra llegadas y responde únicamente nombre de la mascota y hora; tiene límite de peticiones por IP y un enlace inválido responde 404. Para cambiar el enlace se cambia la variable y se redespliega. **Recepción obtiene el enlace y su QR fijo desde el panel**: `GET /appointments/check-in/scanner-access` (solo recepción, con sesión) devuelve `{ url, qrSvg }` a partir de `FRONTEND_URL` por HTTPS y del token existente, sin crearlo ni cambiarlo; responde 404 si falta el token o `FRONTEND_URL` no es HTTPS (D-68). **Riesgo aceptado**: quien tenga el enlace puede registrar llegadas con códigos válidos (D-66) | RF-16 |
