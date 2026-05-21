import type { User } from "@/entities/user";

export interface AppBindings {
  Variables: {
    authenticatedUser: User;
  };
}
