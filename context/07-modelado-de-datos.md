# 07 — Modelado de datos

## Regla fundamental: modelado de datos realista

**Todo atributo de toda entidad debe tener un tipo y un tamaño máximo justificados. No se permiten tamaños arbitrarios ni “por si acaso”** (un `VARCHAR(255)` por defecto, un nombre de 200 caracteres, un `INT` donde cabe un `SMALLINT`). Se modela siguiendo las prácticas del MER/ER y de normalización:

1. **Dimensionar según el dominio real**, no según el límite del motor. Se parte de estándares (RFC, ISO, longitudes fijas de algoritmos) o, si no existen, de datos reales del negocio con un margen razonable.
2. **Tipos nativos para valores de formato fijo** (`UUID` nativo para ids). En PostgreSQL **no** se usa `CHAR(n)` (rellena con espacios y suele ser el más lento); para longitud fija se usa `VARCHAR(n)` con el largo exacto.
3. **Usar el tipo más pequeño que cubra el rango** (`SMALLINT` para contadores acotados, `BOOLEAN`, `ENUM`/catálogo para valores cerrados).
4. **Un atributo = un dato atómico** (1FN): no combinar nombre y apellido, ni guardar listas en una columna.
5. **Sin redundancia ni dependencias parciales/transitivas** (hasta 3FN como mínimo); los catálogos van en tablas o enums, no repetidos como texto.
6. **Definir nulabilidad, `UNIQUE`, `DEFAULT` e índices de forma explícita** y solo donde las consultas lo justifiquen.
7. **Fechas con zona horaria** (`TIMESTAMPTZ`); dinero con `DECIMAL(p,s)`, nunca `FLOAT`.
8. **El límite vive en tres capas y debe coincidir**: columna en BD (Prisma `@db.*`), DTO de validación (Zod `.max()`) y `maxLength` en el formulario del frontend.
9. **Cada tamaño se documenta** (comentario en el schema o en estas tablas) con el porqué.

## Tabla de referencia — atributos comunes

| Atributo | Tipo | Tamaño | Justificación |
|----------|------|--------|---------------|
| Identificador | `UUID` nativo | 16 bytes | Frente a `VARCHAR(36)`, el índice B-tree llega a ser ~50 % menor [3] |
| Email | `VARCHAR` | 254 | Ruta de 256 octetos (RFC 5321 §4.5.3.1.3) menos `<` y `>`; erratum 1690 de RFC 3696 [1][2] |
| Hash bcrypt (contraseña, OTP) | `VARCHAR` | 60 | Salida siempre de 60 caracteres (`$2b$` + coste + 22 salt + 31 hash) [4] |
| Nombre / apellido | `VARCHAR` | 50 | Estándar histórico UK GDSC fija 35, pero hay nombres reales de 46; 50 es decisión de proyecto [5] |
| Teléfono (E.164) | `VARCHAR` | 15 | Máximo de 15 dígitos de E.164, sin el `+` [6] |
| Código postal | `VARCHAR` | 10 | Cubre formatos internacionales comunes |
| Documento de identidad | `VARCHAR` | 20 | Según tipo de documento del país |
| Título corto / etiqueta | `VARCHAR` | 100 | Texto de una línea en UI |
| Descripción / notas | `VARCHAR` | 500–1000 | Texto libre acotado; `TEXT` solo si es contenido largo |
| Ruta de archivo en Storage | `VARCHAR` | 255 | `carpeta/<uuid>.<ext>` ocupa ~50 |
| Intentos / contadores | `SMALLINT` | 2 bytes | Rango acotado por regla de negocio |
| Dinero | `DECIMAL(10,2)` | — | Exactitud decimal, nunca `FLOAT` |

> Punto de partida: al modelar cada entidad se revisa y ajusta con criterio, no se copia a ciegas. Las filas con referencia [n] se verificaron contra fuentes; las demás son **convenciones del proyecto**.

Detalles verificados:

- **Email**: parte local ≤ 64 octetos, dominio ≤ 255, ruta ≤ 256 (RFC 5321 §4.5.3.1). RFC 3696 decía 256 y la erratum 1690 lo corrigió a 254. Las cifras de 320 son la suma teórica y no se pueden alcanzar.
- **bcrypt**: el límite de 72 bytes es de **entrada**, no de salida; algunas librerías truncan en silencio y otras lanzan error.
- **Texto en PostgreSQL**: `VARCHAR(n)` y `TEXT` rinden igual; el límite solo cuesta unos ciclos de CPU al validar. Un `VARCHAR` corto no reserva espacio de más.

## Tabla de referencia — Colombia

**Estado**: ✅ respaldado por fuente oficial o normativa · ⚠️ fuentes secundarias o contradictorias · 🔧 convención del proyecto.

