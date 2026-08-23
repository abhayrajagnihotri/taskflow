import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodIssue } from 'zod';
import { AppError } from '../utils/errors';

export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction): void => {
  // Handle AppError subclasses
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      details: err.details,
    });
    return;
  }

  // Handle Zod Validation Errors
  if (err instanceof ZodError) {
    const formattedDetails = (err.issues || []).reduce((acc: Record<string, string>, issue: ZodIssue) => {
      const field = issue.path.join('.');
      acc[field || 'body'] = issue.message;
      return acc;
    }, {});

    res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: formattedDetails,
    });
    return;
  }

  // Fallback for unhandled internal server errors
  console.error('Unhandled Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_SERVER_ERROR',
    details: {},
  });
};
