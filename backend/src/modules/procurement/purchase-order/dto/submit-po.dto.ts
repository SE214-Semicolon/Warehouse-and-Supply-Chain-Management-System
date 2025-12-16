import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class SubmitPurchaseOrderDto {
  @ApiProperty({ description: 'ID người thực hiện submit' })
  @IsString()
  @IsUUID()
  userId!: string;
}
