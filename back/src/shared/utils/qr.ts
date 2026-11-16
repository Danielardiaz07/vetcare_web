import QRCode from "qrcode";

const QR_MARGIN_MODULES = 2; // zona en blanco mínima para que el lector reconozca el código

// D-56: el QR se dibuja en el servidor como SVG, así el frontend solo lo muestra y no necesita su propia librería.
export const toQrSvg = (text: string): Promise<string> =>
  QRCode.toString(text, { type: "svg", margin: QR_MARGIN_MODULES, errorCorrectionLevel: "M" });
