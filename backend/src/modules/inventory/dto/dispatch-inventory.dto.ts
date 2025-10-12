import { IsUUID, IsInt, Min, IsOptional, IsString } from 'class-validator';

export class DispatchInventoryDto {
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
