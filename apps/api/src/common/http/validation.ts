import { BadRequestException, ValidationPipe } from '@nestjs/common';

import type { ValidationError } from '@nestjs/common';

/**
 * Flattens class-validator errors (including nested ones) into the
 * `{ field: [messages] }` map our problem+json filter expects.
 */
function flatten(errors: ValidationError[], parentPath = ''): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const error of errors) {
    const path = parentPath ? `${parentPath}.${error.property}` : error.property;
    if (error.constraints) {
      out[path] = Object.values(error.constraints);
    }
    if (error.children && error.children.length > 0) {
      Object.assign(out, flatten(error.children, path));
    }
  }
  return out;
}

/**
 * Application-wide request validation pipe.
 *
 * - `whitelist` + `forbidNonWhitelisted`: strip/reject unknown properties
 *   (defence in depth against mass-assignment).
 * - `transform`: coerce payloads into the DTO classes.
 * - Custom factory: emit a stable `VALIDATION_ERROR` body the exception filter
 *   renders as an RFC 9457 `errors` map — never class-validator's default shape.
 */
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: false },
    stopAtFirstError: false,
    exceptionFactory: (errors: ValidationError[]) =>
      new BadRequestException({
        code: 'VALIDATION_ERROR',
        errors: flatten(errors),
      }),
  });
}
