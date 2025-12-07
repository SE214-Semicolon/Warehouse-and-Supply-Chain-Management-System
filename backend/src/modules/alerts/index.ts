// Module
export { AlertsModule } from './alerts.module';

// Controllers
export { AlertController } from './controllers/alert.controller';

// Services
export { AlertService } from './services/alert.service';
export { AlertGenerationService } from './services/alert-generation.service';
export { AlertSchedulerService } from './services/alert-scheduler.service';

// Repositories
export { AlertRepository } from './repositories/alert.repository';

// DTOs
export { CreateAlertDto } from './dto/create-alert.dto';
export { QueryAlertDto } from './dto/query-alert.dto';
export {
  AlertResponseDto,
  AlertListResponseDto,
  UnreadCountResponseDto,
} from './dto/alert-response.dto';

// Interfaces
export type { IAlertRepository } from './interfaces/alert-repository.interface';
export type { QueryAlertFilters } from './interfaces/alert-repository.interface';
export type { AlertDocument } from './interfaces/alert-repository.interface';

// Schemas
export { Alert, AlertSchema } from './schemas/alert.schema';

// Enums
export { AlertType, AlertSeverity, RelatedEntityType } from './schemas/alert.schema';
