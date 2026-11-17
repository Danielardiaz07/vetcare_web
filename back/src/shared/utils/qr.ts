import QRCode from "qrcode";

const QR_MARGIN_MODULES = 2; // zona en blanco mínima para que el lector reconozca el código
const QR_PNG_WIDTH_PX = 320;

// D-56: el QR se dibuja en el servidor como SVG, así el frontend solo lo muestra y no necesita su propia librería.
export const toQrSvg = (text: string): Promise<string> =>
  QRCode.toString(text, { type: "svg", margin: QR_MARGIN_MODULES, errorCorrectionLevel: "M" });

// D-66: los correos no muestran SVG, así que el recordatorio pide el QR como imagen PNG.
export const toQrPng = (text: string): Promise<Buffer> =>
  QRCode.toBuffer(text, {
    type: "png",
    margin: QR_MARGIN_MODULES,
    errorCorrectionLevel: "M",
    width: QR_PNG_WIDTH_PX,
  });
