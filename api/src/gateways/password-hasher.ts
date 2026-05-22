export interface PasswordHasher {
  hash(plainText: string): Promise<string>;
  verify(plainText: string, hashedValue: string): Promise<boolean>;
}
