export type ServiceName = 'REDIS' | 'DATABASE' | 'MAIL';

export interface ServiceHealth {
  serviceName: ServiceName;
  healthy: boolean;
  status: 'UP' | 'DOWN';
  lastCheckedAt: string;
  latencyMs: number;
  errorDetails?: string | null;
}
