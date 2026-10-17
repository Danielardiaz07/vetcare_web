import { Router, type RequestHandler } from "express";
import type { UsersController } from "@/modules/users/users.controller";

export function createUsersRouter(
  controller: UsersController,
  authenticate: RequestHandler,
): Router {
  const router = Router();

  router.get("/me", authenticate, controller.me);

  return router;
}
