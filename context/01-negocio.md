# 01 — Negocio

## 1. Qué es VetCare

**VetCare** es un sistema web de gestión integral para clínicas veterinarias con un **portal para propietarios de mascotas**. Es la migración a la web de la versión de escritorio (Java/JavaFX/Oracle, semestre 2026-I), conservando sus procesos y su lógica de negocio e incorporando el portal del propietario.

Proyecto académico: Universidad Popular del Cesar — Ingeniería de Sistemas, Ingeniería de Software I (SS502), Grupo de Programación Web, Valledupar, 2026-II. Equipo: Daniela Rojas Díaz y Kenys Padilla Villareal. Docente: Ing. Patricia Álvarez Ortega.

Procesos que cubre: propietarios, pacientes, veterinarios, citas, consultas, vacunaciones, cirugías, internaciones, exámenes de laboratorio, servicios estéticos, inventario de medicamentos/vacunas y facturación.

Dos frentes:

- **Panel interno** para el personal de la clínica (por rol).
- **Portal del propietario**: consulta de mascotas, historial clínico, carné de vacunación, facturas y autogestión de citas desde cualquier navegador.

## 2. Problema

Las clínicas veterinarias pequeñas y medianas de Valledupar operan con agendas físicas, hojas de cálculo y llamadas. Problemas identificados:

1. Agendamiento dependiente del teléfono y del horario de recepción.
2. Cruces y huecos en la agenda (sin validación automática de disponibilidad).
3. Inasistencias sin aviso (no hay recordatorios; las citas olvidadas no se liberan).
4. Información clínica inaccesible para el dueño (historial, plan de vacunación, refuerzos).
5. Acceso limitado al sistema interno (solo equipos con la app instalada).
6. Control de vacunas y medicamentos reactivo (vacunas vencidas y stock crítico se detectan tarde).
7. Trazabilidad incompleta de la facturación (el propietario no ve sus facturas).

**Pregunta problema**: ¿Cómo integrar en una sola plataforma web la gestión clínica, administrativa y financiera de una clínica veterinaria con un portal de autoservicio que permita a los propietarios consultar la información de sus mascotas y gestionar sus citas médicas?

## 3. Objetivos

**General**: desarrollar la versión web de VetCare migrando las funcionalidades de escritorio e incorporando el portal del propietario para consultar información clínica de sus mascotas y gestionar sus citas en línea.

**Específicos**:

1. Analizar procesos y necesidades de propietarios y personal para especificar RF y RNF.
2. Diseñar la arquitectura cliente-servidor documentada con UML (casos de uso, actividades, clases, secuencia, componentes).
3. Implementar los módulos internos (seguridad, propietarios y pacientes, agenda, atención clínica, estética, inventario, facturación) como API REST + interfaz web por roles.
4. Implementar el portal del propietario (registro, mascotas, historial, carné de vacunación, facturas, citas: agendar/reprogramar/cancelar según disponibilidad real).
5. Incorporar notificaciones por correo (confirmaciones, recordatorios de citas, vacunas próximas a vencer).
6. Gestionar con Scrum y validar con pruebas funcionales de cada incremento.

## 4. Justificación (resumen)

- **Clínica**: acceso desde cualquier navegador, agenda sin cruces, menos llamadas, recordatorios que reducen inasistencias, alertas de vacunas vencidas y stock crítico.
- **Propietario**: autonomía 24/7, historial y carné, facturas descargables.
- **Negocio**: modelo replicable a otras clínicas por suscripción.
- **Equipo**: aplica requerimientos, Scrum, UML, API REST y desarrollo de interfaces.

## 5. Modelo de negocio (Business Model Canvas)

SaaS: cada clínica paga una suscripción mensual; los propietarios usan el portal sin costo.

