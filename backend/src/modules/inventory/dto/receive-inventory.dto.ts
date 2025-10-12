import { IsUUID, IsInt, Min, IsOptional, IsString } from 'class-validator';

export class ReceiveInventoryDto {
  @IsUUID()
  productBatchId: string;

  @IsUUID()
  locationId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsUUID()
  createdById?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
