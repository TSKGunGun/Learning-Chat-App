import type {
  AuthenticationRepository,
  LoginCommand,
} from "@/application/ports/authentication-repository";
import {
  RequestFailedError,
  UnauthorizedRequestError,
} from "@/shared/errors/request-errors";

const JSON_HEADERS = {
  "content-type": "application/json",
} as const;

const isErrorResponse = (value: unknown): value is { message: string } => {
  return (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    typeof value.message === "string"
  );
};

const readErrorMessage = async (response: Response): Promise<string | null> => {
  const contentType = response.headers.get("content-type");

  if (contentType?.includes("application/json") !== true) {
    return null;
  }

  try {
    const payload = await response.json();
    return isErrorResponse(payload) ? payload.message : null;
  } catch {
    return null;
  }
};

export class HttpAuthenticationRepository implements AuthenticationRepository {
  public async login(command: LoginCommand): Promise<void> {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: JSON_HEADERS,
      credentials: "include",
      body: JSON.stringify(command),
    });

    if (response.ok) {
      return;
    }

    const message =
      (await readErrorMessage(response)) ?? "ログインに失敗しました。";

    if (response.status === 401) {
      throw new UnauthorizedRequestError(message);
    }

    throw new RequestFailedError(message);
  }

  public async ensureAuthenticated(): Promise<void> {
    const response = await fetch("/api/chats", {
      credentials: "include",
    });

    if (response.status === 401) {
      const message =
        (await readErrorMessage(response)) ?? "Authentication is required.";
      throw new UnauthorizedRequestError(message);
    }

    if (response.ok || response.status === 501) {
      return;
    }

    const message =
      (await readErrorMessage(response)) ??
      "トップ画面の認証確認に失敗しました。";
    throw new RequestFailedError(message);
  }
}
