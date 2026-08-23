export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details: Record<string, any>;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_SERVER_ERROR', details: Record<string, any> = {}) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details: Record<string, any> = {}) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class InvalidCredentialsError extends AppError {
  constructor(message: string = 'Invalid credentials') {
    super(message, 401, 'INVALID_CREDENTIALS');
  }
}

export class AuthRequiredError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTH_REQUIRED');
  }
}

export class InvalidTokenError extends AppError {
  constructor(message: string = 'Invalid token') {
    super(message, 401, 'INVALID_TOKEN');
  }
}

export class EmailAlreadyExistsError extends AppError {
  constructor(message: string = 'Email already exists') {
    super(message, 409, 'EMAIL_ALREADY_EXISTS');
  }
}

export class InvalidRefreshTokenError extends AppError {
  constructor(message: string = 'Invalid refresh token') {
    super(message, 401, 'INVALID_REFRESH_TOKEN');
  }
}

export class RefreshTokenExpiredError extends AppError {
  constructor(message: string = 'Refresh token expired') {
    super(message, 401, 'REFRESH_TOKEN_EXPIRED');
  }
}

export class RefreshTokenRevokedError extends AppError {
  constructor(message: string = 'Refresh token has been revoked') {
    super(message, 401, 'REFRESH_TOKEN_REVOKED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden access') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class ProjectNotFoundError extends AppError {
  constructor(message: string = 'Project not found') {
    super(message, 404, 'PROJECT_NOT_FOUND');
  }
}

export class TaskNotFoundError extends AppError {
  constructor(message: string = 'Task not found') {
    super(message, 404, 'TASK_NOT_FOUND');
  }
}

export class DuplicateAssignmentError extends AppError {
  constructor(message: string = 'User is already assigned to this task') {
    super(message, 409, 'DUPLICATE_ASSIGNMENT');
  }
}

export class AssignmentNotFoundError extends AppError {
  constructor(message: string = 'Task assignment not found') {
    super(message, 404, 'ASSIGNMENT_NOT_FOUND');
  }
}

export class JobNotFoundError extends AppError {
  constructor(message: string = 'Job not found') {
    super(message, 404, 'JOB_NOT_FOUND');
  }
}

export class MemberNotFoundError extends AppError {
  constructor(message: string = 'Organization member not found') {
    super(message, 404, 'MEMBER_NOT_FOUND');
  }
}

export class CannotRemoveLastAdminError extends AppError {
  constructor(message: string = 'Cannot remove or demote the last org_admin of the organization') {
    super(message, 400, 'CANNOT_REMOVE_LAST_ADMIN');
  }
}
