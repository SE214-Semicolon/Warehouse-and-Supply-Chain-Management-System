import { PartialType, OmitType } from '@nestjs/swagger';
import { BaseProductDto } from './base-product.dto';

export class UpdateProductDto extends PartialType(OmitType(BaseProductDto, [] as const)) {}
