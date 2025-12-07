import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AlertGenerationService } from './alert-generation.service';

@Injectable()
export class AlertSchedulerService {
  private readonly logger = new Logger(AlertSchedulerService.name);

  constructor(private readonly alertGenService: AlertGenerationService) {}

  /**
   * Scan for low stock alerts daily at 8:00 AM
   * Backup mechanism to catch any missed real-time alerts
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async scanLowStockAlerts() {
    this.logger.log('Starting scheduled low stock alert scan...');

    try {
      const alertsCreated = await this.alertGenService.generateLowStockAlerts();
      this.logger.log(`Low stock scan completed: ${alertsCreated} alerts created`);
    } catch (error) {
      this.logger.error('Low stock scan failed:', error);
    }
  }

  /**
   * Scan for expiring products daily at 8:30 AM
   * Check all products expiring within 30 days
   */
  @Cron(CronExpression.EVERY_DAY_AT_NOON)
  async scanExpiryAlerts() {
    this.logger.log('Starting scheduled expiry alert scan...');

    try {
      const alertsCreated = await this.alertGenService.generateExpiryAlerts();
      this.logger.log(`Expiry scan completed: ${alertsCreated} alerts created`);
    } catch (error) {
      this.logger.error('Expiry scan failed:', error);
    }
  }
}
