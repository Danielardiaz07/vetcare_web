import { Role } from "@prisma/client";
import { Router, type RequestHandler } from "express";
import {
  createInvoiceRequestSchema,
  listInvoicesQuerySchema,
  listMyInvoicesQuerySchema,
  pendingQuerySchema,
  voidInvoiceRequestSchema,
} from "@/modules/invoices/dto/invoices.dto";
import type { InvoicesController } from "@/modules/invoices/invoices.controller";
import { authorize } from "@/shared/middlewares/authorize";
import { validate } from "@/shared/middlewares/validate";
import { uuidParamSchema } from "@/shared/schemas/fields";

export function createInvoicesRouter(
  controller: InvoicesController,
  authenticate: RequestHandler,
): Router {
  const router = Router();
  const billing = [authenticate, authorize(Role.RECEPTIONIST, Role.ADMIN)];

  router.get("/pending", ...billing, validate({ query: pendingQuerySchema }), controller.pending);
  router.post("/", ...billing, validate({ body: createInvoiceRequestSchema }), controller.create);
  router.get("/", ...billing, validate({ query: listInvoicesQuerySchema }), controller.list);
  router.get(
    "/:id",
    authenticate,
    authorize(Role.RECEPTIONIST, Role.ADMIN, Role.OWNER),
    validate({ params: uuidParamSchema }),
    controller.getById,
  );
  router.put(
    "/:id/void",
    authenticate,
    authorize(Role.ADMIN),
    validate({ params: uuidParamSchema, body: voidInvoiceRequestSchema }),
    controller.void,
  );

  return router;
}

export function createMyInvoicesRouter(
  controller: InvoicesController,
  authenticate: RequestHandler,
): Router {
  const router = Router();

  router.get(
    "/",
    authenticate,
    authorize(Role.OWNER),
    validate({ query: listMyInvoicesQuerySchema }),
    controller.listMine,
  );

  return router;
}
