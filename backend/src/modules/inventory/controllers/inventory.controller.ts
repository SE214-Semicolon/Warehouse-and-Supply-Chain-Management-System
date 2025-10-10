import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { InventoryService } from '../services/inventory.service';
import { ReceiveInventoryDto } from '../dto/receive-inventory.dto';
import { DispatchInventoryDto } from '../dto/dispatch-inventory.dto';
import { AdjustInventoryDto } from '../dto/adjust-inventory.dto';
import { TransferInventoryDto } from '../dto/transfer-inventory.dto';
import { JwtAuthGuard } from '../../../auth/jwt.guard';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiBody } from '@nestjs/swagger';
import {
  InventorySuccessResponseDto,
  InventoryIdempotentResponseDto,
  InventoryTransferResponseDto,
  ErrorResponseDto,
} from '../dto/response.dto';

@ApiTags('inventory')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('receive')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Receive inventory (purchase_receipt)' })
  @ApiResponse({
    status: 201,
    description: 'Inventory received',
    type: InventorySuccessResponseDto,
  })
  @ApiResponse({
    status: 200,
    description:
      'Idempotent response when a movement with the same idempotencyKey was already created',
    type: InventoryIdempotentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or bad request',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'ProductBatch or Location or User not found',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict (e.g., idempotency key conflict or other concurrency issue)',
    type: ErrorResponseDto,
  })
  @ApiBody({
    schema: {
      example: {
        productBatchId: 'pb-uuid',
        locationId: 'loc-uuid',
        quantity: 10,
        createdById: 'user-uuid',
        idempotencyKey: 'abc-123',
      },
    },
  })
  @HttpCode(HttpStatus.CREATED)
  async receive(@Body() dto: ReceiveInventoryDto) {
    return this.inventoryService.receiveInventory(dto);
  }

  @Post('dispatch')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Dispatch inventory (sale_issue)' })
  @ApiResponse({
    status: 201,
    description: 'Inventory dispatched',
    type: InventorySuccessResponseDto,
  })
  @ApiResponse({
    status: 200,
    description:
      'Idempotent response when a movement with the same idempotencyKey was already created',
    type: InventoryIdempotentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request (validation) or Not enough stock',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'ProductBatch or Location or User not found',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict (concurrency or idempotency key issues)',
    type: ErrorResponseDto,
  })
  @ApiBody({
    schema: {
      example: {
        productBatchId: 'pb-uuid',
        locationId: 'loc-uuid',
        quantity: 10,
        createdById: 'user-uuid',
        idempotencyKey: 'abc-456',
      },
    },
  })
  @HttpCode(HttpStatus.CREATED)
  async dispatch(@Body() dto: DispatchInventoryDto) {
    return this.inventoryService.dispatchInventory(dto);
  }

  @Post('adjust')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Adjust inventory (manual stock adjustment)' })
  @ApiResponse({
    status: 201,
    description: 'Inventory adjusted',
    type: InventorySuccessResponseDto,
  })
  @ApiResponse({
    status: 200,
    description:
      'Idempotent response when a movement with the same idempotencyKey was already created',
    type: InventoryIdempotentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or bad request',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'ProductBatch or Location or User not found',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict (e.g., idempotency key conflict)',
    type: ErrorResponseDto,
  })
  @ApiBody({
    schema: {
      example: {
        productBatchId: 'pb-uuid',
        locationId: 'loc-uuid',
        adjustmentQuantity: 5,
        createdById: 'user-uuid',
        idempotencyKey: 'adjust-123',
        reason: 'count_error',
        note: 'Found 5 extra items during physical count',
      },
    },
  })
  @HttpCode(HttpStatus.CREATED)
  async adjust(@Body() dto: AdjustInventoryDto) {
    return this.inventoryService.adjustInventory(dto);
  }

  @Post('transfer')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Transfer inventory between two locations' })
  @ApiResponse({
    status: 201,
    description: 'Inventory transferred',
    type: InventoryTransferResponseDto,
  })
  @ApiResponse({
    status: 200,
    description:
      'Idempotent response when a movement with the same idempotencyKey was already created',
    type: InventoryIdempotentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request (validation) or Not enough stock',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'ProductBatch or Location or User not found',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict (concurrency or idempotency key issues)',
    type: ErrorResponseDto,
  })
  @ApiBody({
    schema: {
      example: {
        productBatchId: 'pb-uuid',
        fromLocationId: 'from-loc-uuid',
        toLocationId: 'to-loc-uuid',
        quantity: 10,
        createdById: 'user-uuid',
        idempotencyKey: 'transfer-123',
        note: 'Moving stock to different warehouse section',
      },
    },
  })
  @HttpCode(HttpStatus.CREATED)
  async transfer(@Body() dto: TransferInventoryDto) {
    return this.inventoryService.transferInventory(dto);
  }
}
