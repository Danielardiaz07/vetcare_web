import type { RequestHandler } from "express";
import { HttpStatus } from "@/config/constants";
import type {
  CreateInvoiceRequestDto,
  ListInvoicesQueryDto,
  ListMyInvoicesQueryDto,
  PendingQueryDto,
  VoidInvoiceRequestDto,
} from "@/modules/invoices/dto/invoices.dto";
import type { InvoicesService } from "@/modules/invoices/invoices.service";

export class InvoicesController {
  constructor(private readonly service: InvoicesService) {}

  pending: RequestHandler = async (req, res) => {
    res.json(await this.service.pending((req.query as unknown as PendingQueryDto).ownerId));
  };

  create: RequestHandler = async (req, res) => {
    res
      .status(HttpStatus.CREATED)
      .json(await this.service.create(req.body as CreateInvoiceRequestDto));
  };

  list: RequestHandler = async (req, res) => {
    res.json(await this.service.list(req.query as unknown as ListInvoicesQueryDto));
  };

  getById: RequestHandler = async (req, res) => {
    res.json(await this.service.getById(req.user!, String(req.params.id)));
  };

  void: RequestHandler = async (req, res) => {
    res.json(await this.service.void(String(req.params.id), req.body as VoidInvoiceRequestDto));
  };

  listMine: RequestHandler = async (req, res) => {
    res.json(
      await this.service.listMine(req.user!.id, req.query as unknown as ListMyInvoicesQueryDto),
    );
  };
}
