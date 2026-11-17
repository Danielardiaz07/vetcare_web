import { CLINIC } from "@/features/landing/content";

// D-41: texto de demostración (RN-60); la clínica que adopte el sistema debe revisarlo con su abogado.
export const DATA_POLICY_UPDATED_AT = "12 de noviembre de 2026";

type PolicySection = { title: string; paragraphs?: string[]; items?: string[] };

export const DATA_POLICY_SECTIONS: PolicySection[] = [
  {
    title: "Responsable del tratamiento",
    paragraphs: [
      `VetCare Clínica Veterinaria, ubicada en ${CLINIC.address}, ${CLINIC.neighborhood}, ${CLINIC.city}, ${CLINIC.region}. Correo: ${CLINIC.email}. Teléfono: ${CLINIC.phone}.`,
      "Tratamos tus datos según la Ley 1581 de 2012 y el Decreto 1377 de 2013, compilado en el Decreto 1074 de 2015.",
    ],
  },
  {
    title: "Qué datos recogemos",
    items: [
      "Tuyos: nombres, apellidos, tipo y número de documento, correo, teléfono y dirección.",
      "De tus mascotas: nombre, especie, raza, sexo, fecha de nacimiento, peso, foto, historia clínica, vacunas y procedimientos.",
      "De tu relación con la clínica: citas, facturas y avisos que te enviamos.",
    ],
  },
  {
    title: "Para qué los usamos",
    items: [
      "Agendar, confirmar, reprogramar y recordarte tus citas.",
      "Llevar la historia clínica y el carné de vacunación de tus mascotas.",
      "Expedir tus facturas y atender tus solicitudes, quejas y reclamos.",
      "Avisarte por correo cuando se acerque una vacuna o una cita.",
      "Elaborar estadísticas internas sin identificarte.",
    ],
    paragraphs: ["No vendemos ni cedemos tus datos a terceros con fines comerciales."],
  },
  {
    title: "Tus derechos",
    items: [
      "Conocer, actualizar y rectificar tus datos.",
      "Pedir prueba de la autorización que nos diste.",
      "Saber cómo hemos usado tus datos.",
      "Revocar la autorización o pedir que eliminemos tus datos, cuando no exista una obligación legal o contractual de conservarlos.",
      "Presentar quejas ante la Superintendencia de Industria y Comercio.",
      "Consultar tus datos gratis.",
    ],
  },
  {
    title: "Cómo ejercerlos",
    paragraphs: [
      `Escríbenos a ${CLINIC.email} con tu nombre, documento y lo que necesitas. Respondemos las consultas en máximo 10 días hábiles y los reclamos en máximo 15 días hábiles.`,
      "Desde el portal también puedes ver y actualizar tu teléfono y tu dirección.",
    ],
  },
  {
    title: "Seguridad",
    paragraphs: [
      "Guardamos las contraseñas cifradas, cada persona del equipo ve solo lo que su cargo necesita y la información viaja por conexiones seguras.",
    ],
  },
];
