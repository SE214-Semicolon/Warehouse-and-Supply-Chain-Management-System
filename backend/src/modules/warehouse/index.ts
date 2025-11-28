// Module
export { WarehouseModule } from './warehouse.module';

// Controllers
export { WarehouseController } from './controllers/warehouse.controller';
export { LocationController } from './controllers/location.controller';

// Services
export { WarehouseService } from './services/warehouse.service';
export { LocationService } from './services/location.service';

// Repositories
export { WarehouseRepository } from './repositories/warehouse.repository';
export { LocationRepository } from './repositories/location.repository';

// Entities
export { WarehouseEntity } from './entities/warehouse.entity';
export { LocationEntity } from './entities/location.entity';

// Interfaces
export type { IWarehouseRepository } from './interfaces/warehouse-repository.interface';
export type { ILocationRepository } from './interfaces/location-repository.interface';

// DTOs - Warehouse
export { CreateWarehouseDto } from './dto/create-warehouse.dto';
export { UpdateWarehouseDto } from './dto/update-warehouse.dto';
export { QueryWarehouseDto } from './dto/query-warehouse.dto';

// DTOs - Location
export { CreateLocationDto } from './dto/create-location.dto';
export { UpdateLocationDto } from './dto/update-location.dto';
export { QueryLocationDto } from './dto/query-location.dto';
