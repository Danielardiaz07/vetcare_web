import bcrypt from "bcrypt";
import type { IHasher } from "@/shared/providers/hasher.interface";

export class BcryptHasher implements IHasher {
  constructor(private readonly cost: number) {}

  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.cost);
  }

  compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
