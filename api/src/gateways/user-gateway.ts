import type { User } from "@/entities/user";

export interface UserGateway {
  findByUsername(username: string): Promise<User | null>;
}
