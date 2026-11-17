import type { RequestHandler } from "express";
import { HttpStatus } from "@/config/constants";
import type {
  CreateOwnerRequestDto,
  ListOwnersQueryDto,
  UpdateOwnerRequestDto,
} from "@/modules/owners/dto/owners.dto";
import type { OwnersService } from "@/modules/owners/owners.service";

export class OwnersController {
  constructor(private readonly service: OwnersService) {}

  create: RequestHandler = async (req, res) => {
    const owner = await this.service.create(req.body as CreateOwnerRequestDto);
    res.status(HttpStatus.CREATED).json(owner);
  };

  list: RequestHandler = async (req, res) => {
    res.json(await this.service.list(req.query as unknown as ListOwnersQueryDto));
  };

  getById: RequestHandler = async (req, res) => {
    res.json(await this.service.getById(String(req.params.id)));
  };

  update: RequestHandler = async (req, res) => {
    res.json(await this.service.update(String(req.params.id), req.body as UpdateOwnerRequestDto));
  };

  deactivate: RequestHandler = async (req, res) => {
    await this.service.deactivate(String(req.params.id));
    res.status(HttpStatus.NO_CONTENT).send();
  };
}
