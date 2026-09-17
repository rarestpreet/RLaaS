import { ServiceHealth, ServiceName } from '../types/health';

/**
 * Fetch health of a specific service using the ?serviceName query parameter.
 * Example: /health?serviceName=REDIS
 */
export async function fetchServiceHealth(serviceName: ServiceName = 'REDIS'): Promise<ServiceHealth> {
  try {
    const res = await fetch(`/health?serviceName=${encodeURIComponent(serviceName)}`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err: any) {
    // Fallback if backend or service is completely unreachable
    return {
      serviceName,
      healthy: false,
      status: 'DOWN',
      lastCheckedAt: new Date().toISOString(),
      latencyMs: 0,
      errorDetails: err?.message || 'Connection unreachable',
    };
  }
}

export const fetchRedisHealth = () => fetchServiceHealth('REDIS');
