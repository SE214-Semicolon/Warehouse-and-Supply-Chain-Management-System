import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { ValidationException } from '../exceptions/app.exception';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

@Injectable()
export class ValidationInterceptor implements NestInterceptor {
  constructor(private readonly dtoClass: any) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const body = request.body;

    if (!body) {
      return next.handle();
    }

    const dto = plainToClass(this.dtoClass, body);
    const errors = await validate(dto);

    if (errors.length > 0) {
      const validationErrors = errors.reduce((acc, err) => {
        acc[err.property] = Object.values(err.constraints || {});
        return acc;
      }, {});

      throw new ValidationException('Validation failed', validationErrors);
    }

    request.body = dto;
    return next.handle();
  }
}
