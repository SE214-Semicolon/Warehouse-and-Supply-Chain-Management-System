import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  InternalServerErrorException,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Prisma } from '@prisma/client';
import { MongoError } from 'mongodb';

@Injectable()
export class DatabaseErrorInterceptor implements NestInterceptor {
  private readonly logger = new Logger(DatabaseErrorInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          this.logger.error(`Prisma Error ${error.code}: ${error.message}`);
          return throwError(() => this.handlePrismaError(error));
        }

        if (error instanceof MongoError) {
          this.logger.error(`MongoDB Error ${error.code}: ${error.message}`);
          return throwError(() => this.handleMongoError(error));
        }

        return throwError(() => error);
      }),
    );
  }

  private handlePrismaError(error: Prisma.PrismaClientKnownRequestError): Error {
    switch (error.code) {
      // Constraint Violations
      case 'P2002':
        return new BadRequestException(`Unique constraint violation: ${error.meta?.target}`);
      case 'P2003':
        return new BadRequestException(
          `Foreign key constraint violation: ${error.meta?.field_name}`,
        );
      case 'P2004':
        return new BadRequestException('Database constraint violation');

      // Not Found
      case 'P2025':
        return new NotFoundException('Record not found');
      case 'P2015':
        return new NotFoundException('Record does not exist');

      // Invalid Input
      case 'P2005':
        return new BadRequestException('Invalid field value');
      case 'P2006':
        return new BadRequestException('Invalid data format');
      case 'P2007':
        return new BadRequestException('Data validation error');

      // Query Errors
      case 'P2021':
        return new InternalServerErrorException('Table does not exist');
      case 'P2022':
        return new InternalServerErrorException('Column does not exist');

      // Transaction Errors
      case 'P2034':
        return new ConflictException('Transaction failed due to conflict');

      default:
        this.logger.error(`Unhandled Prisma Error: ${error.code}`, error.message);
        return new InternalServerErrorException('Database operation failed');
    }
  }

  private handleMongoError(error: MongoError): Error {
    switch (error.code) {
      // Duplicate Key
      case 11000:
        return new ConflictException('Duplicate key error');

      // Authentication Errors
      case 18:
        return new InternalServerErrorException('Authentication failed');
      case 20:
        return new InternalServerErrorException('Authentication mechanism not supported');

      // Operation Errors
      case 50:
        return new BadRequestException('Write operation failed');
      case 61:
        return new BadRequestException('Document validation failed');
      case 112:
        return new ConflictException('Write conflict error');

      // Connection Errors
      case 6:
        return new ServiceUnavailableException('Host unreachable');
      case 7:
        return new ServiceUnavailableException('Host not found');
      case 89:
        return new ServiceUnavailableException('Network timeout');

      default:
        this.logger.error(`Unhandled MongoDB Error: ${error.code}`, error.message);
        return new InternalServerErrorException('Database operation failed');
    }
  }
}
