import type { User } from "@/entities/user";

export interface SessionGateway {
  createSession(userId: string): Promise<string>;
  getAuthenticatedUser(sessionToken: string): Promise<User | null>;
}
