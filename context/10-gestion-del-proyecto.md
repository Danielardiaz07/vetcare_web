# 10 — Gestión del proyecto

Metodología **Scrum** (Schwaber y Sutherland, 2020), con entrega de un incremento por sprint alineado a los cortes académicos. Plan original de `specs.pdf`; las fechas son de referencia y las fija la docente en el aula web.

> El plan se formuló con el stack anterior. Con el stack vigente ([08](08-arquitectura-y-stack.md)) el avance real debe reconfirmarse antes de dar por hechas tareas del plan (ver [12](12-decisiones-y-pendientes.md)).

## 1. Roles

| Rol Scrum | Responsable | Responsabilidades | Rol técnico |
|-----------|-------------|-------------------|-------------|
| Product Owner | Daniela Rojas Díaz | Representa a propietarios y clínica; redacta y prioriza el backlog; define criterios de aceptación; acepta o rechaza incrementos | Desarrolladora **backend** (`back/`): API, seguridad, base de datos, correos |
| Scrum Master | Kenys Padilla Villareal | Facilita eventos, elimina impedimentos, vela por Scrum y la DoD, mantiene el tablero | Desarrolladora **frontend** (`front/`): portal, panel interno, UX |
| Equipo de desarrollo | Ambas | Estiman, se comprometen con el objetivo del sprint, construyen, prueban e integran | Pruebas, documentación y despliegue |
| Interesados | Ing. Patricia Álvarez Ortega; clínica piloto; docente de Programación Web | Revisan incrementos en los cortes y dan retroalimentación | — |

## 2. Eventos y artefactos

- **Sprints de 2 semanas**: Sprint 0 de preparación + seis de desarrollo (18 ago – 23 nov 2026).
- **Eventos**: Sprint Planning (lunes de inicio, 1 h), Daily Scrum adaptado (15 min, 3 veces por semana, WhatsApp/Meet), Sprint Review, Sprint Retrospective.
- **Artefactos**: Product Backlog, Sprint Backlog, Incremento; tablero Trello (Por hacer, En progreso, En revisión, Hecho).
- **Estimación**: puntos de historia en Fibonacci (1, 2, 3, 5, 8, 13) con Planning Poker.

## 3. Definición de Hecho (DoD)

Una historia está **hecha** cuando:

1. Cumple sus criterios de aceptación ([02](02-requerimientos-funcionales.md)) y las reglas de negocio ([04](04-reglas-de-negocio.md)).
2. El código está en GitHub e integrado a `develop` mediante **pull request revisado por la otra integrante** (Git Flow, [11](11-flujo-git.md)).
3. Los endpoints están documentados en OpenAPI/Swagger.
4. La pantalla funciona en escritorio y celular (≥ 360 px).
5. **`context/` está actualizado** (reglas, modelo, UML/diagramas que correspondan).

## 4. Product Backlog

24 historias de usuario (una por RF), **116 puntos**, velocidad media ≈ 19 pts/sprint.

| HU | Historia | RF | Prio | Pts | Sprint |
|----|----------|----|------|-----|--------|
| HU-01 | Como propietario, quiero crear mi cuenta para acceder al portal de mis mascotas | RF-01 | M | 5 | 1 |
| HU-02 | Como usuario, quiero iniciar y cerrar sesión para usar las funciones de mi rol | RF-02 | M | 5 | 1 |
| HU-03 | Como administrador, quiero gestionar los usuarios del personal y sus roles para controlar el acceso | RF-04 | M | 5 | 1 |
| HU-04 | Como recepcionista, quiero gestionar propietarios para tener sus datos actualizados | RF-05 | M | 3 | 2 |
| HU-05 | Como recepcionista, quiero gestionar las mascotas de cada propietario para atenderlas | RF-06 | M | 5 | 2 |
| HU-06 | Como administrador, quiero registrar veterinarios, estilistas y sus horarios para habilitar la agenda | RF-07 | M | 5 | 2 |
| HU-07 | Como propietario, quiero ver mis mascotas y su ficha para conocer sus datos | RF-08 | M | 3 | 2 |
| HU-08 | Como propietario, quiero agendar una cita en línea eligiendo una franja disponible | RF-11 | M | 8 | 3 |
| HU-09 | Como propietario, quiero reprogramar o cancelar mis citas cuando tenga un imprevisto | RF-12 | M | 5 | 3 |
| HU-10 | Como propietario, quiero ver mis citas próximas y pasadas con su estado | RF-13 | M | 3 | 3 |
| HU-11 | Como recepcionista, quiero gestionar la agenda diaria por veterinario sin cruces | RF-16 | M | 8 | 3 |
| HU-12 | Como veterinario, quiero registrar la consulta de una cita para guardar la atención | RF-18 | M | 8 | 4 |
| HU-13 | Como veterinario, quiero registrar vacunaciones con su próxima dosis | RF-19 | M | 5 | 4 |
| HU-14 | Como propietario, quiero ver el historial clínico de mi mascota | RF-09 | M | 5 | 4 |
| HU-15 | Como propietario, quiero ver el carné de vacunación de mi mascota | RF-10 | M | 3 | 4 |
| HU-16 | Como recepcionista, quiero generar facturas con IVA calculado automáticamente | RF-23 | M | 8 | 5 |
| HU-17 | Como propietario, quiero ver y descargar mis facturas | RF-14 | S | 3 | 5 |
| HU-18 | Como administrador, quiero gestionar medicamentos y vacunas con alertas de stock | RF-22 | S | 5 | 5 |
| HU-19 | Como propietario, quiero recibir correos de confirmación y recordatorio de mis citas y vacunas | RF-17 | S | 5 | 5 |
| HU-20 | Como veterinario, quiero registrar cirugías, internaciones y exámenes | RF-20 | S | 5 | 6 |
| HU-21 | Como usuario, quiero recuperar mi contraseña por correo | RF-03 | S | 3 | 6 |
| HU-22 | Como propietario, quiero actualizar mi perfil y registrar una nueva mascota | RF-15 | S | 3 | 6 |
| HU-23 | Como estilista, quiero registrar los servicios estéticos realizados | RF-21 | C | 3 | 6 |
| HU-24 | Como administrador, quiero un tablero de indicadores para tomar decisiones | RF-24 | C | 5 | 6 |

