import crypto from "node:crypto";

export interface IdGenerator {
  generate(): string;
}

export class CryptoIdGenerator implements IdGenerator {
  public generate(): string {
    return crypto.randomUUID();
  }
}
