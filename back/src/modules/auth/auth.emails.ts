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

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

export const buildWelcomeEmail = (to: string, firstNames: string): MailMessage => ({
  to,
  subject: `Bienvenido a ${CLINIC_NAME}`,
  html: layout(
    `Hola, ${escapeHtml(firstNames)}`,
    "<p>Tu cuenta ya esta activa. Ya puedes iniciar sesion para ver a tus mascotas y agendar citas.</p>",
  ),
});
