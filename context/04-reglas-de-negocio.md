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
| RN-04 | Vinculación por cédula: si la cédula ya existe como propietario **sin cuenta**, se crea el usuario y se vincula (sus mascotas aparecen en el portal); si ya tiene cuenta, se rechaza | RF-01 |
| RN-05 | *(alineación)* La cuenta nace `PENDING` con rol PROPIETARIO y pasa a `ACTIVE` al verificar el OTP de correo. Solo usuarios `ACTIVE` pueden iniciar sesión | RF-01 |
| RN-06 | Tras activarse la cuenta se envía un correo de bienvenida | RF-01 |
| RN-07 | Inicio de sesión con correo y contraseña; el sistema redirige al portal del propietario o al panel interno según el rol | RF-02 |
| RN-08 | Tras 5 intentos fallidos consecutivos, la cuenta se bloquea 15 minutos | RF-02 |
| RN-09 | Credenciales inválidas → mensaje genérico (“Correo o contraseña incorrectos”) sin revelar cuál falló. Usuario inactivo → no ingresa e informa que contacte a la clínica | RF-02 |
| RN-10 | *(alineación)* Sesión con access token de vida corta + refresh token rotativo y revocable (ver [09](09-seguridad-y-autenticacion.md)). Al expirar: “Tu sesión expiró”. Cerrar sesión revoca el refresh token y vuelve al inicio | RF-02 |
| RN-11 | Recuperar contraseña: enlace de restablecimiento enviado al correo registrado, válido 30 minutos | RF-03 |
| RN-12 | Las cuentas del personal las crea el Administrador, que asigna rol (ADMINISTRADOR, RECEPCIONISTA, VETERINARIO, ESTILISTA) y puede activarlas/desactivarlas | RF-04 |
| RN-13 | Todos los endpoints exigen JWT válido y verifican el rol, excepto los públicos: registro, OTP, inicio de sesión, refresh y recuperación | RNF-02 |

## Gestión de datos maestros

| ID | Regla | RF |
|----|-------|----|
| RN-14 | Propietarios y pacientes se **desactivan**, no se eliminan (se conserva el historial) | RF-05, RF-06 |
| RN-15 | Un paciente tiene: especie, raza, sexo, peso, fecha de nacimiento y foto; la **edad se calcula** a partir de la fecha de nacimiento | RF-06, RF-08 |
| RN-16 | Todo paciente pertenece a un propietario. El propietario solo ve y gestiona las mascotas asociadas a su cédula | RF-06, RF-08 |
| RN-17 | La cédula identifica de forma única a un propietario dentro de la clínica | RF-05 |
| RN-18 | Un propietario puede registrar una nueva mascota desde su perfil | RF-15 |
| RN-19 | Veterinarios tienen especialidad; veterinarios y estilistas tienen horarios de atención; cada tipo de cita tiene una duración configurable | RF-07 |

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
| RN-33 | Si no hay franjas libres el día elegido, el sistema sugiere las tres fechas más cercanas con disponibilidad | RF-11 |
| RN-34 | Estados de cita y transiciones: `PROGRAMADA` → `CONFIRMADA` (llegada) → `ATENDIDA` (consulta guardada); `PROGRAMADA`/`CONFIRMADA` → `CANCELADA`; `PROGRAMADA`/`CONFIRMADA` → `NO_ASISTIO`. `ATENDIDA`, `CANCELADA` y `NO_ASISTIO` son finales | RF-13, RF-16 |

## Notificaciones

| ID | Regla | RF |
|----|-------|----|
| RN-35 | Se envía correo al **confirmar, cambiar o cancelar** una cita; debe llegar en menos de 1 minuto | RF-17, RF-11 |
| RN-36 | Recordatorio automático **24 horas antes** de la cita | RF-17 |
| RN-37 | Aviso de vacuna próxima a vencer **7 días antes** | RF-17 |
| RN-38 | Si falla el envío de un correo, la operación de negocio **se conserva** y el envío se reintenta | RF-11 |
| RN-39 | Cada correo programado/enviado se registra como Notificación asociada a su cita (o vacunación) | RF-17 |

## Atención clínica

| ID | Regla | RF |
|----|-------|----|
| RN-40 | El propietario solo accede al historial de sus propias mascotas; una mascota ajena responde **403** | RF-09 |
| RN-41 | El historial se muestra en orden cronológico inverso e incluye consultas, cirugías, internaciones y exámenes; admite filtros por tipo y rango de fechas | RF-09 |
| RN-42 | Las **notas internas** del veterinario no se muestran al propietario | RF-09 |
| RN-43 | Solo se registra una consulta sobre una cita `CONFIRMADA` | RF-18 |
| RN-44 | Solo el veterinario asignado a la cita puede registrar la consulta | RF-18 |
| RN-45 | Diagnóstico y tratamiento son obligatorios | RF-18 |
| RN-46 | Al guardar la consulta, en **una sola transacción**: la cita pasa a `ATENDIDA`, se actualiza el peso del paciente, se descuenta el stock de los medicamentos entregados y la consulta queda como concepto pendiente de facturar | RF-18, RNF-11 |
| RN-47 | Si un medicamento no tiene stock suficiente, el sistema advierte (“Stock insuficiente de [medicamento]”) y no permite entregarlo | RF-18 |
| RN-48 | Vacunación: registra vacuna, lote, fecha de aplicación y fecha de próxima dosis; descuenta el stock de la vacuna | RF-19 |
| RN-49 | Estado de vacuna en el carné: `AL_DIA`, `PROXIMA_A_VENCER` (vence en los próximos 7 días) o `VENCIDA` | RF-10 |
| RN-50 | Cirugía, internación (con ingreso y egreso) y examen de laboratorio (con resultados) se asocian al paciente | RF-20 |
| RN-51 | Servicio estético: tipo (baño, corte, peluquería), estilista, observaciones y costo | RF-21 |
| RN-52 | Tipos de cita: consulta general, vacunación, control, estética | RF-11 |

## Inventario

| ID | Regla | RF |
|----|-------|----|
| RN-55 | Medicamentos y vacunas se gestionan con stock, precio y fecha de vencimiento | RF-22 |
| RN-56 | Se alerta el **stock crítico** y los productos **por vencer** (umbrales por definir, ver [12](12-decisiones-y-pendientes.md)); equivale a `fn_stock_critico` | RF-22 |
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
| RN-76 | La factura queda numerada, con PDF descargable, y visible de inmediato para el propietario | RF-23, RF-14 |

## Reportes

| ID | Regla | RF |
|----|-------|----|
| RN-80 | El tablero del Administrador muestra citas por estado, inasistencias, servicios más solicitados e ingresos por periodo | RF-24 |
