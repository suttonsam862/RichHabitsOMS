
import type { SecurityEvent, ThreatLevel } from '../../system_config/types.js';
import SystemConfigurationManager from '../../system_config/config-loader.js';

export interface SecurityAlert {
  id: string;
  type: 'authentication_failure' | 'suspicious_access' | 'data_breach' | 'unauthorized_access';
  threatLevel: ThreatLevel;
  description: string;
  sourceIp?: string;
  userId?: string;
  timestamp: Date;
  metadata: Record<string, any>;
  resolved: boolean;
}

export interface AccessPattern {
  userId: string;
  ipAddress: string;
  userAgent: string;
  endpoint: string;
  timestamp: Date;
  success: boolean;
}

class SecurityMonitor {
  private static instance: SecurityMonitor;
  private configManager: SystemConfigurationManager;
  private securityAlerts: Map<string, SecurityAlert> = new Map();
  private accessPatterns: AccessPattern[] = [];
  private failedAttempts: Map<string, number> = new Map();

  private constructor() {
    this.configManager = SystemConfigurationManager.getInstance();
  }

  public static getInstance(): SecurityMonitor {
    if (!SecurityMonitor.instance) {
      SecurityMonitor.instance = new SecurityMonitor();
    }
    return SecurityMonitor.instance;
  }

  /**
   * Log access attempt
   */
  public logAccessAttempt(
    userId: string | null,
    ipAddress: string,
    userAgent: string,
    endpoint: string,
    success: boolean
  ): void {
    const pattern: AccessPattern = {
      userId: userId || 'anonymous',
      ipAddress,
      userAgent,
      endpoint,
      timestamp: new Date(),
      success
    };

    this.accessPatterns.push(pattern);

    // Keep only last 10000 patterns
    if (this.accessPatterns.length > 10000) {
      this.accessPatterns = this.accessPatterns.slice(-10000);
    }

    // Track failed attempts
    if (!success) {
      const key = `${ipAddress}_${userId || 'anonymous'}`;
      const currentFailures = this.failedAttempts.get(key) || 0;
      this.failedAttempts.set(key, currentFailures + 1);

      // Check for brute force attempts
      if (currentFailures >= 5) {
        this.createSecurityAlert(
          'authentication_failure',
          'high',
          `Multiple failed login attempts from ${ipAddress}`,
          { ipAddress, userId, attempts: currentFailures + 1 }
        );
      }
    } else {
      // Reset failed attempts on successful login
      const key = `${ipAddress}_${userId || 'anonymous'}`;
      this.failedAttempts.delete(key);
    }

    // Analyze access patterns
    this.analyzeAccessPatterns(pattern);
  }

  /**
   * Analyze access patterns for suspicious activity
   */
  private analyzeAccessPatterns(newPattern: AccessPattern): void {
    const securityPolicies = this.configManager.getSecurityPolicies();
    const recentPatterns = this.accessPatterns
      .filter(p => p.timestamp > new Date(Date.now() - 5 * 60 * 1000)) // Last 5 minutes
      .filter(p => p.ipAddress === newPattern.ipAddress);

    // Check for rapid requests (potential DDoS)
    if (recentPatterns.length > 100) {
      this.createSecurityAlert(
        'suspicious_access',
        'high',
        `High request volume from ${newPattern.ipAddress}`,
        { 
          ipAddress: newPattern.ipAddress,
          requestCount: recentPatterns.length,
          timeWindow: '5 minutes'
        }
      );
    }

    // Check for access from unusual locations
    const userPatterns = this.accessPatterns
      .filter(p => p.userId === newPattern.userId && p.success)
      .slice(-50); // Last 50 successful accesses

    const commonIps = this.getMostCommonIps(userPatterns);
    if (commonIps.length > 0 && !commonIps.includes(newPattern.ipAddress)) {
      this.createSecurityAlert(
        'suspicious_access',
        'medium',
        `Access from unusual IP address for user ${newPattern.userId}`,
        {
          userId: newPattern.userId,
          ipAddress: newPattern.ipAddress,
          commonIps
        }
      );
    }

    // Check for privilege escalation attempts
    if (newPattern.endpoint.includes('/admin') && !newPattern.success) {
      this.createSecurityAlert(
        'unauthorized_access',
        'medium',
        `Unauthorized admin access attempt`,
        {
          userId: newPattern.userId,
          ipAddress: newPattern.ipAddress,
          endpoint: newPattern.endpoint
        }
      );
    }
  }

