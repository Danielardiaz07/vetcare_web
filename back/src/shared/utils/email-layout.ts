export const CLINIC_NAME = "VetCare";

export const emailLayout = (title: string, body: string): string =>
  `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto"><h2>${title}</h2>${body}<p style="color:#666;font-size:12px">${CLINIC_NAME}</p></div>`;
