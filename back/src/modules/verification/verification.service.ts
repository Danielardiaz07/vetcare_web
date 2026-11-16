import { Role } from "@prisma/client";
import { CARD_TOKEN_BYTES } from "@/config/constants";
import type {
  CardLinkResponseDto,
  PublicCardResponseDto,
  PublicCardStatus,
} from "@/modules/verification/dto/verification.dto";
import type {
  CardLinkRecord,
  VerificationRepository,
} from "@/modules/verification/verification.repository";
import { ConflictError, ForbiddenError, NotFoundError } from "@/shared/errors";
import { clinicDateOf } from "@/shared/utils/clinic-time";
import { CLINIC_NAME } from "@/shared/utils/email-layout";
import { toQrSvg } from "@/shared/utils/qr";
import { generateOpaqueToken } from "@/shared/utils/token-hash";
import { vaccineStatusOf, type VaccineStatus } from "@/shared/utils/vaccine-status";

export interface Actor {
  id: string;
  role: Role;
}

const ISO_DATE_LENGTH = 10;
const isoDate = (value: Date) => value.toISOString().slice(0, ISO_DATE_LENGTH);

// De peor a mejor: el estado general del carné es el peor de sus vacunas.
const SEVERITY: Record<VaccineStatus, number> = { OVERDUE: 2, DUE_SOON: 1, UP_TO_DATE: 0 };
const VERIFY_PATH = "/verify";

// D-56, RN-82: carné de vacunación verificable con un QR. El enlace es público pero solo muestra el estado de las vacunas.
export class VerificationService {
  constructor(
    private readonly repository: VerificationRepository,
    private readonly frontendUrl: string,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async getLink(actor: Actor, patientId: string): Promise<CardLinkResponseDto> {
    await this.assertCanManage(actor, patientId, true);
    const link = await this.repository.ensureLink(patientId, this.newToken());
    return this.toLinkResponse(link);
  }

  // El QR impreso anterior deja de servir; útil si el carné se perdió o se compartió de más.
  async rotate(actor: Actor, patientId: string): Promise<CardLinkResponseDto> {
    await this.assertCanManage(actor, patientId, true);
    const link = await this.repository.rotateLink(patientId, this.newToken(), this.clock());
    return this.toLinkResponse(link);
  }

  async disable(actor: Actor, patientId: string): Promise<void> {
    await this.assertCanManage(actor, patientId, false);
    await this.repository.deactivateLink(patientId);
  }

  // Sin sesión. Un enlace inexistente, desactivado o de una mascota desactivada responde lo mismo.
  async getPublic(token: string): Promise<PublicCardResponseDto> {
    const card = await this.repository.findByToken(token);
    if (!card?.active || !card.patient.active) throw new NotFoundError("Carne no encontrado");

    const now = this.clock();
    const today = clinicDateOf(now);
    const doses = await this.repository.latestDoses(card.patient.id);
    const vaccines = doses
      .map((dose) => {
        const nextDoseAt = dose.nextDoseAt ? isoDate(dose.nextDoseAt) : null;
        return {
          name: dose.vaccine.name,
          appliedAt: isoDate(dose.appliedAt),
          nextDoseAt,
          status: vaccineStatusOf(nextDoseAt, today),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      clinic: CLINIC_NAME,
      patient: { name: card.patient.name, species: card.patient.species },
      status: this.overallStatus(vaccines.map((vaccine) => vaccine.status)),
      vaccines,
      verifiedAt: now.toISOString(),
    };
  }

  private overallStatus(statuses: VaccineStatus[]): PublicCardStatus {
    if (statuses.length === 0) return "NO_RECORDS";
    return statuses.reduce((worst, status) =>
      SEVERITY[status] > SEVERITY[worst] ? status : worst,
    );
  }

  private async toLinkResponse(link: CardLinkRecord): Promise<CardLinkResponseDto> {
    if (!link.active) return { active: false };
    const url = `${this.frontendUrl}${VERIFY_PATH}/${link.token}`;
    return { active: true, url, qrSvg: await toQrSvg(url) };
  }

  private newToken(): string {
    return generateOpaqueToken(CARD_TOKEN_BYTES);
  }

  // Recepción y veterinario ven cualquier mascota; el propietario solo las suyas (RN-40).
  private async assertCanManage(
    actor: Actor,
    patientId: string,
    requireActive: boolean,
  ): Promise<void> {
    const patient = await this.repository.findPatient(patientId);
    if (!patient) throw new NotFoundError("Paciente no encontrado");
    if (
      actor.role === Role.OWNER &&
      (await this.repository.findOwnerIdByUserId(actor.id)) !== patient.ownerId
    ) {
      throw new ForbiddenError();
    }
    if (requireActive && !patient.active) throw new ConflictError("El paciente esta desactivado");
  }
}
