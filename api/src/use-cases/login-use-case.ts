import type { PasswordHasher } from "@/gateways/password-hasher";
import type { SessionGateway } from "@/gateways/session-gateway";
import type { UserGateway } from "@/gateways/user-gateway";
import { UnauthorizedError } from "@/shared/errors/application-error";

export interface LoginCommand {
  readonly username: string;
  readonly password: string;
}

export interface LoginResult {
  readonly id: string;
  readonly username: string;
  readonly sessionToken: string;
}

interface LoginUseCaseDependencies {
  readonly userGateway: UserGateway;
  readonly sessionGateway: SessionGateway;
  readonly passwordHasher: PasswordHasher;
}

export class LoginUseCase {
  public constructor(
    private readonly dependencies: LoginUseCaseDependencies
  ) {}

  public async execute(command: LoginCommand): Promise<LoginResult> {
    const userRecord = await this.dependencies.userGateway.findByUsername(
      command.username
    );

    if (userRecord === null) {
      throw new UnauthorizedError("Invalid username or password.");
    }

    const isPasswordValid = await this.dependencies.passwordHasher.verify(
      command.password,
      userRecord.passwordHash
    );

    if (!isPasswordValid) {
      throw new UnauthorizedError("Invalid username or password.");
    }

    const sessionToken = await this.dependencies.sessionGateway.createSession(
      userRecord.id
    );

    return {
      id: userRecord.id,
      username: userRecord.username,
      sessionToken,
    };
  }
}
