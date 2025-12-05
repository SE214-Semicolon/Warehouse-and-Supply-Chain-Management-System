import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Custom validator để kiểm tra một date field phải lớn hơn hoặc bằng một date field khác
 * 
 * @param property - Tên của property để so sánh
 * @param validationOptions - Tùy chọn validation
 * 
 * @example
 * class CreatePODto {
 *   placedAt: string;
 *   
 *   @IsDateAfterOrEqual('placedAt', { message: 'Expected arrival must be after placed date' })
 *   expectedArrival: string;
 * }
 */
export function IsDateAfterOrEqual(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isDateAfterOrEqual',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          const relatedValue = (args.object as any)[relatedPropertyName];
          
          // Nếu cả hai đều không có giá trị, coi như valid
          if (!value || !relatedValue) {
            return true;
          }
          
          // So sánh dates
          const date1 = new Date(value);
          const date2 = new Date(relatedValue);
          
          // Kiểm tra date hợp lệ
          if (isNaN(date1.getTime()) || isNaN(date2.getTime())) {
            return false;
          }
          
          return date1 >= date2;
        },
        defaultMessage(args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          return `${args.property} must be after or equal to ${relatedPropertyName}`;
        },
      },
    });
  };
}

/**
 * Validator constraint để kiểm tra date không được ở quá khứ
 */
@ValidatorConstraint({ name: 'isNotPastDate', async: false })
export class IsNotPastDateConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    if (!value) return true; // Optional field
    
    const inputDate = new Date(value);
    const now = new Date();
    
    // Reset time to compare only dates
    inputDate.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    
    return inputDate >= now;
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} cannot be in the past`;
  }
}

/**
 * Decorator để kiểm tra date không được ở quá khứ
 */
export function IsNotPastDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsNotPastDateConstraint,
    });
  };
}

