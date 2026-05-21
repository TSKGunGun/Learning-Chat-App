import type { LoginResult } from "@/application/use-cases/login-use-case";

export interface LoginResponseBody {
  readonly id: string;
  readonly username: string;
}

export interface LoginCookieOutput {
  readonly name: "session";
  readonly value: string;
}

export interface LoginHttpResponse {
  readonly body: LoginResponseBody;
  readonly cookie: LoginCookieOutput;
}

export class LoginPresenter {
  public present(result: LoginResult): LoginHttpResponse {
    return {
      body: {
        id: result.id,
        username: result.username,
      },
      cookie: {
        name: "session",
        value: result.sessionToken,
      },
    };
  }
}
