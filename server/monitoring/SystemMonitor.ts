
import type { 
  PerformanceMetrics, 
  SystemHealth, 
  AlertConfig,
  MonitoringThreshold 
} from '../../system_config/types.js';
import SystemConfigurationManager from '../../system_config/config-loader.js';

export interface PerformanceSnapshot {
  timestamp: Date;
  cpu: number;
  memory: number;
  activeConnections: number;
  responseTime: number;
  errorRate: number;
  throughput: number;
}

export interface AlertEvent {
  id: string;
  type: 'performance' | 'security' | 'error' | 'business';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  metadata: Record<string, any>;
  resolved: boolean;
}

class SystemMonitor {
  private static instance: SystemMonitor;
  private configManager: SystemConfigurationManager;
  private performanceHistory: PerformanceSnapshot[] = [];
  private activeAlerts: Map<string, AlertEvent> = new Map();
  private monitoringInterval?: NodeJS.Timeout;

  private constructor() {
    this.configManager = SystemConfigurationManager.getInstance();
    this.startMonitoring();
  }

  public static getInstance(): SystemMonitor {
    if (!SystemMonitor.instance) {
      SystemMonitor.instance = new SystemMonitor();
    }
    return SystemMonitor.instance;
  }

  /**
   * Start system monitoring
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
      this.evaluateThresholds();
    }, 30000); // Every 30 seconds
  }

  /**
   * Collect system performance metrics
   */
  private async collectMetrics(): Promise<void> {
    const snapshot: PerformanceSnapshot = {
      timestamp: new Date(),
      cpu: await this.getCPUUsage(),
      memory: await this.getMemoryUsage(),
      activeConnections: await this.getActiveConnections(),
      responseTime: await this.getAverageResponseTime(),
      errorRate: await this.getErrorRate(),
      throughput: await this.getThroughput()
    };

    this.performanceHistory.push(snapshot);

    // Keep only last 1000 snapshots
    if (this.performanceHistory.length > 1000) {
      this.performanceHistory = this.performanceHistory.slice(-1000);
    }
  }

  /**
   * Evaluate monitoring thresholds
   */
  private evaluateThresholds(): void {
    try {
      const ciCdConfig = this.configManager.getCiCdHooks();
      const thresholds = ciCdConfig.monitoring?.performanceThresholds;

      if (!thresholds || this.performanceHistory.length === 0) return;

    const latest = this.performanceHistory[this.performanceHistory.length - 1];

    // Check CPU threshold
    if (latest.cpu > thresholds.cpu.warning) {
      this.createAlert('performance', 'high', `CPU usage at ${latest.cpu}%`, {
        metric: 'cpu',
        value: latest.cpu,
        threshold: thresholds.cpu.warning
      });
    }

    // Check memory threshold
    if (latest.memory > thresholds.memory.warning) {
      this.createAlert('performance', 'high', `Memory usage at ${latest.memory}%`, {
        metric: 'memory',
        value: latest.memory,
        threshold: thresholds.memory.warning
      });
    }

    // Check response time threshold
    if (latest.responseTime > thresholds.responseTime.warning) {
      this.createAlert('performance', 'medium', `Response time at ${latest.responseTime}ms`, {
        metric: 'responseTime',
        value: latest.responseTime,
        threshold: thresholds.responseTime.warning
      });
    }

    // Check error rate threshold
    if (latest.errorRate > thresholds.errorRate.warning) {
      this.createAlert('error', 'high', `Error rate at ${latest.errorRate}%`, {
        metric: 'errorRate',
        value: latest.errorRate,
        threshold: thresholds.errorRate.warning
      });
    }
    } catch (error) {
      // Silently handle configuration not ready - monitoring will continue when config is available
      console.debug('SystemMonitor: Configuration not ready yet, skipping threshold evaluation');
    }
  }

