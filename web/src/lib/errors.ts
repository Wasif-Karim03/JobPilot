export class AppError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string,
    public details?: Record<string, string[]>
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super("NOT_FOUND", 404, `${resource} not found`);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action") {
    super("FORBIDDEN", 403, message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super("UNAUTHORIZED", 401, message);
  }
}

export class ValidationError extends AppError {
  constructor(details: Record<string, string[]>) {
    super("VALIDATION_ERROR", 400, "Validation failed", details);
  }
}

export class ApiKeyError extends AppError {
  constructor(message = "Invalid or expired API key") {
    super("API_KEY_ERROR", 401, message);
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter: number) {
    super("RATE_LIMITED", 429, `Rate limit exceeded. Retry after ${retryAfter}s`);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super("CONFLICT", 409, message);
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string) {
    super("EXTERNAL_SERVICE_ERROR", 502, `${service}: ${message}`);
  }
}
