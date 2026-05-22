import { ApplicationError } from "@/shared/errors/application-error";

export const parseJsonBody = async <T>(request: Request): Promise<T> => {
  try {
    return (await request.json()) as T;
  } catch {
    throw new ApplicationError("Request body must be valid JSON.", 400);
  }
};

export const assertNonEmptyString = (
  value: unknown,
  fieldName: string
): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ApplicationError(`${fieldName} is required.`, 400);
  }

  return value;
};

export const assertBoolean = (value: unknown, fieldName: string): boolean => {
  if (typeof value !== "boolean") {
    throw new ApplicationError(`${fieldName} must be a boolean.`, 400);
  }

  return value;
};

export const assertUuidLike = (value: string, fieldName: string): string => {
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidPattern.test(value)) {
    throw new ApplicationError(`${fieldName} must be a valid UUID.`, 400);
  }

  return value;
};