  /**
   * Create system alert
   */
  private createAlert(
    type: AlertEvent['type'],
    severity: AlertEvent['severity'],
    message: string,
    metadata: Record<string, any>
  ): void {
    const alertId = `${type}_${Date.now()}`;
    const alert: AlertEvent = {
      id: alertId,
      type,
      severity,
      message,
      timestamp: new Date(),
      metadata,
      resolved: false
    };

    this.activeAlerts.set(alertId, alert);
    this.notifyAlert(alert);
  }

  /**
   * Notify about alert
   */
  private async notifyAlert(alert: AlertEvent): Promise<void> {
    console.log(`🚨 ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`);
    
    // Could integrate with external alerting systems here
    // e.g., Slack, email, PagerDuty, etc.
  }

  /**
   * Get system health overview
   */
  public getSystemHealth(): SystemHealth {
    const latest = this.performanceHistory[this.performanceHistory.length - 1];
    const activeAlertCount = Array.from(this.activeAlerts.values())
      .filter(alert => !alert.resolved).length;

    if (!latest) {
      return { status: 'unknown', score: 0 };
    }

    let score = 100;
    
    // Deduct points based on metrics
    if (latest.cpu > 80) score -= 20;
    if (latest.memory > 85) score -= 20;
    if (latest.responseTime > 1000) score -= 15;
    if (latest.errorRate > 5) score -= 25;
    if (activeAlertCount > 0) score -= (activeAlertCount * 10);

    const status = score > 80 ? 'healthy' : 
                  score > 60 ? 'warning' : 
                              'critical';

    return {
      status,
      score: Math.max(0, score),
      metrics: latest,
      activeAlerts: activeAlertCount
    };
  }

  /**
   * Get performance metrics for time range
   */
  public getPerformanceMetrics(hours: number = 24): PerformanceMetrics {
    const cutoff = new Date(Date.now() - (hours * 60 * 60 * 1000));
    const relevantSnapshots = this.performanceHistory
      .filter(snapshot => snapshot.timestamp >= cutoff);

    if (relevantSnapshots.length === 0) {
      return {
        averageCpu: 0,
        averageMemory: 0,
        averageResponseTime: 0,
        errorRate: 0,
        throughput: 0
      };
    }

    return {
      averageCpu: this.average(relevantSnapshots.map(s => s.cpu)),
      averageMemory: this.average(relevantSnapshots.map(s => s.memory)),
      averageResponseTime: this.average(relevantSnapshots.map(s => s.responseTime)),
      errorRate: this.average(relevantSnapshots.map(s => s.errorRate)),
      throughput: this.average(relevantSnapshots.map(s => s.throughput))
    };
  }

  /**
   * Get active alerts
   */
  public getActiveAlerts(): AlertEvent[] {
    return Array.from(this.activeAlerts.values())
      .filter(alert => !alert.resolved)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Resolve alert
   */
  public resolveAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      return true;
    }
    return false;
  }

  // Utility methods for metric collection
  private async getCPUUsage(): Promise<number> {
    // Simplified CPU usage calculation
    return Math.random() * 100; // Replace with actual CPU monitoring
  }

  private async getMemoryUsage(): Promise<number> {
    const usage = process.memoryUsage();
    const totalMem = 1024 * 1024 * 1024; // 1GB assumed
    return (usage.heapUsed / totalMem) * 100;
  }

  private async getActiveConnections(): Promise<number> {
    // Return mock data - integrate with actual connection tracking
    return Math.floor(Math.random() * 100);
  }

  private async getAverageResponseTime(): Promise<number> {
    // Mock response time - integrate with actual request tracking
    return Math.random() * 500;
  }

  private async getErrorRate(): Promise<number> {
    // Mock error rate - integrate with actual error tracking
    return Math.random() * 10;
  }

  private async getThroughput(): Promise<number> {
    // Mock throughput - integrate with actual request counting
    return Math.random() * 1000;
  }

  private average(numbers: number[]): number {
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  }

  /**
   * Stop monitoring
   */
  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
  }
}

export default SystemMonitor;
