
import type { Request, Response, NextFunction } from 'express';
import type { RedFlagConfig } from '../../system_config/types.js';
import SystemConfigurationManager from '../../system_config/config-loader.js';

export interface RedFlagMatch {
  severity: 'critical' | 'medium' | 'low';
  pattern: string;
  reason: string;
  context: string;
}

export interface RedFlagDetectionResult {
  flagged: boolean;
  matches: RedFlagMatch[];
  actionTaken: string;
}

class RedFlagDetector {
  private static instance: RedFlagDetector;
  private configManager: SystemConfigurationManager;

  private constructor() {
    this.configManager = SystemConfigurationManager.getInstance();
  }

  public static getInstance(): RedFlagDetector {
    if (!RedFlagDetector.instance) {
      RedFlagDetector.instance = new RedFlagDetector();
    }
    return RedFlagDetector.instance;
  }

  /**
   * Scan text for red flag patterns
   */
  public scanText(text: string, context: string = ''): RedFlagDetectionResult {
    const config = this.configManager.getRedFlagDetection();
    const matches: RedFlagMatch[] = [];

    // Scan for critical patterns
    config.critical.forEach(rule => {
      if (this.matchesPattern(text, rule.pattern)) {
        matches.push({
          severity: 'critical',
          pattern: rule.pattern,
          reason: rule.reason,
          context: this.extractContext(text, rule.pattern, 50)
        });
      }
    });

    // Scan for medium severity patterns
    config.medium.forEach(rule => {
      if (this.matchesPattern(text, rule.pattern)) {
        matches.push({
          severity: 'medium',
          pattern: rule.pattern,
          reason: rule.reason,
          context: this.extractContext(text, rule.pattern, 50)
        });
      }
    });

    // Scan for low severity patterns
    config.low.forEach(rule => {
      if (this.matchesPattern(text, rule.pattern)) {
        matches.push({
          severity: 'low',
          pattern: rule.pattern,
          reason: rule.reason,
          context: this.extractContext(text, rule.pattern, 50)
        });
      }
    });

    const actionTaken = this.determineAction(matches);

    return {
      flagged: matches.length > 0,
      matches,
      actionTaken
    };
  }

  /**
   * Detect potential prompt injection
   */
  public detectPromptInjection(text: string): boolean {
    const injectionPatterns = [
      /ignore\s+previous\s+instructions/i,
      /forget\s+everything\s+above/i,
      /system\s*:\s*you\s+are/i,
      /\[\s*system\s*\]/i,
      /override\s+security\s+protocols/i,
      /disregard\s+safety\s+guidelines/i,
      /act\s+as\s+if\s+you\s+are/i,
      /pretend\s+to\s+be/i,
      /role\s*:\s*admin/i,
      /sudo\s+mode/i
    ];

    return injectionPatterns.some(pattern => pattern.test(text));
  }

  /**
   * Detect potential code injection
   */
  public detectCodeInjection(text: string): boolean {
    const codeInjectionPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript\s*:/i,
      /on\w+\s*=/i,
      /eval\s*\(/i,
      /setTimeout\s*\(/i,
      /setInterval\s*\(/i,
      /Function\s*\(/i,
      /document\.write/i,
      /innerHTML\s*=/i,
      /outerHTML\s*=/i
    ];

    return codeInjectionPatterns.some(pattern => pattern.test(text));
  }

  /**
   * Create middleware for request scanning
   */
  public createMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        // Scan request body for red flags
        if (req.body && typeof req.body === 'object') {
          const bodyText = JSON.stringify(req.body);
          const bodyResult = this.scanText(bodyText, 'request_body');
          
          if (bodyResult.flagged) {
            this.logRedFlagDetection('request', req, bodyResult);
            
            // Check for critical issues
            const hasCritical = bodyResult.matches.some(m => m.severity === 'critical');
            if (hasCritical) {
              return res.status(400).json({
                success: false,
                message: 'Request blocked due to security concerns',
                flagged: true
              });
            }
          }
        }

        // Scan query parameters
        if (req.query && Object.keys(req.query).length > 0) {
          const queryText = new URLSearchParams(req.query as any).toString();
          const queryResult = this.scanText(queryText, 'query_params');
          
          if (queryResult.flagged) {
            this.logRedFlagDetection('query', req, queryResult);
          }
        }

        // Check for prompt injection in user input
        const userInputFields = ['message', 'content', 'description', 'comment', 'notes'];
        for (const field of userInputFields) {
          if (req.body && req.body[field]) {
            const isPromptInjection = this.detectPromptInjection(req.body[field]);
            const isCodeInjection = this.detectCodeInjection(req.body[field]);
            
            if (isPromptInjection || isCodeInjection) {
              this.logSecurityEvent('injection_attempt', req, {
                field,
                type: isPromptInjection ? 'prompt_injection' : 'code_injection',
                content: req.body[field].substring(0, 100)
              });
              
              return res.status(400).json({
                success: false,
                message: 'Input blocked due to security concerns',
                flagged: true
              });
            }
          }
        }

        next();
      } catch (error) {
        console.error('Error in red flag detection middleware:', error);
        next(); // Continue processing even if red flag detection fails
      }
    };
  }

  /**
   * Check if text matches a pattern
   */
  private matchesPattern(text: string, pattern: string): boolean {
    const lowerText = text.toLowerCase();
    const lowerPattern = pattern.toLowerCase();
    
    // Simple substring matching for now
    // Could be extended to support regex patterns
    return lowerText.includes(lowerPattern);
  }

  /**
   * Extract context around a matched pattern
   */
  private extractContext(text: string, pattern: string, contextLength: number): string {
    const lowerText = text.toLowerCase();
    const lowerPattern = pattern.toLowerCase();
    const index = lowerText.indexOf(lowerPattern);
    
    if (index === -1) return '';
    
    const start = Math.max(0, index - contextLength);
    const end = Math.min(text.length, index + pattern.length + contextLength);
    
    return text.substring(start, end);
  }

  /**
   * Determine action based on matches
   */
  private determineAction(matches: RedFlagMatch[]): string {
    if (matches.some(m => m.severity === 'critical')) {
      return 'block_request';
    } else if (matches.some(m => m.severity === 'medium')) {
      return 'alert_admin';
    } else if (matches.some(m => m.severity === 'low')) {
      return 'log_event';
    }
    return 'none';
  }

  /**
   * Log red flag detection
   */
  private logRedFlagDetection(
    type: string,
    req: Request,
    result: RedFlagDetectionResult
  ): void {
    console.warn(`🚨 Red Flag Detection - ${type.toUpperCase()}:`, {
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
      matches: result.matches.map(m => ({
        severity: m.severity,
        pattern: m.pattern,
        reason: m.reason,
        context: m.context.substring(0, 100) // Limit context length in logs
      })),
      actionTaken: result.actionTaken
    });
  }

  /**
   * Log security event
   */
  private logSecurityEvent(
    eventType: string,
    req: Request,
    details: Record<string, any>
  ): void {
    console.warn(`🔒 Security Event - ${eventType.toUpperCase()}:`, {
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
      userId: (req as any).user?.id || 'anonymous',
      details
    });
  }
}

// Export middleware function
export const redFlagDetectionMiddleware = () => {
  const detector = RedFlagDetector.getInstance();
  return detector.createMiddleware();
};

export default RedFlagDetector;
