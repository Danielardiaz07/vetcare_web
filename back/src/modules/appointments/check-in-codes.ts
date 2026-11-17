import { SignedCodes } from "@/shared/utils/signed-code";

// D-56, RN-83: código de llegada, "VC1.<id de la cita>.<firma>".
export class CheckInCodes extends SignedCodes {
  constructor(secret: string) {
    super(secret, "check-in", "VC1");
  }
}

// D-65, RN-84: enlace de los correos para cambiar o cancelar la cita, "MG1.<id de la cita>.<firma>".
export class ManageLinks extends SignedCodes {
  constructor(secret: string) {
    super(secret, "manage", "MG1");
  }
}
