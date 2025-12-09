export const CACHE_TTL = {
  DEFAULT: 3600, // 1 hour
  SHORT: 300, // 5 minutes
  MEDIUM: 1800, // 30 minutes
  LONG: 86400, // 24 hours
  WEEK: 604800, // 7 days
} as const;

export const CACHE_PREFIX = {
  PRODUCT: 'product:',
  INVENTORY: 'inventory:',
  WAREHOUSE: 'warehouse:',
  CATEGORY: 'category:',
  USER: 'user:',
  METRICS: 'metrics:',
  ALERT: 'alert:',
  FORECAST: 'forecast:',
} as const;
