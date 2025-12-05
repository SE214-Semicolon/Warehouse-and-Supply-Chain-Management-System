import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class SubmitSalesOrderDto {
  @ApiProperty({ description: 'User ID submitting the SO' })
  @IsUUID()
  userId!: string;
}

