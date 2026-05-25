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

const SCAFFOLD_USER = {
  id: "11111111-1111-4111-8111-111111111111",
  username: "scaffold-user",
  password: "password",
  sessionToken: "scaffold-session",
} as const;

export class LoginUseCase {
  public async execute(command: LoginCommand): Promise<LoginResult> {
    const isAuthenticated =
      command.username === SCAFFOLD_USER.username &&
      command.password === SCAFFOLD_USER.password;

    if (!isAuthenticated) {
      throw new UnauthorizedError("ユーザー名またはパスワードが正しくありません。");
    }

    return {
      id: SCAFFOLD_USER.id,
      username: SCAFFOLD_USER.username,
      sessionToken: SCAFFOLD_USER.sessionToken,
    };
  }
}
