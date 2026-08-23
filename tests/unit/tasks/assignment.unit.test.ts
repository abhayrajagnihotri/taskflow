import { ForbiddenError, DuplicateAssignmentError, TaskNotFoundError } from '../../../src/utils/errors';

describe('Unit Tests: Task Assignment Validation Rules', () => {
  it('should format ForbiddenError properly without leaking sensitive internal resource details', () => {
    const error = new ForbiddenError('Target user does not belong to the organization');
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe('FORBIDDEN');
    expect(error.message).toBe('Target user does not belong to the organization');
    expect(error.details).toEqual({});
  });

  it('should format DuplicateAssignmentError with 409 status code', () => {
    const error = new DuplicateAssignmentError();
    expect(error.statusCode).toBe(409);
    expect(error.code).toBe('DUPLICATE_ASSIGNMENT');
    expect(error.message).toBe('User is already assigned to this task');
  });

  it('should format TaskNotFoundError with 404 status code', () => {
    const error = new TaskNotFoundError();
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe('TASK_NOT_FOUND');
    expect(error.message).toBe('Task not found');
  });
});
