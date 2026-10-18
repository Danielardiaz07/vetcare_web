export type DocumentType = "CC" | "TI" | "RC" | "CE" | "PA" | "NIT" | "PPT";

export type Species = "DOG" | "CAT" | "OTHER";
export type Sex = "MALE" | "FEMALE";

export interface Owner {
  id: string;
  documentType: DocumentType;
  documentNumber: string;
  firstNames: string;
  lastNames: string;
  email: string | null;
  phone: string;
  address: string | null;
  active: boolean;
}

export interface Patient {
  id: string;
  ownerId: string;
  name: string;
  species: Species;
  breed: string;
  sex: Sex;
  birthDate: string;
  weightKg: number;
  photoPath: string | null;
  active: boolean;
}
