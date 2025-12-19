import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class RemovePurchaseOrderItemsDto {
  @ApiProperty({ type: [String], description: 'Array of PO Item IDs to remove' })
  @IsArray()
  @IsUUID('4', { each: true })
  itemIds!: string[];
}
