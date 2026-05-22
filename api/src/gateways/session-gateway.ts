import type { User } from "@/entities/user";

export interface SessionGateway {
  getAuthenticatedUser(sessionToken: string): Promise<User | null>;
}
