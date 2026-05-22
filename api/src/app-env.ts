import type { User } from "@/entities/user";

export interface AppEnv {
  Variables: {
    authenticatedUser: User;
  };
}
