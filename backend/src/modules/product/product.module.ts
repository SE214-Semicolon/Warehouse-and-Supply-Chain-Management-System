import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { ProductCategoryController } from './controllers/product-category.controller';
import { ProductController } from './controllers/product.controller';
import { ProductBatchController } from './controllers/product-batch.controller';
import { ProductCategoryService } from './services/product-category.service';
import { ProductService } from './services/product.service';
import { ProductBatchService } from './services/product-batch.service';
import { ProductCategoryRepository } from './repositories/product-category.repository';
import { ProductRepository } from './repositories/product.repository';
import { ProductBatchRepository } from './repositories/product-batch.repository';

@Module({
  imports: [PrismaModule],
  controllers: [ProductCategoryController, ProductController, ProductBatchController],
  providers: [
    ProductCategoryService,
    ProductService,
    ProductBatchService,
    ProductCategoryRepository,
    ProductRepository,
    ProductBatchRepository,
  ],
  exports: [ProductService, ProductBatchService, ProductCategoryService],
})
export class ProductModule {}
