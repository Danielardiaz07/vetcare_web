import { Router } from "express";

interface V1Modules {
  auth: Router;
  users: Router;
}

export function createV1Router({ auth, users }: V1Modules): Router {
  const router = Router();

  router.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });
  router.use("/auth", auth);
  router.use("/users", users);

  return router;
}
