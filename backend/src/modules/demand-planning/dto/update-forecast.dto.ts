import { PartialType } from '@nestjs/swagger';
import { CreateForecastDto } from './create-forecast.dto';

export class UpdateForecastDto extends PartialType(CreateForecastDto) {}
