import type { User } from "@/entities/user";

export interface UserRepository {
  findByUsername(username: string): Promise<User | null>;
}
