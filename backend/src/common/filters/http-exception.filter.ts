import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthenticatedRequest } from '../interfaces/request.interface';
import { AppException } from '../exceptions/app.exception';
import { ApiResponse, ApiError } from '../interfaces/api-response.interface';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<AuthenticatedRequest>();

    // Get basic error information
    const status = this.getStatus(exception);
    const error = this.getError(exception);

    // Log error with context
    this.logError(error, request, exception);

    // Create API response
    const apiResponse: ApiResponse<null> = {
      success: false,
      error,
      metadata: {
        timestamp: new Date().toISOString(),
        path: request.url,
        correlationId: request.headers['x-correlation-id'] as string,
        user: request.user?.email,
      },
    };

    response.status(status).json(apiResponse);
  }

  private getStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private getError(exception: unknown): ApiError {
    if (exception instanceof AppException) {
      const response = exception.getResponse() as Record<string, any>;
      return {
        code: response.code,
        message: response.message,
        details: response.details,
        ...(process.env.NODE_ENV !== 'production' && { stack: exception.stack }),
      };
    }

    if (exception instanceof HttpException) {
      const response = exception.getResponse() as Record<string, any>;
      return {
        code: `HTTP_${exception.getStatus()}`,
        message: typeof response === 'string' ? response : response.message,
        details: typeof response === 'object' ? response : undefined,
        ...(process.env.NODE_ENV !== 'production' && { stack: exception.stack }),
      };
    }

    // Handle unknown errors
    const error = exception as Error;
    return {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      ...(process.env.NODE_ENV !== 'production' && {
        details: {
          originalMessage: error.message,
        },
        stack: error.stack,
      }),
    };
  }

  private logError(error: ApiError, request: AuthenticatedRequest, exception: unknown): void {
    const errorLog = {
      code: error.code,
      message: error.message,
      path: request.url,
      method: request.method,
      correlationId: request.headers['x-correlation-id'],
      userId: request.user?.id,
      body: request.body,
      query: request.query,
      stack: error.stack,
    };

    if (this.getStatus(exception) >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error('Internal Server Error', errorLog);
    } else {
      this.logger.warn('Client Error', errorLog);
    }
  }
}
