# 10 — Gestión del proyecto

Metodología **Scrum** (Schwaber y Sutherland, 2020), con entrega de un incremento por sprint alineado a los cortes académicos. Plan original de `specs.pdf`; las fechas son de referencia y las fija la docente en el aula web.

> **Replanificado el 2026-10-16 (D-16).** El plan original (6 sprints de 2 semanas desde el 1 sep) no se ejecutó: al 16 oct solo estaba hecho el esqueleto del Sprint 0. Con la sustentación el 24 nov quedan ~5½ semanas, así que el alcance comprometido se reduce a las historias **Must** repartidas en 3 sprints (secciones 4 a 7). Las historias Should/Could pasan a **Reserva**: se toman solo si sobra capacidad. Ver el riesgo R-03 en [12](12-decisiones-y-pendientes.md).

## 1. Roles

| Rol Scrum | Responsable | Responsabilidades | Rol técnico |
|-----------|-------------|-------------------|-------------|
| Product Owner | Daniela Rojas Díaz | Representa a propietarios y clínica; redacta y prioriza el backlog; define criterios de aceptación; acepta o rechaza incrementos | Desarrolladora **backend** (`back/`): API, seguridad, base de datos, correos |
| Scrum Master | Kenys Padilla Villareal | Facilita eventos, elimina impedimentos, vela por Scrum y la DoD, mantiene el tablero | Desarrolladora **frontend** (`front/`): portal, panel interno, UX |
| Equipo de desarrollo | Ambas | Estiman, se comprometen con el objetivo del sprint, construyen, prueban e integran | Pruebas, documentación y despliegue |
| Interesados | Ing. Patricia Álvarez Ortega; clínica piloto; docente de Programación Web | Revisan incrementos en los cortes y dan retroalimentación | — |

## 2. Eventos y artefactos

- **Sprints de 2 semanas**: Sprint 0 de preparación (18 ago – 16 oct 2026, cerrado) + tres de desarrollo replanificados (19 oct – 23 nov 2026; el último dura 8 días).
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

24 historias de usuario (una por RF), **116 puntos**. Comprometidas: HU-01 a HU-16 (todas Must, **84 pts**). Reserva: HU-17 a HU-24 (Should y Could, 32 pts). La velocidad de referencia del plan original era ≈ 19 pts por sprint de 2 semanas; aún no hay velocidad medida.

| HU | Historia | RF | Prio | Pts | Sprint |
|----|----------|----|------|-----|--------|
| HU-01 | Como propietario, quiero crear mi cuenta para acceder al portal de mis mascotas | RF-01 | M | 5 | 1 |
| HU-02 | Como usuario, quiero iniciar y cerrar sesión para usar las funciones de mi rol | RF-02 | M | 5 | 1 |
| HU-03 | Como administrador, quiero gestionar los usuarios del personal y sus roles para controlar el acceso | RF-04 | M | 5 | 1 |
| HU-04 | Como recepcionista, quiero gestionar propietarios para tener sus datos actualizados | RF-05 | M | 3 | 1 |
| HU-05 | Como recepcionista, quiero gestionar las mascotas de cada propietario para atenderlas | RF-06 | M | 5 | 1 |
| HU-06 | Como administrador, quiero registrar veterinarios, estilistas y sus horarios para habilitar la agenda | RF-07 | M | 5 | 2 |
| HU-07 | Como propietario, quiero ver mis mascotas y su ficha para conocer sus datos | RF-08 | M | 3 | 1 |
| HU-08 | Como propietario, quiero agendar una cita en línea eligiendo una franja disponible | RF-11 | M | 8 | 2 |
| HU-09 | Como propietario, quiero reprogramar o cancelar mis citas cuando tenga un imprevisto | RF-12 | M | 5 | 2 |
| HU-10 | Como propietario, quiero ver mis citas próximas y pasadas con su estado | RF-13 | M | 3 | 2 |
| HU-11 | Como recepcionista, quiero gestionar la agenda diaria por veterinario sin cruces | RF-16 | M | 8 | 2 |
| HU-12 | Como veterinario, quiero registrar la consulta de una cita para guardar la atención | RF-18 | M | 8 | 3 |
| HU-13 | Como veterinario, quiero registrar vacunaciones con su próxima dosis | RF-19 | M | 5 | 3 |
| HU-14 | Como propietario, quiero ver el historial clínico de mi mascota | RF-09 | M | 5 | 3 |
| HU-15 | Como propietario, quiero ver el carné de vacunación de mi mascota | RF-10 | M | 3 | 3 |
| HU-16 | Como recepcionista, quiero generar facturas con IVA calculado automáticamente | RF-23 | M | 8 | 3 |
| HU-17 | Como propietario, quiero ver y descargar mis facturas | RF-14 | S | 3 | Reserva |
| HU-18 | Como administrador, quiero gestionar medicamentos y vacunas con alertas de stock | RF-22 | S | 5 | Reserva |
| HU-19 | Como propietario, quiero recibir correos de confirmación y recordatorio de mis citas y vacunas | RF-17 | S | 5 | Reserva |
| HU-20 | Como veterinario, quiero registrar cirugías, internaciones y exámenes | RF-20 | S | 5 | Reserva |
| HU-21 | Como usuario, quiero recuperar mi contraseña por correo | RF-03 | S | 3 | Reserva |
| HU-22 | Como propietario, quiero actualizar mi perfil y registrar una nueva mascota | RF-15 | S | 3 | Reserva |
| HU-23 | Como estilista, quiero registrar los servicios estéticos realizados | RF-21 | C | 3 | Reserva |
| HU-24 | Como administrador, quiero un tablero de indicadores para tomar decisiones | RF-24 | C | 5 | Reserva |

