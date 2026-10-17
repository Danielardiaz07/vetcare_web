export interface OwnerSummaryDto {
  id: string;
  documentType: string;
  documentNumber: string;
  firstNames: string;
  lastNames: string;
  phone: string;
}

export interface UserProfileResponseDto {
  id: string;
  email: string;
  role: string;
  status: string;
  owner: OwnerSummaryDto | null;
}
