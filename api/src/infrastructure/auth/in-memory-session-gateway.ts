import type { SessionGateway } from "@/application/ports/session-gateway";
import type { User } from "@/entities/user";

const SCAFFOLD_USER: User = {
  id: "11111111-1111-4111-8111-111111111111",
  username: "scaffold-user",
};

export class InMemorySessionGateway implements SessionGateway {
  public async getAuthenticatedUser(
    sessionToken: string
  ): Promise<User | null> {
    if (sessionToken.trim().length === 0) {
      return null;
    }

    return SCAFFOLD_USER;
  }
}
