import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/database/prisma/prisma.module';
import { InventoryModule } from '../inventory/inventory.module';
import { CacheModule } from 'src/cache/cache.module';

// Controllers
import { CustomerController } from './controllers/customer.controller';
import { SalesOrderController } from './controllers/sales-order.controller';

// Services
import { CustomerService } from './services/customer.service';
import { SalesOrderService } from './services/sales-order.service';

// Repositories
import { CustomerRepository } from './repositories/customer.repository';
import { SalesOrderRepository } from './repositories/sales-order.repository';

@Module({
  imports: [PrismaModule, InventoryModule, CacheModule],
  controllers: [CustomerController, SalesOrderController],
  providers: [CustomerService, CustomerRepository, SalesOrderService, SalesOrderRepository],
  exports: [CustomerService, SalesOrderService, CustomerRepository, SalesOrderRepository],
})
export class SalesModule {}
