import { ApiProperty } from '@nestjs/swagger';
import type { Customer } from '@prisma/client';

export class CustomerResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  data: Customer;

  @ApiProperty({ required: false })
  message?: string;
}

export class CustomerListResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty({ type: [Object] })
  data: Customer[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  pageSize: number;
}

export class CustomerDeleteResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;
}
