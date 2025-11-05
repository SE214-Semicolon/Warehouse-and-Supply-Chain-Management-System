// Module
export { InventoryModule } from './inventory.module';

// Controllers
export { InventoryController } from './controllers/inventory.controller';

// Services
export { InventoryService } from './services/inventory.service';

// Repositories
export { InventoryRepository } from './repositories/inventory.repository';

// Entities
export { InventoryEntity } from './entities/inventory.entity';
export { StockMovementEntity } from './entities/stock-movement.entity';

// Interfaces
export type { IInventoryRepository } from './interfaces/inventory-repository.interface';

// DTOs - Input
export { ReceiveInventoryDto } from './dto/receive-inventory.dto';
export { DispatchInventoryDto } from './dto/dispatch-inventory.dto';
export { AdjustInventoryDto } from './dto/adjust-inventory.dto';
export { TransferInventoryDto } from './dto/transfer-inventory.dto';
export { ReserveInventoryDto } from './dto/reserve-inventory.dto';
export { ReleaseReservationDto } from './dto/release-reservation.dto';
export { QueryByLocationDto } from './dto/query-by-location.dto';
export { QueryByProductBatchDto } from './dto/query-by-product-batch.dto';
export { UpdateQuantityDto } from './dto/update-quantity.dto';
export { AlertQueryDto } from './dto/alert-query.dto';
export { StockLevelReportDto, MovementReportDto, ValuationReportDto } from './dto/report-query.dto';

// DTOs - Response
export {
  InventorySuccessResponseDto,
  InventoryIdempotentResponseDto,
  InventoryTransferResponseDto,
  InventoryReservationResponseDto,
  InventoryQueryResponseDto,
  ErrorResponseDto,
} from './dto/response.dto';

// Base DTOs
export { InventoryDto } from './dto/inventory.dto';
export { MovementDto } from './dto/movement.dto';
