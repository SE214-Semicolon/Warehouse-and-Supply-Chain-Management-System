import { AlertType, AlertSeverity } from '../schemas/alert.schema';

export interface CreateAlertDto {
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  relatedEntity?: {
    type: 'Product' | 'Inventory' | 'PurchaseOrder' | 'SalesOrder';
    id: string;
  };
}

export interface QueryAlertFilters {
  type?: AlertType;
  severity?: AlertSeverity;
  isRead?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AlertDocument {
  _id: any;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  isRead: boolean;
  relatedEntity?: {
    type: string;
    id: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface IAlertRepository {
  /**
   * Create a new alert record
   */
  write(data: CreateAlertDto): Promise<AlertDocument>;

  /**
   * Find alert by ID
   */
  findById(id: string): Promise<AlertDocument | null>;

  /**
   * Query alerts with filters and pagination
   */
  query(filters: QueryAlertFilters): Promise<{
    alerts: AlertDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;

  /**
   * Mark alert as read
   */
  markAsRead(id: string): Promise<AlertDocument | null>;

  /**
   * Delete alert by ID
   */
  delete(id: string): Promise<boolean>;

  /**
   * Get unread alert count
   */
  getUnreadCount(filters?: { type?: AlertType; severity?: AlertSeverity }): Promise<number>;
}
