import type { AuthenticationRepository } from "@/application/ports/authentication-repository";

export class RequireAuthenticatedSessionUseCase {
  public constructor(
    private readonly authenticationRepository: AuthenticationRepository
  ) {}

  public execute(): Promise<void> {
    return this.authenticationRepository.ensureAuthenticated();
  }
}
