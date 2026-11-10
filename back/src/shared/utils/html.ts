// Todo texto que escribe una persona (nombres de mascota, motivos) se escapa antes de ir en un correo HTML.
export const escapeHtml = (text: string): string =>
  text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
