import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ReceivePOItemDto {
  @ApiProperty({ description: 'ID dòng sản phẩm trong PO' })
  @IsString()
  @IsUUID()
  poItemId!: string;

  @ApiProperty({ description: 'Số lượng nhận hàng', minimum: 1 })
  @IsInt()
  @Min(1)
  qtyToReceive!: number;

  @ApiProperty({ description: 'ID vị trí kho nhận hàng' })
  @IsString()
  @IsUUID()
  locationId!: string;

  @ApiProperty({ description: 'ID lô sản phẩm nhận' })
  @IsString()
  @IsUUID()
  productBatchId!: string;

  @ApiProperty({ description: 'ID người thực hiện nhận hàng' })
  @IsString()
  @IsUUID()
  createdById!: string;

  @ApiProperty({ description: 'Khóa idempotency để tránh trùng lặp' })
  @IsString()
  idempotencyKey!: string;
}

export class ReceivePurchaseOrderDto {
  @ApiProperty({ type: [ReceivePOItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceivePOItemDto)
  items!: ReceivePOItemDto[];

  @ApiProperty({ description: 'Ghi chú (tùy chọn)', required: false })
  @IsOptional()
  @IsString()
  note?: string;
}
