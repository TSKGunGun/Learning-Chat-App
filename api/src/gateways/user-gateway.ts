export interface AuthenticationUserRecord {
  readonly id: string;
  readonly username: string;
  readonly passwordHash: string;
}

export interface UserGateway {
  findByUsername(username: string): Promise<AuthenticationUserRecord | null>;
}
