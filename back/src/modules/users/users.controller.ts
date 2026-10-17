import type { RequestHandler } from "express";
import type { UsersService } from "@/modules/users/users.service";

export class UsersController {
  constructor(private readonly service: UsersService) {}

  me: RequestHandler = async (req, res) => {
    res.json(await this.service.getProfile(req.user!.id));
  };
}
