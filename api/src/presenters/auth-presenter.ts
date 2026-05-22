import type { LoginResult } from "@/use-cases/login-use-case";

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

export const presentLogin = (result: LoginResult): LoginHttpResponse => ({
  body: {
    id: result.id,
    username: result.username,
  },
  cookie: {
    name: "session",
    value: result.sessionToken,
  },
});
