import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

import type { ProblemDetails } from '@dlv/shared-types';
import type { Request, Response } from 'express';

/** Base URI namespace for documented problem types (RFC 9457 `type`). */
const PROBLEM_TYPE_BASE = 'https://docs.dlv.stellr-net.com/errors/';
const PROBLEM_CONTENT_TYPE = 'application/problem+json';

/** Structural test for a domain error without importing every error class. */
interface DomainErrorShape {
  code: string;
  httpStatus: number;
  message: string;
}
function isDomainError(err: unknown): err is DomainErrorShape {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    'httpStatus' in err &&
    typeof (err as Record<string, unknown>).httpStatus === 'number'
  );
}

/** Shape emitted by our ValidationPipe exception factory. */
interface ValidationErrorBody {
  code: 'VALIDATION_ERROR';
  errors: Record<string, string[]>;
}
function isValidationErrorBody(body: unknown): body is ValidationErrorBody {
  return (
    typeof body === 'object' &&
    body !== null &&
    (body as Record<string, unknown>).code === 'VALIDATION_ERROR' &&
    'errors' in body
  );
}

/**
 * Global exception filter — the ONLY place that turns thrown errors into HTTP
 * responses, so every error leaves as RFC 9457 `application/problem+json`
 * (PROJECT_MEMORY §8). Domain errors map via their `code`/`httpStatus`; Nest
 * `HttpException`s map by status; anything else is a generic 500 whose detail
 * never leaks internals (stack/SQL/PII go to logs keyed by trace id only).
 */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ProblemDetails');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const problem = this.toProblem(exception, req.originalUrl);

    if (problem.status >= 500) {
      // Full diagnostic context stays server-side only.
      this.logger.error(
        `${req.method} ${req.originalUrl} -> ${String(problem.status)}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    res
      .status(problem.status)
      .setHeader('Content-Type', PROBLEM_CONTENT_TYPE)
      .json(problem);
  }

  private toProblem(exception: unknown, instance: string): ProblemDetails {
    if (isDomainError(exception)) {
      return {
        type: `${PROBLEM_TYPE_BASE}${exception.code}`,
        title: exception.code,
        status: exception.httpStatus,
        detail: exception.message,
        instance,
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();

      if (isValidationErrorBody(response)) {
        return {
          type: `${PROBLEM_TYPE_BASE}VALIDATION_ERROR`,
          title: 'VALIDATION_ERROR',
          status,
          detail: 'One or more fields are invalid.',
          instance,
          errors: response.errors,
        };
      }

      const detail =
        typeof response === 'string'
          ? response
          : ((response as Record<string, unknown>).message as string | undefined) ??
            exception.message;
      return {
        type: `${PROBLEM_TYPE_BASE}${this.slug(exception.constructor.name)}`,
        title: this.slug(exception.constructor.name),
        status,
        detail: Array.isArray(detail) ? detail.join('; ') : detail,
        instance,
      };
    }

    return {
      type: `${PROBLEM_TYPE_BASE}INTERNAL_ERROR`,
      title: 'INTERNAL_ERROR',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      detail: 'An unexpected error occurred.',
      instance,
    };
  }

  /** `BadRequestException` -> `BAD_REQUEST`. */
  private slug(className: string): string {
    return className
      .replace(/Exception$/, '')
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .toUpperCase();
  }
}
