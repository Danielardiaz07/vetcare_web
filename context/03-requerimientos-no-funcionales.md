# 03 — Requerimientos no funcionales

Clasificados según ISO/IEC 25010. La columna **Implementación en el stack** adapta cada RNF al stack vigente ([08](08-arquitectura-y-stack.md)); las medidas de aceptación vienen de `specs.pdf`.

| ID | Característica | Requerimiento | Medida de aceptación | Implementación en el stack |
|----|----------------|---------------|----------------------|----------------------------|
| RNF-01 | Seguridad | Contraseñas cifradas con bcrypt; nunca viajan ni se registran en texto plano | Revisión de la tabla de usuarios: ningún valor legible | `bcrypt` (cost ≥ 12), logs con `pino` sin datos sensibles |
| RNF-02 | Seguridad | Todos los endpoints, salvo registro, inicio de sesión y recuperación, exigen JWT válido y verifican el rol | Petición sin token o con rol no permitido recibe 401 o 403 | Middlewares `authenticate` y `authorize(roles)`. Públicos: register, OTP verify/resend, login, refresh, recuperación de contraseña |
| RNF-03 | Seguridad | Toda la comunicación usa HTTPS; credenciales de BD y correo en variables de entorno, no en el repositorio | Escaneo del repositorio sin secretos expuestos | `.env` no versionado, `.env.example`, validación de env con Zod al arrancar, cookie `Secure` |
| RNF-04 | Seguridad / Legal | Tratamiento de datos personales conforme a la Ley 1581 de 2012 (aceptación explícita y política visible) | Casilla obligatoria en el registro | Campo de aceptación en el DTO de registro y en el formulario; política enlazada (RN-60) |
| RNF-05 | Eficiencia | Consultas de la API responden en < 2 s con 50 usuarios concurrentes | Prueba de carga (herramienta por definir) | Índices justificados por consultas, paginación `?page=&limit=`, pooler de Supabase |
| RNF-06 | Usabilidad | Un propietario nuevo agenda una cita en máx. 3 min y 5 pasos, sin capacitación | Prueba con 5 usuarios reales | Asistente de agendamiento en pasos (ver [13](13-mensajes-y-experiencia.md)) |
| RNF-07 | Usabilidad | Interfaz responsiva, usable en celulares desde 360 px de ancho | Chrome DevTools y celular Android | Tailwind CSS v4, diseño mobile-first |
| RNF-08 | Usabilidad | Interfaz en español; los mensajes de error indican cómo corregir | Revisión de todos los formularios | Mensajes de Zod y de la API en español |
| RNF-09 | Compatibilidad | Funciona en las dos últimas versiones de Chrome, Edge y Firefox | Prueba en cada navegador | Next.js con soporte de navegadores modernos |
| RNF-10 | Fiabilidad | Disponibilidad del 99 % en horario de atención; respaldo diario de la BD | Monitoreo del servidor y registro de respaldos | Supabase gestiona respaldos; endpoint de salud para monitoreo |
| RNF-11 | Fiabilidad | Operaciones que afectan agenda, stock y facturas se ejecutan en transacciones | Prueba de concurrencia sobre una misma franja | `prisma.$transaction` + restricción única/bloqueo de franja (RN-27, RN-46, RN-75) |
| RNF-12 | Mantenibilidad | Arquitectura en capas con código versionado en Git y revisión por pull request | Estructura del repo e historial de PR | Route → Controller → Service → Repository; Git Flow ([11](11-flujo-git.md)) |
| RNF-13 | Mantenibilidad | API documentada con OpenAPI/Swagger | Swagger UI accesible en desarrollo | OpenAPI/Swagger sobre `/api/v1` (paso 9 del orden de construcción) |
| RNF-14 | Portabilidad | Despliegue en dos entornos (desarrollo y producción) sin cambiar el código | Despliegue en ambos entornos | Configuración por variables de entorno (`NODE_ENV`, URLs, secretos) |

## Pruebas

El proyecto **omite pruebas automatizadas** (decisión de `ARCHITECTURE.md`). La validación de cada incremento es **funcional/manual**, contra los criterios de aceptación de [02](02-requerimientos-funcionales.md) y las pruebas de endpoints con un cliente HTTP. No hay ramas `test/*` ni commits `test`.