| Atributo | Tipo | Tamaño | Estado | Justificación |
|----------|------|--------|--------|---------------|
| Tipo de documento | `ENUM` | — | 🔧 | `CC`, `TI`, `RC`, `CE`, `PA`, `NIT`, `PPT`; catálogo cerrado |
| Número de documento | `VARCHAR` | 15 | ⚠️ | CC, TI y NUIP son de 10 dígitos máx. [8][9]; NIT hasta 10 + DV [13]; no se verificó CE ni PPT [15], por eso el margen. Texto, nunca numérico. **Para la cédula del propietario el DTO valida 6–10 dígitos (RN-01)** |
| Dígito de verificación (NIT) | `SMALLINT` | 0–9 | ⚠️ | Un dígito calculado con módulo 11 [13]; validar en el DTO |
| Celular / fijo (E.164) | `VARCHAR` | 15 | ⚠️ | Marcación nacional de 10 dígitos desde 2021 (fijo = `60` + indicativo + 7) [12]. En E.164 es `57` + 10 = 12 dígitos; la columna conserva el tope de E.164 [6]. **El formulario/DTO de registro recibe 10 dígitos (RN-01)** |
| Código postal | `VARCHAR` | 6 | ✅ | 6 dígitos; ceros a la izquierda, por eso es texto [10] |
| Departamento (DIVIPOLA/DANE) | `VARCHAR` | 2 | ✅ | Código DANE de 2 dígitos [10][11] |
| Municipio (DIVIPOLA/DANE) | `VARCHAR` | 5 | ✅ | Código de 5 dígitos [11]. Catálogo con FK, no texto libre |
| Placa de vehículo | `VARCHAR` | 6 | ⚠️ | 3 letras + 3 números; diplomáticas 2 + 4 [14] |
| Nombres (ambos) | `VARCHAR` | 60 | 🔧 | Uno o dos nombres; 2 × ~25 + espacio |
| Apellidos (ambos) | `VARCHAR` | 60 | 🔧 | Dos apellidos, a veces compuestos |
| Dirección | `VARCHAR` | 100 | 🔧 | Nomenclatura tipo `Calle 123 # 45-67 Sur, Torre 2 Apto 301` |
| Especialidad del veterinario | `VARCHAR` | 60 | 🔧 | Texto libre, p. ej. “Medicina interna” (D-22) |
| Día de la semana (horario) | `SMALLINT` | 1–7 | 🔧 | ISO: 1 = lunes … 7 = domingo; `CHECK` en BD (D-22) |
| Hora de inicio / fin (horario) | `TIME(0)` | — | 🔧 | Hora local de la clínica, sin zona; la API usa `HH:mm` en múltiplos de 30 min; `CHECK` inicio < fin (D-21, D-22) |
| Duración de un tipo de cita (min) | `SMALLINT` | — | 🔧 | Múltiplo positivo de 30; `CHECK` en BD (D-21) |
| Estado de la cita | `ENUM` | — | 🔧 | `SCHEDULED`, `CONFIRMED`, `ATTENDED`, `CANCELLED`, `NO_SHOW` (RN-34, D-26) |
| Inicio / fin de la cita | `TIMESTAMPTZ(3)` | — | 🔧 | UTC; `CHECK` inicio < fin; exclusión GiST contra el cruce de franjas activas del mismo veterinario, estilista o mascota (RN-23, RN-27, RN-32, D-26) |
| Motivo de la cita / de la cancelación | `VARCHAR` | 200 | 🔧 | Frase corta libre; el de cancelación es obligatorio (RN-30, D-26) |
| Nombre del paciente | `VARCHAR` | 60 | 🔧 | Un nombre de mascota; mismo tope que los nombres de persona (D-19) |
| Ruta de la foto del paciente | `VARCHAR` | 100 | 🔧 | Ruta del objeto en Storage `patients/<uuid>/<uuid>.<ext>` (~90 caracteres) (D-19) |
| Especie del paciente | `ENUM` | — | 🔧 | `DOG`, `CAT`, `OTHER`; catálogo cerrado (D-19) |
| Sexo del paciente | `ENUM` | — | 🔧 | `MALE`, `FEMALE` (D-19) |
| Raza del paciente | `VARCHAR` | 60 | 🔧 | Texto libre; razas compuestas o cruces descritos (D-19) |
| Peso del paciente (kg) | `DECIMAL(5,2)` | — | 🔧 | Hasta 999,99 kg; 2 decimales (D-19) |
| Síntomas, diagnóstico y tratamiento de la consulta | `VARCHAR` | 500 | 🔧 | Frases clínicas cortas; diagnóstico y tratamiento obligatorios (RN-45, D-27) |
| Fórmula y notas internas de la consulta | `VARCHAR` | 1000 | 🔧 | Texto libre; las notas internas no se muestran al propietario (RN-42, D-27) |
| Temperatura de la consulta (°C) | `DECIMAL(3,1)` | — | 🔧 | 0,0 a 99,9 (D-27) |
| Lote de la vacuna | `VARCHAR` | 30 | 🔧 | Código alfanumérico del fabricante (D-27) |
| Fecha de aplicación / próxima dosis | `DATE` | — | 🔧 | Sin hora ni zona (RN-48) |
| Número de factura | `INT` consecutivo | — | 🔧 | Se muestra como `FAC-000001` (D-27) |
| Estado y método de pago de la factura | `ENUM` | — | 🔧 | `PAID`/`VOIDED`; `CASH`/`CARD`/`TRANSFER` (RN-72, RN-74) |
| Valor monetario (COP) | `DECIMAL(12,2)` | — | 🔧 | Hasta ~10 mil millones; 2 decimales por contabilidad |
| Fecha de nacimiento | `DATE` | — | 🔧 | Sin hora ni zona |
| Fecha y hora de eventos | `TIMESTAMPTZ` | — | 🔧 | UTC; `America/Bogota` es UTC−5 y la presentación se resuelve en el frontend |

