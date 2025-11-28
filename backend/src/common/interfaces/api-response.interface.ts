export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata: ApiMetadata;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  stack?: string;
}

export interface ApiMetadata {
  timestamp: string;
  path: string;
  duration?: number;
  correlationId?: string;
  user?: string;
}