## 5. Sprint Backlog (objetivos)

Responsables: **D** = Daniela (backend, `back/`), **K** = Kenys (frontend, `front/`).

| Sprint | Fechas (2026) | Objetivo | Historias | Pts |
|--------|---------------|----------|-----------|-----|
| 0 | 18 ago – 31 ago | Preparar proyecto y arquitectura: repositorio y ramas (D), proyecto frontend y plantilla de diseño (K), proyecto backend conectado a la base de datos y modelo de datos adaptado (usuario–propietario, estados de cita, notificaciones) (D), requerimientos y backlog (D, K) | — | — |
| 1 | 1 sep – 14 sep | Usuarios autenticados por rol: seguridad, endpoints de registro/login/usuarios (D); pantallas de inicio de sesión, registro y gestión de usuarios, rutas protegidas por rol (K) | HU-01, 02, 03 | 15 |
| 2 | 15 sep – 28 sep | Datos maestros y primeras vistas del portal: CRUD de propietarios, pacientes, veterinarios, estilistas y horarios (D); formularios y tablas con búsqueda y paginación, “Mis mascotas” y ficha (K) | HU-04 a 07 | 16 |
| 3 | 29 sep – 12 oct | Agenda y autogestión de citas: servicio de disponibilidad y bloqueo transaccional de franja, endpoints de citas (D); asistente de agendamiento en 4 pasos, “Mis citas”, calendario de recepción (K) | HU-08 a 11 | 24 |
| 4 | 13 oct – 26 oct | Atención clínica visible para el propietario: consulta y vacunación con descuento de stock (D); formulario de atención, historial en línea de tiempo y carné (K) | HU-12 a 15 | 21 |
| 5 | 27 oct – 9 nov | Facturación, inventario y notificaciones: facturación con IVA y PDF, tareas de recordatorio y correo (D); pantallas de factura, inventario y “Mis facturas” (K) | HU-16 a 19 | 21 |
| 6 | 10 nov – 23 nov | Funciones complementarias y cierre: cirugía, internación, examen, estética, recuperación de contraseña y tablero (K, D); pruebas de aceptación, manual, despliegue y sustentación (D, K) | HU-20 a 24 | 19 |

## 6. Incrementos

| Incremento | Sprint | Funcionalidad | Valor |
|------------|--------|---------------|-------|
| 1 | 1 | Registro de propietarios, inicio de sesión por rol y gestión de usuarios | Sistema seguro; cada usuario ve su menú |
| 2 | 2 | Gestión de propietarios, mascotas, personal y horarios; “Mis mascotas” | La clínica migra datos maestros; el propietario ve sus mascotas |
| 3 | 3 | Agenda de recepción y autogestión de citas | Primer gran valor: citas en línea sin cruces |
| 4 | 4 | Consultas y vacunaciones; historial y carné en el portal | El propietario ve la información clínica |
| 5 | 5 | Facturación, inventario con alertas y correos automáticos | Ciclo cita → atención → factura; menos inasistencias |
| 6 (v1.0) | 6 | Cirugías, internaciones, exámenes, estética, recuperación de contraseña, tablero y manual | Producto completo para la sustentación |

## 7. Cronograma

Del 18 de agosto al 24 de noviembre de 2026.

| Hito | Fecha | Entregable |
|------|-------|-----------|
| Fin del Sprint 2 | 28 sep 2026 | Incremento 2 |
| Entrega segundo corte | Por definir (ref. 16 oct 2026) | Documento puntos 1 a 6 e Incremento 3 |
| Fin del Sprint 5 | 9 nov 2026 | Incremento 5 |
| Sustentación final | Por definir (ref. 24 nov 2026) | Aplicativo funcionando, documento completo y presentación de 15 min |
