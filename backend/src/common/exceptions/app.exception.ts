import { HttpException, HttpStatus } from '@nestjs/common';

export class AppException extends HttpException {
  constructor(
    message: string,
    status: HttpStatus,
    public readonly code: string,
    public readonly details?: Record<string, any>,
  ) {
    super(
      {
        message,
        code,
        details,
      },
      status,
    );
  }
}

export class ValidationException extends AppException {
  constructor(message: string, details?: Record<string, any>) {
    super(message, HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', details);
  }
}

export class NotFoundException extends AppException {
  constructor(resource: string, id?: string | number) {
    super(
      `${resource}${id ? ` with id ${id}` : ''} not found`,
      HttpStatus.NOT_FOUND,
      'RESOURCE_NOT_FOUND',
      { resource, id },
    );
  }
}

export class ConflictException extends AppException {
  constructor(message: string, details?: Record<string, any>) {
    super(message, HttpStatus.CONFLICT, 'RESOURCE_CONFLICT', details);
  }
}

export class BusinessException extends AppException {
  constructor(message: string, code: string, details?: Record<string, any>) {
    super(message, HttpStatus.UNPROCESSABLE_ENTITY, code, details);
  }
}
