
import { Request, Response, NextFunction } from 'express';

interface PerformanceMetrics {
  requests: number;
  errors: number;
  avgResponseTime: number;
  memoryUsage: NodeJS.MemoryUsage;
}

const metrics: PerformanceMetrics = {
  requests: 0,
  errors: 0,
  avgResponseTime: 0,
  memoryUsage: process.memoryUsage()
};

const responseTimes: number[] = [];

export const performanceMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    metrics.requests++;
    
    if (res.statusCode >= 400) {
      metrics.errors++;
    }
    
    // Track response times (keep last 100)
    responseTimes.push(responseTime);
    if (responseTimes.length > 100) {
      responseTimes.shift();
    }
    
    // Calculate average response time
    metrics.avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    metrics.memoryUsage = process.memoryUsage();
  });
  
  next();
};

export const getMetrics = (): PerformanceMetrics => metrics;

export const resetMetrics = () => {
  metrics.requests = 0;
  metrics.errors = 0;
  metrics.avgResponseTime = 0;
  responseTimes.length = 0;
};
