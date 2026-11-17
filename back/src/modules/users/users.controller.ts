import type { RequestHandler } from "express";
import { HttpStatus, REFRESH_COOKIE_NAME } from "@/config/constants";
import type {
  ChangePasswordRequestDto,
  CreateStaffUserRequestDto,
  ListStaffUsersQueryDto,
  UpdateMyContactRequestDto,
  UpdateStaffUserRequestDto,
} from "@/modules/users/dto/users.dto";
import type { UsersService } from "@/modules/users/users.service";
import { readCookie } from "@/shared/utils/cookies";

export class UsersController {
  constructor(private readonly service: UsersService) {}

  me: RequestHandler = async (req, res) => {
    res.json(await this.service.getProfile(req.user!.id));
  };

  updateMe: RequestHandler = async (req, res) => {
    res.json(
      await this.service.updateMyContact(req.user!.id, req.body as UpdateMyContactRequestDto),
    );
  };

  changePassword: RequestHandler = async (req, res) => {
    await this.service.changePassword(
      req.user!.id,
      req.body as ChangePasswordRequestDto,
      readCookie(req, REFRESH_COOKIE_NAME),
    );
    res.status(HttpStatus.NO_CONTENT).send();
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
