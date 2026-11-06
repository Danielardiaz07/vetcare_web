import type { MailMessage } from "@/shared/providers";

const CLINIC_NAME = "VetCare";

const layout = (title: string, body: string) =>
  `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto"><h2>${title}</h2>${body}<p style="color:#666;font-size:12px">${CLINIC_NAME}</p></div>`;

export const buildOtpEmail = (to: string, code: string, ttlMinutes: number): MailMessage => ({
  to,
  subject: `${CLINIC_NAME}: tu codigo de verificacion`,
  html: layout(
    "Verifica tu correo",
    `<p>Tu codigo de verificacion es:</p><p style="font-size:28px;letter-spacing:6px"><strong>${code}</strong></p><p>Vence en ${ttlMinutes} minutos. Si no fuiste tu, ignora este mensaje.</p>`,
  ),
});

export const buildPasswordResetEmail = (
  to: string,
  resetUrl: string,
  ttlMinutes: number,
): MailMessage => ({
  to,
  subject: `${CLINIC_NAME}: restablece tu contrasena`,
  html: layout(
    "Restablece tu contrasena",
    `<p>Recibimos una solicitud para cambiar tu contrasena. Usa este enlace:</p><p><a href="${resetUrl}">Crear una contrasena nueva</a></p><p>Vence en ${ttlMinutes} minutos y solo se puede usar una vez. Si no fuiste tu, ignora este mensaje: tu contrasena actual sigue siendo valida.</p>`,
  ),
});

export const buildPasswordChangedEmail = (to: string): MailMessage => ({
  to,
  subject: `${CLINIC_NAME}: tu contrasena fue cambiada`,
  html: layout(
    "Contrasena actualizada",
    "<p>Cambiaste tu contrasena y cerramos tus sesiones abiertas. Si no fuiste tu, comunicate con la clinica de inmediato.</p>",
  ),
});

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

export const buildWelcomeEmail = (to: string, firstNames: string): MailMessage => ({
  to,
  subject: `Bienvenido a ${CLINIC_NAME}`,
  html: layout(
    `Hola, ${escapeHtml(firstNames)}`,
    "<p>Tu cuenta ya esta activa. Ya puedes iniciar sesion para ver a tus mascotas y agendar citas.</p>",
  ),
});
