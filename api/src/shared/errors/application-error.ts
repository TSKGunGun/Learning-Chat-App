export type ApiErrorStatus = 400 | 401 | 404 | 422 | 500 | 501;

export class ApplicationError extends Error {
  public constructor(
    message: string,
    public readonly statusCode: ApiErrorStatus
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class UnauthorizedError extends ApplicationError {
  public constructor(message = "Authentication is required.") {
    super(message, 401);
  }
}

export class NotFoundApplicationError extends ApplicationError {
  public constructor(message = "Resource not found.") {
    super(message, 404);
  }
}

export class PendingAiMessageAlreadyExistsError extends ApplicationError {
  public constructor(message = "Pending AI response already exists.") {
    super(message, 422);
  }
}

export class NotImplementedApplicationError extends ApplicationError {
  public constructor(message: string) {
    super(message, 501);
  }
}
