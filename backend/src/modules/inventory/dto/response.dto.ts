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

export class InventoryReservationResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ type: InventoryDto })
  inventory!: InventoryDto;

  @ApiProperty({ type: MovementDto })
  movement!: MovementDto;
}

export class InventoryQueryResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ type: [InventoryDto] })
  inventories!: InventoryDto[];

  @ApiProperty({ example: 100 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 5 })
  totalPages!: number;
}

export class ErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({ example: 'Error message' })
  message!: string | string[];
}
