import { Router } from "express";

interface V1Modules {
  auth: Router;
  users: Router;
  owners: Router;
  patients: Router;
  myPatients: Router;
}

export function createV1Router({ auth, users, owners, patients, myPatients }: V1Modules): Router {
  const router = Router();

  router.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });
  router.use("/auth", auth);
  router.use("/users", users);
  router.use("/owners", owners);
  router.use("/patients", patients);
  router.use("/me/patients", myPatients);

  return router;
}
