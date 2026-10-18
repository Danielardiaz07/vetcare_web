# 06 — Modelo de dominio

20 clases y 4+ enumeraciones derivadas del esquema de la versión de escritorio (17 tablas) más `Persona` (abstracta), la fórmula de medicamentos y `Notificacion`. **El propietario es la raíz de la cadena**: propietario → paciente → cita → consulta → factura.

> Las tablas se materializan en PostgreSQL (Supabase) con Prisma. Los tipos y tamaños de cada atributo se justifican según [07](07-modelado-de-datos.md). Este archivo define **qué entidades y relaciones existen**; el detalle de columnas se fija en `back/prisma/schema.prisma` y se refleja aquí al crearse (ver pendientes en [12](12-decisiones-y-pendientes.md)).

## 1. Glosario ES → EN (nombres en código)

Documentación en español; código, tablas, columnas y endpoints en inglés.

| Dominio (ES) | Código (EN) | Dominio (ES) | Código (EN) |
|--------------|-------------|--------------|-------------|
| Usuario | `User` | Cirugía | `Surgery` |
| Propietario | `Owner` | Internación | `Hospitalization` |
| Paciente (mascota) | `Patient` | Examen de laboratorio | `LabExam` |
| Veterinario | `Veterinarian` | Servicio estético | `GroomingService` |
| Estilista | `Groomer` | Medicamento | `Medication` |
| Horario | `Schedule` | Vacuna | `Vaccine` |
| Cita | `Appointment` | Factura | `Invoice` |
| Consulta | `Consultation` | Detalle de factura | `InvoiceItem` |
| Fórmula de medicamento | `PrescriptionItem` | Notificación | `Notification` |
| Vacunación | `Vaccination` | Persona (abstracta) | `Person` (ver §4) |

## 2. Clases y responsabilidades

| Clase | Responsabilidad | Relaciones clave |
|-------|-----------------|------------------|
| `User` | Credenciales, rol y estado de acceso | Se asocia a una `Person` (0..1): propietarios y personal tienen usuario; un propietario puede existir sin usuario hasta que se registra |
| `Person` (abstracta) | Datos comunes de identificación y contacto | Generaliza `Owner`, `Veterinarian`, `Groomer` |
| `Owner` | Cliente de la clínica | Tiene 0..* `Patient` (agregación); paga 0..* `Invoice` |
| `Patient` | Mascota atendida; calcula su edad y detecta vacunas vencidas | Solicita `Appointment`; tiene `Vaccination`, `Surgery`, `Hospitalization`, `LabExam`, `GroomingService` |
| `Veterinarian` | Profesional; verifica su disponibilidad | Atiende `Appointment`; tiene 1..* `Schedule` (composición); aplica `Vaccination` |
| `Groomer` | Estilista | Realiza `GroomingService`; tiene `Schedule` |
| `Schedule` | Horario de atención por día | Pertenece a un veterinario/estilista (composición) |
| `AppointmentTypeSetting` | Duración configurable de cada `AppointmentType` (RN-19, D-21) | Una fila por tipo; lo consultan la disponibilidad y el agendamiento |
| `Appointment` | Reserva de atención con sus reglas de modificación | Genera 0..1 `Consultation`; origina `Notification` |
| `Consultation` | Registro médico principal | Contiene `PrescriptionItem` (composición) |
| `PrescriptionItem` | Medicamento formulado con cantidad | Referencia `Medication` |
| `Medication` / `Vaccine` | Inventario con stock y vencimiento | Referenciados por fórmulas, vacunaciones y detalles de factura |
| `Vaccination` | Vacuna aplicada, lote, fecha, próxima dosis | Paciente, veterinario, `Vaccine` |
| `Surgery` / `Hospitalization` / `LabExam` | Procedimientos, ingreso/egreso, resultados | Asociados al paciente |
| `GroomingService` | Baño, corte o peluquería | Paciente, estilista |
| `Invoice` / `InvoiceItem` | Cobro con cálculo de IVA y anulación | `Invoice` se compone de 1..* `InvoiceItem`; cada ítem referencia su concepto de origen |
| `Notification` | Correo programado o enviado | Asociada a una `Appointment` (o a una vacunación) |

## 3. Enumeraciones

Valores cerrados → `enum` (o catálogo). Derivadas de `specs.pdf`; confirmar al modelar.

| Enum | Valores |
|------|---------|
| `Role` | `OWNER`, `RECEPTIONIST`, `VETERINARIAN`, `GROOMER`, `ADMIN` |
| `UserStatus` | `PENDING`, `ACTIVE`, `SUSPENDED` (+ bloqueo temporal por intentos, RN-08) |
| `AppointmentStatus` | `SCHEDULED` (PROGRAMADA), `CONFIRMED` (CONFIRMADA), `ATTENDED` (ATENDIDA), `CANCELLED` (CANCELADA), `NO_SHOW` (NO_ASISTIO) |
| `AppointmentType` | `GENERAL_CONSULTATION`, `VACCINATION`, `CHECKUP` (control), `GROOMING` |
| `PaymentMethod` | `CASH`, `CARD`, `TRANSFER` |
| `InvoiceStatus` | `PAID`, `VOIDED` |
| `VaccineStatus` | `UP_TO_DATE`, `DUE_SOON`, `OVERDUE` (**derivado**, no se persiste: se calcula con la próxima dosis, RN-49) |
| `GroomingType` | `BATH`, `HAIRCUT`, `STYLING` |

Equivalencias de roles con el modelo inicial de `ARCHITECTURE.md` (`USER`/`ADMIN`): se amplía a los cinco roles de arriba (ver [12](12-decisiones-y-pendientes.md)).

## 4. Decisión de modelado: `Person`

Prisma no soporta herencia. Se modela como **tablas separadas** `Owner`, `Veterinarian`, `Groomer`, cada una con sus columnas propias de identificación y contacto (mismos tipos y tamaños de [07](07-modelado-de-datos.md)), y `User` con una FK opcional única hacia la persona que corresponda (`ownerId`, `veterinarianId`, `groomerId`). El perfil de un veterinario o estilista se crea **después** de su cuenta: primero el administrador crea el `User` con el rol (RN-12) y luego registra el perfil enlazándolo (D-22). `Schedule` pertenece a un veterinario **o** a un estilista (nunca a ambos) y guarda día ISO (1 = lunes … 7 = domingo) y horas locales de la clínica. Evita una tabla “persona” con columnas nulas según el tipo (3FN) y mantiene la cédula única por tabla de propietarios.

## 5. Reglas de integridad del dominio

- Sin propietario no hay paciente; sin paciente no hay cita; sin cita `CONFIRMED` no hay consulta; el concepto de una consulta/servicio queda “pendiente de facturar” hasta incluirse en una factura (RN-46, RN-73).
- Eliminación lógica (desactivar) de propietarios y pacientes (RN-14); no hay borrado físico con historial.
- Una cita no cruza otra del mismo veterinario ni de la misma mascota en la misma franja (RN-23, RN-32), garantizado por restricción en BD (exclusión GiST con `btree_gist`, solo sobre estados `SCHEDULED`, `CONFIRMED` y `ATTENDED`: cancelar o no asistir libera la franja) **y** por la validación del Service (D-23). Una cita tiene exactamente un profesional: veterinario, salvo `GROOMING`, que lleva estilista (`CHECK`).
- `InvoiceItem` referencia siempre su concepto de origen (consulta, servicio o producto) (RN-73).
