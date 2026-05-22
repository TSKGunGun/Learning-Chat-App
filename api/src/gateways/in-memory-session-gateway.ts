import type { SessionGateway } from "@/gateways/session-gateway";
import type { User } from "@/entities/user";

const SCAFFOLD_USER: User = {
  id: "11111111-1111-4111-8111-111111111111",
  username: "scaffold-user",
};

const SCAFFOLD_SESSION_TOKEN = "scaffold-session";

export class InMemorySessionGateway implements SessionGateway {
  public async getAuthenticatedUser(
    sessionToken: string
  ): Promise<User | null> {
    const isProduction = process.env.NODE_ENV === "production";

    if (isProduction || sessionToken !== SCAFFOLD_SESSION_TOKEN) {
      return null;
    }

    return SCAFFOLD_USER;
  }
}
