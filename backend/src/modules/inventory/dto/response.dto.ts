import { ApiProperty } from '@nestjs/swagger';
import { InventoryDto } from './inventory.dto';
import { MovementDto } from './movement.dto';

export class InventorySuccessResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ type: InventoryDto })
  inventory!: InventoryDto;

  @ApiProperty({ type: MovementDto })
  movement!: MovementDto;
}

export class InventoryIdempotentResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: true })
  idempotent!: boolean;

  @ApiProperty({ type: MovementDto })
  movement!: MovementDto;
}

export class InventoryTransferResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ type: InventoryDto })
  fromInventory!: InventoryDto;

  @ApiProperty({ type: InventoryDto })
  toInventory!: InventoryDto;

  @ApiProperty({ type: MovementDto })
  transferOutMovement!: MovementDto;

  @ApiProperty({ type: MovementDto })
  transferInMovement!: MovementDto;
}

export class ErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({ example: 'Error message' })
  message!: string | string[];
}