Notas:

- **Todo identificador numérico colombiano se guarda como texto** (`VARCHAR`): se pierden ceros a la izquierda (`05`, `011001`) y no se opera aritméticamente con ellos.
- **Cédula**: las antiguas (hasta 8 dígitos) conservan su número; desde la Resolución 3571 de 2003 el NUIP es de 10 dígitos [8][9].
- Pendiente de verificar con fuente oficial: formato de cédula de extranjería y PPT, plan de numeración vigente de la CRC y longitud exacta del NIT (DIAN).
- Los tamaños de campos específicos de VetCare (diagnóstico, lote, etc.; los del paciente ya están en la tabla, D-19) **aún no están definidos**: se justifican al modelar cada entidad (ver [12](12-decisiones-y-pendientes.md)).

## Fuentes

1. [RFC 5321 — SMTP, §4.5.3.1](https://www.rfc-editor.org/rfc/rfc5321.txt)
2. [Erratum 1690 de RFC 3696](https://errata.rfc-editor.org/eid1690)
3. [Nuxeo NXP-4803 (UUID vs varchar)](https://jira.nuxeo.com/browse/NXP-4803) y [AWS: tipos de datos de PostgreSQL](https://aws.amazon.com/blogs/database/getting-more-with-postgresql-purpose-built-data-types)
4. [Crate `bcrypt`](https://docs.rs/bcrypt) y [README de bcryptjs](https://huggingface.co/spaces/imseldrith/watch2gether-server/blob/main/node_modules/bcryptjs/README.md)
5. [NHS Data Dictionary — Person Given Name](https://v2.datadictionary.nhs.uk/data_dictionary/data_field_notes/p/person_given_name_de.asp@shownav=0.html)
6. [E.164 — Wikipedia](https://en.wikipedia.org/wiki/E.164) (texto oficial en itu.int; no se pudo consultar directamente)
7. [PostgreSQL — tipos de caracteres](https://www.postgresql.org/docs/current/datatype-character.html)
8. [Registraduría — “Ahora la cédula es de 10 dígitos”](https://www.registraduria.gov.co/Ahora-la-cedula-es-de-10-digitos.html)
9. [Resolución 3571 de 2003 — Registraduría (NUIP)](https://www.cancilleria.gov.co/sites/default/files/Normograma/docs/resolucion_registraduria_3571_2003.htm)
10. [Decreto 852 de 2013 — MinTIC (código postal)](https://www.ambitojuridico.com/sites/default/files/BancoMedios/Archivos/d-0852-13%28mintic%29.pdf)
11. [DIVIPOLA — OpenStreetMap Wiki](https://wiki.openstreetmap.org/ES:Key:divipola)
12. [Nueva marcación en Colombia — Noticias RCN](https://www.noticiasrcn.com/colombia/nuevos-indicativos-para-llamar-a-celulares-y-fijos-en-colombia-381227) y [Portafolio](https://www.portafolio.co/innovacion/nueva-forma-de-llamar-desde-el-extranjero-a-colombia-561195)
13. [Dígito de verificación del NIT — Siempre al Día](https://siemprealdia.co/colombia/impuestos/digito-de-verificacion-del-nit/) y [LookupTax](https://lookuptax.com/docs/es/numero-identificacion-fiscal/guia-nit-colombia)
14. [Código de Tránsito — placas](https://www.colombia.com/actualidad/codigos-leyes/codigo-de-transito/Tit2Cp6-placas.aspx) y [Carroya](https://www.carroya.com/noticias/guia-para-conductores/asi-puedes-identificar-los-6-tipos-de-placas-de-carros-que-circulan-en)
15. [Normograma Cancillería — Migración Colombia (cédula de extranjería)](https://cancilleria.gov.co/normograma/compilacion/docs/resolucion_uaemc_1395_2025.htm)
