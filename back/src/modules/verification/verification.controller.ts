import type { RequestHandler } from "express";
import { HttpStatus } from "@/config/constants";
import type { VerificationService } from "@/modules/verification/verification.service";

export class VerificationController {
  constructor(private readonly service: VerificationService) {}

  getLink: RequestHandler = async (req, res) => {
    res.json(await this.service.getLink(req.user!, String(req.params.id)));
  };

  rotate: RequestHandler = async (req, res) => {
    res.json(await this.service.rotate(req.user!, String(req.params.id)));
  };

  disable: RequestHandler = async (req, res) => {
    await this.service.disable(req.user!, String(req.params.id));
    res.status(HttpStatus.NO_CONTENT).end();
  };

  getPublic: RequestHandler = async (req, res) => {
    // El estado cambia con el tiempo y el enlace puede desactivarse: nada de guardarlo en caché.
    res.set("Cache-Control", "no-store");
    res.json(await this.service.getPublic(String(req.params.token)));
  };
}
