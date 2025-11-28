// Module
export { ProductModule } from './product.module';

// Services
export { ProductService } from './services/product.service';
export { ProductBatchService } from './services/product-batch.service';
export { ProductCategoryService } from './services/product-category.service';

// Controllers
export { ProductController } from './controllers/product.controller';
export { ProductBatchController } from './controllers/product-batch.controller';
export { ProductCategoryController } from './controllers/product-category.controller';

// DTOs
export { BaseProductDto } from './dto/base-product.dto';
export { CreateProductDto } from './dto/create-product.dto';
export { UpdateProductDto } from './dto/update-product.dto';
export { QueryProductDto } from './dto/query-product.dto';
export {
  ProductResponseDto,
  ProductListResponseDto,
  ProductDeleteResponseDto,
} from './dto/product-response.dto';
export { CreateProductBatchDto } from './dto/create-product-batch.dto';
export { UpdateProductBatchDto } from './dto/update-product-batch.dto';
export { QueryProductBatchDto } from './dto/query-product-batch.dto';
export {
  ProductBatchResponseDto,
  ProductBatchListResponseDto,
  ProductBatchDeleteResponseDto,
} from './dto/product-batch-response.dto';
export { CreateCategoryDto } from './dto/create-category.dto';
export { UpdateCategoryDto } from './dto/update-category.dto';
export { QueryCategoryDto } from './dto/query-category.dto';
export {
  ProductCategoryResponseDto,
  ProductCategoryListResponseDto,
  ProductCategoryDeleteResponseDto,
} from './dto/product-category-response.dto';

// Entities
export { ProductEntity } from './entities/product.entity';
export { ProductBatchEntity } from './entities/product-batch.entity';
export { ProductCategoryEntity } from './entities/product-category.entity';

// Interfaces
export type { IProductRepository } from './interfaces/product-repository.interface';
export type { IProductBatchRepository } from './interfaces/product-batch-repository.interface';
export type { IProductCategoryRepository } from './interfaces/product-category-repository.interface';

// Repositories
export { ProductRepository } from './repositories/product.repository';
export { ProductBatchRepository } from './repositories/product-batch.repository';
export { ProductCategoryRepository } from './repositories/product-category.repository';
