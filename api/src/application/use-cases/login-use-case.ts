import { NotImplementedApplicationError } from "@/shared/errors/application-error";

export interface LoginCommand {
  readonly username: string;
  readonly password: string;
}

export interface LoginResult {
  readonly id: string;
  readonly username: string;
  readonly sessionToken: string;
}

export class LoginUseCase {
  public async execute(_command: LoginCommand): Promise<LoginResult> {
    void _command;

    throw new NotImplementedApplicationError(
      "POST /api/auth/login is not implemented yet."
    );
  }
}
