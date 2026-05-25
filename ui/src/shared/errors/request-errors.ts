export class UnauthorizedRequestError extends Error {
  public constructor(message = "Authentication is required.") {
    super(message);
    this.name = "UnauthorizedRequestError";
  }
}

export class RequestFailedError extends Error {
  public constructor(message = "Request failed.") {
    super(message);
    this.name = "RequestFailedError";
  }
}