## 5. Sprint Backlog (objetivos)

Responsables: **D** = Daniela (backend, `back/`), **K** = Kenys (frontend, `front/`).

| Sprint | Fechas (2026) | Objetivo | Historias | Pts |
|--------|---------------|----------|-----------|-----|
| 0 (cerrado) | 18 ago – 16 oct | Preparar proyecto y arquitectura: repositorio y ramas (D); base del backend con config, errores y rate limit (D); modelo de datos base de autenticación en Prisma (D); base del frontend con Next.js, Tailwind y cliente HTTP (K); requerimientos y backlog (D, K). Proyecto Supabase creado y primera migración `init` aplicada el 17 oct (D) | — | — |
| 1 | 19 oct – 1 nov | Acceso y datos maestros del portal: registro con OTP, login, usuarios y roles (D); CRUD de propietarios y pacientes (D); pantallas de registro, login, gestión de usuarios, propietarios y mascotas, “Mis mascotas” y ficha (K) | HU-01, 02, 03, 04, 05, 07 | 26 |
| 2 | 2 nov – 15 nov | Personal y agenda: veterinarios, estilistas y horarios (D); disponibilidad, bloqueo transaccional de franja y endpoints de citas (D); asistente de agendamiento, “Mis citas” y calendario de recepción (K) | HU-06, 08, 09, 10, 11 | 29 |
| 3 | 16 nov – 23 nov | Atención clínica, facturación y cierre: consulta, vacunación con catálogo mínimo de vacunas, historial y carné (D, K); facturación con IVA en pantalla, sin PDF hasta resolver P-02 (D, K); pruebas de aceptación, manual, despliegue y sustentación (D, K) | HU-12, 13, 14, 15, 16 | 29 |

**Reserva (fuera del alcance comprometido):** HU-17 a HU-24 (32 pts). Se toman solo si algún sprint termina antes; el orden sugerido es HU-21 (recuperar contraseña), HU-17 (facturas del propietario y PDF), HU-18 (inventario con alertas), HU-19 (correos), HU-22, HU-20, HU-23 y HU-24.

## 6. Incrementos

| Incremento | Sprint | Funcionalidad | Valor |
|------------|--------|---------------|-------|
| 1 | 1 | Registro de propietarios, inicio de sesión por rol, gestión de usuarios, propietarios y mascotas; “Mis mascotas” | Sistema seguro; la clínica migra datos maestros y el propietario ve sus mascotas |
| 2 | 2 | Personal y horarios; agenda de recepción y autogestión de citas | Primer gran valor: citas en línea sin cruces |
| 3 (v1.0) | 3 | Consultas y vacunaciones, historial y carné en el portal, facturación con IVA y manual | Ciclo cita → atención → factura; producto para la sustentación |

## 7. Cronograma

Del 18 de agosto al 24 de noviembre de 2026.

| Hito | Fecha | Entregable |
|------|-------|-----------|
| Cierre del Sprint 0 | 16 oct 2026 | Base de back y front y modelo de autenticación; migración inicial aplicada en Supabase el 17 oct |
| Segundo corte (venció) | ref. 16 oct 2026 | No se entregó el Incremento 3 original; la nueva fecha está pendiente de acordar con la docente |
| Fin del Sprint 1 | 1 nov 2026 | Incremento 1 |
| Fin del Sprint 2 | 15 nov 2026 | Incremento 2 |
| Fin del Sprint 3 | 23 nov 2026 | Incremento 3 (v1.0) |
| Sustentación final | Por definir (ref. 24 nov 2026) | Aplicativo funcionando, documento completo y presentación de 15 min |
