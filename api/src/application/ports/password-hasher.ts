export interface PasswordHasher {
  verify(plainText: string, hashedValue: string): Promise<boolean>;
}
