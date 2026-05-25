import type { LoginCommand } from "@/application/ports/authentication-repository";
import type { LoginWithCredentialsUseCase } from "@/application/use-cases/login-with-credentials-use-case";
import type { RequireAuthenticatedSessionUseCase } from "@/application/use-cases/require-authenticated-session-use-case";

export class AuthenticationController {
  public constructor(
    private readonly loginWithCredentialsUseCase: LoginWithCredentialsUseCase,
    private readonly requireAuthenticatedSessionUseCase: RequireAuthenticatedSessionUseCase
  ) {}

  public login(command: LoginCommand): Promise<void> {
    return this.loginWithCredentialsUseCase.execute(command);
  }

  public requireAuthenticatedSession(): Promise<void> {
    return this.requireAuthenticatedSessionUseCase.execute();
  }
}