| Bloque | Descripción |
|--------|-------------|
| Segmentos | (1) Clínicas y consultorios veterinarios pequeños/medianos de Valledupar y región Caribe, con 1 a 10 veterinarios. (2) Propietarios de mascotas, clientes de esas clínicas (usuarios finales del portal) |
| Propuesta de valor | Clínica: agenda sin cruces, historia clínica digital desde cualquier navegador, alertas de vacunas e inventario, facturación integrada, menos llamadas. Propietario: agendar/reprogramar/cancelar 24/7, ver historial y carné, recibir recordatorios |
| Canales | Plataforma web responsiva (computador y celular), correo para notificaciones, demostraciones presenciales, redes sociales, recomendación entre veterinarios |
| Relación con clientes | Autoservicio en el portal; soporte por correo y WhatsApp para la clínica; capacitación inicial; asistente VetBot para preguntas frecuentes |
| Ingresos | Suscripción mensual por clínica según número de veterinarios (planes Básico y Profesional); cobro único de implementación y migración; módulos opcionales (p. ej. recordatorios por SMS) |
| Recursos clave | Equipo, código y modelo de datos, servidor de aplicación y base de datos, servicio de correo, dominio y certificado SSL |
| Actividades clave | Desarrollo y mantenimiento, soporte, respaldo de datos, capacitación, mejora continua por sprints |
| Socios clave | Clínicas piloto, proveedor de hosting, proveedor de correo, Universidad Popular del Cesar |
| Costos | Hosting y base de datos, dominio y SSL, correo, horas de desarrollo y soporte, publicidad y visitas comerciales |

> El stack tecnológico de este negocio es el de [08](08-arquitectura-y-stack.md) (Supabase/PostgreSQL, Brevo, etc.), no el que citaba el BMC original.

## 6. Actores del negocio

| Actor | Tipo | Interacción principal |
|-------|------|-----------------------|
| Propietario | Externo | Se registra, consulta sus mascotas, historial, vacunas y facturas, y gestiona sus citas |
| Recepcionista | Interno | Registra propietarios y pacientes, administra la agenda, confirma llegadas y factura |
| Veterinario | Interno | Atiende citas y registra consultas, vacunaciones, cirugías, internaciones y exámenes |
| Estilista | Interno | Registra servicios estéticos (baño, corte, peluquería) |
| Administrador | Interno | Gestiona usuarios y roles, catálogos, inventario, horarios y reportes |
| Servidor de correo | Sistema externo | Envía confirmaciones, recordatorios y alertas (proveedor: Brevo) |
| Reloj del sistema | Tiempo | Dispara recordatorios y alertas programadas |

Jerarquía de actores: todos los humanos especializan a **Usuario** (inicio/cierre de sesión); los cuatro roles internos especializan a **Personal** (control de acceso por rol).

## 7. Necesidades del usuario (NU)

| ID | Usuario | Necesidad | RF asociados |
|----|---------|-----------|--------------|
| NU-01 | Propietario | Pedir una cita sin llamar ni desplazarse, a cualquier hora, viendo solo horarios realmente disponibles | RF-11, RF-13 |
| NU-02 | Propietario | Cambiar o cancelar una cita cuando surge un imprevisto | RF-12 |
| NU-03 | Propietario | Conocer el historial médico, el carné de vacunación y los datos de cada mascota | RF-08, RF-09, RF-10 |
| NU-04 | Propietario | Recibir avisos antes de una cita y cuando una vacuna está por vencer | RF-17 |
| NU-05 | Propietario | Consultar y descargar las facturas de los servicios pagados | RF-14 |
| NU-06 | Propietario | Tener una cuenta segura y poder recuperar la contraseña | RF-01, RF-02, RF-03, RF-15 |
| NU-07 | Recepcionista | Ver la agenda del día por veterinario, sin cruces, y registrar llegadas e inasistencias | RF-16 |
| NU-08 | Recepcionista | Registrar con rapidez propietarios y mascotas nuevos | RF-05, RF-06 |
| NU-09 | Veterinario | Consultar el historial completo del paciente y registrar la atención desde cualquier equipo | RF-18, RF-19, RF-20 |
| NU-10 | Estilista | Registrar los servicios estéticos realizados a cada mascota | RF-21 |
| NU-11 | Recepcionista | Facturar consultas, servicios y medicamentos con el IVA calculado automáticamente | RF-23 |
| NU-12 | Administrador | Controlar usuarios, roles, personal y horarios de atención | RF-04, RF-07 |
| NU-13 | Administrador | Saber a tiempo qué medicamentos y vacunas están en stock crítico o por vencer | RF-22 |
| NU-14 | Administrador | Ver indicadores de citas, inasistencias e ingresos para decidir | RF-24 |

## 8. Trabajo futuro (fuera de alcance actual)

Recordatorios por SMS/WhatsApp, pagos en línea, carga de imágenes diagnósticas (radiografías) y varias sedes por clínica.
