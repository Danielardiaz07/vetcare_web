import type { RequestHandler } from "express";
import { HttpStatus } from "@/config/constants";
import type {
  CreateStaffUserRequestDto,
  ListStaffUsersQueryDto,
  UpdateStaffUserRequestDto,
} from "@/modules/users/dto/users.dto";
import type { UsersService } from "@/modules/users/users.service";

export class UsersController {
  constructor(private readonly service: UsersService) {}

  me: RequestHandler = async (req, res) => {
    res.json(await this.service.getProfile(req.user!.id));
  };

  createStaff: RequestHandler = async (req, res) => {
    const user = await this.service.createStaff(req.body as CreateStaffUserRequestDto);
    res.status(HttpStatus.CREATED).json(user);
  };

  listStaff: RequestHandler = async (req, res) => {
    res.json(await this.service.listStaff(req.query as unknown as ListStaffUsersQueryDto));
  };

  getStaff: RequestHandler = async (req, res) => {
    res.json(await this.service.getStaff(String(req.params.id)));
  };

  updateStaff: RequestHandler = async (req, res) => {
    res.json(
      await this.service.updateStaff(
        req.user!.id,
        String(req.params.id),
        req.body as UpdateStaffUserRequestDto,
      ),
    );
  };
}
