import { hash, compare } from "bcryptjs";

import { getBcryptSaltRounds } from "@/db/env";
import type { PasswordHasher } from "@/gateways/password-hasher";

export class BcryptPasswordHasher implements PasswordHasher {
  public constructor(
    private readonly bcryptSaltRounds = getBcryptSaltRounds()
  ) {}

  public async hash(plainText: string): Promise<string> {
    return hash(plainText, this.bcryptSaltRounds);
  }

  public async verify(
    plainText: string,
    hashedValue: string
  ): Promise<boolean> {
    return compare(plainText, hashedValue);
  }
}