  /**
   * Create security alert
   */
  private createSecurityAlert(
    type: SecurityAlert['type'],
    threatLevel: ThreatLevel,
    description: string,
    metadata: Record<string, any>
  ): void {
    const alertId = `security_${type}_${Date.now()}`;
    const alert: SecurityAlert = {
      id: alertId,
      type,
      threatLevel,
      description,
      timestamp: new Date(),
      metadata,
      resolved: false,
      sourceIp: metadata.ipAddress,
      userId: metadata.userId
    };

    this.securityAlerts.set(alertId, alert);
    this.notifySecurityAlert(alert);
  }

  /**
   * Notify about security alert
   */
  private async notifySecurityAlert(alert: SecurityAlert): Promise<void> {
    console.log(`🚨 SECURITY ALERT [${alert.threatLevel.toUpperCase()}]: ${alert.description}`);
    
    // For critical threats, could integrate with external security systems
    if (alert.threatLevel === 'critical') {
      // Block IP, notify security team, etc.
    }
  }

  /**
   * Get security alerts
   */
  public getSecurityAlerts(limit: number = 50): SecurityAlert[] {
    return Array.from(this.securityAlerts.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get threat intelligence summary
   */
  public getThreatIntelligence(): any {
    const alerts = Array.from(this.securityAlerts.values());
    const recentAlerts = alerts.filter(
      alert => alert.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000)
    );

    const threatsByLevel = recentAlerts.reduce((acc, alert) => {
      acc[alert.threatLevel] = (acc[alert.threatLevel] || 0) + 1;
      return acc;
    }, {} as Record<ThreatLevel, number>);

    const topThreats = recentAlerts
      .reduce((acc, alert) => {
        const key = alert.sourceIp || alert.userId || 'unknown';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    return {
      totalAlerts: recentAlerts.length,
      threatsByLevel,
      topThreats: Object.entries(topThreats)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10),
      riskScore: this.calculateRiskScore(recentAlerts)
    };
  }

  /**
   * Calculate overall security risk score
   */
  private calculateRiskScore(alerts: SecurityAlert[]): number {
    let score = 0;
    
    alerts.forEach(alert => {
      switch (alert.threatLevel) {
        case 'low': score += 1; break;
        case 'medium': score += 3; break;
        case 'high': score += 7; break;
        case 'critical': score += 15; break;
      }
    });

    return Math.min(100, score); // Cap at 100
  }

  /**
   * Get most common IPs for user patterns
   */
  private getMostCommonIps(patterns: AccessPattern[]): string[] {
    const ipCounts = patterns.reduce((acc, pattern) => {
      acc[pattern.ipAddress] = (acc[pattern.ipAddress] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(ipCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([ip]) => ip);
  }

  /**
   * Resolve security alert
   */
  public resolveAlert(alertId: string): boolean {
    const alert = this.securityAlerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      return true;
    }
    return false;
  }

  /**
   * Block IP address
   */
  public blockIpAddress(ipAddress: string, reason: string): void {
    console.log(`🚫 Blocking IP ${ipAddress}: ${reason}`);
    // Implementation would integrate with firewall/proxy rules
  }

  /**
   * Get access patterns for analysis
   */
  public getAccessPatterns(
    userId?: string,
    ipAddress?: string,
    hours: number = 24
  ): AccessPattern[] {
    const cutoff = new Date(Date.now() - (hours * 60 * 60 * 1000));
    
    return this.accessPatterns
      .filter(pattern => pattern.timestamp >= cutoff)
      .filter(pattern => !userId || pattern.userId === userId)
      .filter(pattern => !ipAddress || pattern.ipAddress === ipAddress);
  }
}

export default SecurityMonitor;
