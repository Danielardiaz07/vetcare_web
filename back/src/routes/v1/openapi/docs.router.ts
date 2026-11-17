import { Router } from "express";
import swaggerUi, { type JsonObject } from "swagger-ui-express";
import { buildOpenApiSpec } from "@/routes/v1/openapi/spec";

// D-40: documentación pública. El documento se arma una sola vez al arrancar.
export function createDocsRouter(): Router {
  const spec = buildOpenApiSpec();
  const router = Router();

  router.get("/openapi.json", (_req, res) => {
    res.json(spec);
  });
  router.use(
    "/docs",
    swaggerUi.serve,
    swaggerUi.setup(spec as unknown as JsonObject, {
      customSiteTitle: "VetCare API",
      swaggerOptions: { persistAuthorization: true, docExpansion: "none", tagsSorter: "alpha" },
    }),
  );

  return router;
}
