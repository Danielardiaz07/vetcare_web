import { writeFile } from "node:fs/promises";
import QRCode from "qrcode";

const OUTPUT_FILE = "scanner-qr.png";
const QR_WIDTH_PX = 800;
const QR_MARGIN_MODULES = 4;

// D-66, RN-85: arma el enlace de escaneo de recepción y su QR fijo. La recepcionista lo lee con la cámara del celular,
// se abre la página y desde ahí escanea los QR de los propietarios. Quien tenga el enlace puede registrar llegadas.
async function main() {
  const token = process.env.CHECK_IN_SCANNER_TOKEN;
  const baseUrl = (process.argv[2] ?? process.env.FRONTEND_URL ?? "").replace(/\/+$/, "");
  if (!token) throw new Error("Falta CHECK_IN_SCANNER_TOKEN en el .env");
  if (!baseUrl) throw new Error("Falta la URL del front: FRONTEND_URL o un argumento");

  const link = `${baseUrl}/scan/${token}`;
  await QRCode.toFile(OUTPUT_FILE, link, {
    width: QR_WIDTH_PX,
    margin: QR_MARGIN_MODULES,
    errorCorrectionLevel: "M",
  });
  await writeFile("scanner-link.txt", `${link}\n`);
  console.log(`Enlace: ${link}\nQR: ${OUTPUT_FILE}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
