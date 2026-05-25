import type {
  AuthenticationRepository,
  LoginCommand,
} from "@/application/ports/authentication-repository";

export class LoginWithCredentialsUseCase {
  public constructor(
    private readonly authenticationRepository: AuthenticationRepository
  ) {}

  public execute(command: LoginCommand): Promise<void> {
    return this.authenticationRepository.login(command);
  }
}
