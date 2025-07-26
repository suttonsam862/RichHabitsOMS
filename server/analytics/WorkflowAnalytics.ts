
import WorkflowEngine from '../workflow/WorkflowEngine.js';
import type { WorkflowState, WorkflowHistoryEntry } from '../workflow/WorkflowEngine.js';

export interface WorkflowMetrics {
  totalWorkflows: number;
  completedWorkflows: number;
  averageCompletionTime: number;
  successRate: number;
  bottlenecks: BottleneckAnalysis[];
  stepPerformance: StepPerformance[];
}

export interface BottleneckAnalysis {
  stepId: string;
  stepName: string;
  averageTimeSpent: number;
  workflowsStuck: number;
  impact: 'low' | 'medium' | 'high';
  recommendations: string[];
}

export interface StepPerformance {
  stepId: string;
  stepName: string;
  totalTransitions: number;
  averageTimeInStep: number;
  successRate: number;
  commonExitPoints: string[];
}

export interface BusinessInsight {
  type: 'efficiency' | 'bottleneck' | 'trend' | 'recommendation';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  actionItems: string[];
  metrics: Record<string, number>;
}

class WorkflowAnalytics {
  private static instance: WorkflowAnalytics;
  private workflowEngine: WorkflowEngine;

  private constructor() {
    this.workflowEngine = WorkflowEngine.getInstance();
  }

  public static getInstance(): WorkflowAnalytics {
    if (!WorkflowAnalytics.instance) {
      WorkflowAnalytics.instance = new WorkflowAnalytics();
    }
    return WorkflowAnalytics.instance;
  }

  /**
   * Analyze workflow completion rates and bottlenecks
   */
  public async analyzeWorkflowPerformance(
    workflowType: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<WorkflowMetrics> {
    const workflows = await this.getWorkflowData(workflowType, startDate, endDate);
    
    const completedWorkflows = workflows.filter(w => 
      w.currentStep === 'completed' || w.currentStep === 'delivered'
    );

    const totalWorkflows = workflows.length;
    const successRate = totalWorkflows > 0 ? (completedWorkflows.length / totalWorkflows) * 100 : 0;

    // Calculate average completion time
    const completionTimes = completedWorkflows
      .map(w => this.calculateWorkflowCompletionTime(w))
      .filter(time => time > 0);

    const averageCompletionTime = completionTimes.length > 0 
      ? completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length
      : 0;

    // Analyze bottlenecks
    const bottlenecks = await this.identifyBottlenecks(workflows);
    
    // Analyze step performance
    const stepPerformance = await this.analyzeStepPerformance(workflows);

    return {
      totalWorkflows,
      completedWorkflows: completedWorkflows.length,
      averageCompletionTime,
      successRate,
      bottlenecks,
      stepPerformance
    };
  }

  /**
   * Generate business process optimization recommendations
   */
  public async generateOptimizationRecommendations(
    workflowType: string
  ): Promise<BusinessInsight[]> {
    const metrics = await this.analyzeWorkflowPerformance(workflowType);
    const insights: BusinessInsight[] = [];

    // Efficiency insights
    if (metrics.averageCompletionTime > this.getExpectedCompletionTime(workflowType)) {
      insights.push({
        type: 'efficiency',
        title: 'Workflow Completion Time Above Target',
        description: `Average completion time is ${Math.round(metrics.averageCompletionTime / 1000 / 60 / 60)} hours, which exceeds the target.`,
        impact: 'high',
        actionItems: [
          'Review and optimize slow steps',
          'Consider automation opportunities',
          'Streamline approval processes'
        ],
        metrics: {
          currentTime: metrics.averageCompletionTime,
          targetTime: this.getExpectedCompletionTime(workflowType)
        }
      });
    }

    // Bottleneck insights
    const highImpactBottlenecks = metrics.bottlenecks.filter(b => b.impact === 'high');
    if (highImpactBottlenecks.length > 0) {
      insights.push({
        type: 'bottleneck',
        title: 'Critical Bottlenecks Identified',
        description: `${highImpactBottlenecks.length} critical bottlenecks are impacting workflow efficiency.`,
        impact: 'high',
        actionItems: highImpactBottlenecks.flatMap(b => b.recommendations),
        metrics: {
          bottleneckCount: highImpactBottlenecks.length,
          affectedWorkflows: highImpactBottlenecks.reduce((sum, b) => sum + b.workflowsStuck, 0)
        }
      });
    }

    // Success rate insights
    if (metrics.successRate < 80) {
      insights.push({
        type: 'efficiency',
        title: 'Low Workflow Success Rate',
        description: `Only ${Math.round(metrics.successRate)}% of workflows complete successfully.`,
        impact: 'high',
        actionItems: [
          'Investigate common failure points',
          'Improve error handling and recovery',
          'Enhance process documentation and training'
        ],
        metrics: {
          successRate: metrics.successRate,
          failedWorkflows: metrics.totalWorkflows - metrics.completedWorkflows
        }
      });
    }

    return insights;
  }

  /**
   * Analyze step transition patterns
   */
  public async analyzeTransitionPatterns(
    workflowType: string
  ): Promise<Record<string, any>> {
    const workflows = await this.getWorkflowData(workflowType);
    const transitionCounts: Record<string, Record<string, number>> = {};
    const loopDetection: Record<string, number> = {};

    workflows.forEach(workflow => {
      for (let i = 0; i < workflow.history.length - 1; i++) {
        const from = workflow.history[i].stepId;
        const to = workflow.history[i + 1].stepId;
        const transitionKey = `${from} -> ${to}`;

        if (!transitionCounts[from]) {
          transitionCounts[from] = {};
        }
        transitionCounts[from][to] = (transitionCounts[from][to] || 0) + 1;

        // Detect loops (same step appearing multiple times)
        if (from === to) {
          loopDetection[from] = (loopDetection[from] || 0) + 1;
        }
      }
    });

    return {
      transitionCounts,
      loopDetection,
      mostCommonPaths: this.findMostCommonPaths(transitionCounts),
      unusualPatterns: this.detectUnusualPatterns(transitionCounts)
    };
  }

  /**
   * Create predictive workflow analytics
   */
  public async generatePredictiveAnalytics(
    workflowType: string
  ): Promise<Record<string, any>> {
    const workflows = await this.getWorkflowData(workflowType);
    const currentTime = new Date();

    // Predict completion times for active workflows
    const activeWorkflows = workflows.filter(w => 
      w.currentStep !== 'completed' && 
      w.currentStep !== 'cancelled' &&
      w.currentStep !== 'delivered'
    );

    const predictions = activeWorkflows.map(workflow => {
      const timeSpentSoFar = currentTime.getTime() - workflow.createdAt.getTime();
      const averageTimeForStep = this.getAverageTimeInStep(workflows, workflow.currentStep);
      const estimatedRemainingTime = this.estimateRemainingTime(workflow, workflows);

      return {
        workflowId: workflow.workflowId,
        currentStep: workflow.currentStep,
        timeSpentSoFar,
        estimatedCompletionTime: currentTime.getTime() + estimatedRemainingTime,
        riskLevel: this.assessCompletionRisk(workflow, workflows)
      };
    });

    // Forecast future demand
    const demandForecast = this.forecastDemand(workflows);

    return {
      activePredictions: predictions,
      demandForecast,
      resourceRecommendations: this.generateResourceRecommendations(predictions)
    };
  }

  /**
   * Get workflow data (mock implementation - replace with actual data access)
   */
  private async getWorkflowData(
    workflowType: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<WorkflowState[]> {
    // This would typically query a database
    // For now, return mock data based on workflow engine's in-memory state
    return [];
  }

  /**
   * Calculate workflow completion time
   */
  private calculateWorkflowCompletionTime(workflow: WorkflowState): number {
    if (workflow.history.length < 2) return 0;
    
    const start = workflow.history[0].timestamp.getTime();
    const end = workflow.history[workflow.history.length - 1].timestamp.getTime();
    
    return end - start;
  }

  /**
   * Identify workflow bottlenecks
   */
  private async identifyBottlenecks(workflows: WorkflowState[]): Promise<BottleneckAnalysis[]> {
    const stepTimes: Record<string, number[]> = {};
    const stepCounts: Record<string, number> = {};
    const stuckWorkflows: Record<string, number> = {};

    workflows.forEach(workflow => {
      workflow.history.forEach((entry, index) => {
        if (index > 0) {
          const timeSpent = entry.timestamp.getTime() - workflow.history[index - 1].timestamp.getTime();
          const stepId = workflow.history[index - 1].stepId;
          
          if (!stepTimes[stepId]) stepTimes[stepId] = [];
          stepTimes[stepId].push(timeSpent);
          stepCounts[stepId] = (stepCounts[stepId] || 0) + 1;
        }
      });

      // Count workflows currently stuck in each step
      const currentStepId = workflow.currentStep;
      const timeInCurrentStep = new Date().getTime() - workflow.updatedAt.getTime();
      
      if (timeInCurrentStep > 24 * 60 * 60 * 1000) { // Stuck for more than 24 hours
        stuckWorkflows[currentStepId] = (stuckWorkflows[currentStepId] || 0) + 1;
      }
    });

    return Object.keys(stepTimes).map(stepId => {
      const times = stepTimes[stepId];
      const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const workflowsStuck = stuckWorkflows[stepId] || 0;
      
      // Determine impact level
      let impact: 'low' | 'medium' | 'high' = 'low';
      if (averageTime > 72 * 60 * 60 * 1000 || workflowsStuck > 5) impact = 'high';
      else if (averageTime > 24 * 60 * 60 * 1000 || workflowsStuck > 2) impact = 'medium';

      const recommendations = this.generateBottleneckRecommendations(stepId, averageTime, workflowsStuck);

      return {
        stepId,
        stepName: this.getStepDisplayName(stepId),
        averageTimeSpent: averageTime,
        workflowsStuck,
        impact,
        recommendations
      };
    }).sort((a, b) => b.averageTimeSpent - a.averageTimeSpent);
  }

  /**
   * Analyze individual step performance
   */
  private async analyzeStepPerformance(workflows: WorkflowState[]): Promise<StepPerformance[]> {
    const stepStats: Record<string, {
      transitions: number;
      totalTime: number;
      exitPoints: Record<string, number>;
      successes: number;
    }> = {};

    workflows.forEach(workflow => {
      workflow.history.forEach((entry, index) => {
        const stepId = entry.stepId;
        
        if (!stepStats[stepId]) {
          stepStats[stepId] = {
            transitions: 0,
            totalTime: 0,
            exitPoints: {},
            successes: 0
          };
        }

        stepStats[stepId].transitions++;

        if (index > 0) {
          const timeInStep = entry.timestamp.getTime() - workflow.history[index - 1].timestamp.getTime();
          stepStats[stepId].totalTime += timeInStep;
        }

        // Track exit points
        if (index < workflow.history.length - 1) {
          const nextStepId = workflow.history[index + 1].stepId;
          stepStats[stepId].exitPoints[nextStepId] = (stepStats[stepId].exitPoints[nextStepId] || 0) + 1;
        }

        // Count successes (workflows that didn't get cancelled)
        if (workflow.currentStep !== 'cancelled') {
          stepStats[stepId].successes++;
        }
      });
    });

    return Object.keys(stepStats).map(stepId => {
      const stats = stepStats[stepId];
      const averageTimeInStep = stats.totalTime / Math.max(1, stats.transitions);
      const successRate = (stats.successes / Math.max(1, stats.transitions)) * 100;
      
      const commonExitPoints = Object.entries(stats.exitPoints)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([exitPoint]) => exitPoint);

      return {
        stepId,
        stepName: this.getStepDisplayName(stepId),
        totalTransitions: stats.transitions,
        averageTimeInStep,
        successRate,
        commonExitPoints
      };
    });
  }

  // Helper methods
  private getExpectedCompletionTime(workflowType: string): number {
    const expectedTimes = {
      'orderFulfillment': 7 * 24 * 60 * 60 * 1000, // 7 days
      'supportTicket': 3 * 24 * 60 * 60 * 1000, // 3 days
      'customClothingProduction': 14 * 24 * 60 * 60 * 1000 // 14 days
    };
    return expectedTimes[workflowType as keyof typeof expectedTimes] || 7 * 24 * 60 * 60 * 1000;
  }

  private getStepDisplayName(stepId: string): string {
    const displayNames: Record<string, string> = {
      'draft': 'Draft Order',
      'payment_pending': 'Payment Pending',
      'design': 'Design Phase',
      'production': 'Production',
      'quality_check': 'Quality Check',
      'shipping': 'Shipping',
      'completed': 'Completed',
      'cancelled': 'Cancelled'
    };
    return displayNames[stepId] || stepId;
  }

  private generateBottleneckRecommendations(stepId: string, averageTime: number, workflowsStuck: number): string[] {
    const recommendations: string[] = [];

    if (averageTime > 72 * 60 * 60 * 1000) { // More than 3 days
      recommendations.push('Consider breaking this step into smaller sub-steps');
      recommendations.push('Investigate automation opportunities');
    }

    if (workflowsStuck > 5) {
      recommendations.push('Review step requirements and dependencies');
      recommendations.push('Provide additional training for step handlers');
    }

    switch (stepId) {
      case 'payment_pending':
        recommendations.push('Implement automated payment reminders');
        recommendations.push('Offer multiple payment options');
        break;
      case 'design':
        recommendations.push('Pre-approve common design templates');
        recommendations.push('Assign dedicated design resources');
        break;
      case 'production':
        recommendations.push('Review production capacity and scheduling');
        recommendations.push('Consider outsourcing during peak periods');
        break;
    }

    return recommendations;
  }

  private findMostCommonPaths(transitionCounts: Record<string, Record<string, number>>): Array<{path: string, count: number}> {
    const paths: Array<{path: string, count: number}> = [];
    
    Object.entries(transitionCounts).forEach(([from, destinations]) => {
      Object.entries(destinations).forEach(([to, count]) => {
        paths.push({ path: `${from} → ${to}`, count });
      });
    });

    return paths.sort((a, b) => b.count - a.count).slice(0, 10);
  }

  private detectUnusualPatterns(transitionCounts: Record<string, Record<string, number>>): string[] {
    const patterns: string[] = [];
    
    // Detect high reversal rates
    Object.entries(transitionCounts).forEach(([from, destinations]) => {
      const total = Object.values(destinations).reduce((sum, count) => sum + count, 0);
      
      Object.entries(destinations).forEach(([to, count]) => {
        const percentage = (count / total) * 100;
        
        // If more than 20% of transitions go backwards, flag it
        if (this.isBackwardTransition(from, to) && percentage > 20) {
          patterns.push(`High reversal rate from ${from} to ${to} (${percentage.toFixed(1)}%)`);
        }
      });
    });

    return patterns;
  }

  private isBackwardTransition(from: string, to: string): boolean {
    const stepOrder = ['draft', 'payment_pending', 'design', 'production', 'quality_check', 'shipping', 'completed'];
    const fromIndex = stepOrder.indexOf(from);
    const toIndex = stepOrder.indexOf(to);
    
    return fromIndex > toIndex && fromIndex !== -1 && toIndex !== -1;
  }

  private getAverageTimeInStep(workflows: WorkflowState[], stepId: string): number {
    const times: number[] = [];
    
    workflows.forEach(workflow => {
      workflow.history.forEach((entry, index) => {
        if (entry.stepId === stepId && index > 0) {
          const timeInStep = entry.timestamp.getTime() - workflow.history[index - 1].timestamp.getTime();
          times.push(timeInStep);
        }
      });
    });

    return times.length > 0 ? times.reduce((sum, time) => sum + time, 0) / times.length : 0;
  }

  private estimateRemainingTime(workflow: WorkflowState, allWorkflows: WorkflowState[]): number {
    // Simple estimation based on historical data
    const averageCompletionTime = this.getExpectedCompletionTime(this.determineWorkflowType(workflow));
    const timeSpentSoFar = new Date().getTime() - workflow.createdAt.getTime();
    
    return Math.max(0, averageCompletionTime - timeSpentSoFar);
  }

  private assessCompletionRisk(workflow: WorkflowState, allWorkflows: WorkflowState[]): 'low' | 'medium' | 'high' {
    const timeSpentSoFar = new Date().getTime() - workflow.createdAt.getTime();
    const expectedTime = this.getExpectedCompletionTime(this.determineWorkflowType(workflow));
    
    if (timeSpentSoFar > expectedTime * 1.5) return 'high';
    if (timeSpentSoFar > expectedTime) return 'medium';
    return 'low';
  }

  private forecastDemand(workflows: WorkflowState[]): Record<string, any> {
    // Simple demand forecasting based on historical patterns
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const recentWorkflows = workflows.filter(w => w.createdAt >= thirtyDaysAgo);
    const dailyAverage = recentWorkflows.length / 30;
    
    return {
      dailyAverage,
      projectedWeekly: dailyAverage * 7,
      projectedMonthly: dailyAverage * 30,
      trend: this.calculateTrend(workflows)
    };
  }

  private calculateTrend(workflows: WorkflowState[]): 'increasing' | 'stable' | 'decreasing' {
    const now = new Date();
    const last30Days = workflows.filter(w => w.createdAt >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
    const previous30Days = workflows.filter(w => 
      w.createdAt >= new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000) &&
      w.createdAt < new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    );

    if (last30Days.length > previous30Days.length * 1.1) return 'increasing';
    if (last30Days.length < previous30Days.length * 0.9) return 'decreasing';
    return 'stable';
  }

  private generateResourceRecommendations(predictions: any[]): string[] {
    const highRiskWorkflows = predictions.filter(p => p.riskLevel === 'high');
    const recommendations: string[] = [];

    if (highRiskWorkflows.length > 0) {
      recommendations.push(`${highRiskWorkflows.length} workflows are at high risk of delay - consider resource reallocation`);
    }

    const stepConcurrency = predictions.reduce((acc, p) => {
      acc[p.currentStep] = (acc[p.currentStep] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(stepConcurrency).forEach(([step, count]) => {
      if (count > 10) {
        recommendations.push(`High concurrency in ${step} (${count} workflows) - consider additional resources`);
      }
    });

    return recommendations;
  }

  private determineWorkflowType(workflow: WorkflowState): string {
    return workflow.workflowId.split('_')[0];
  }
}

export default WorkflowAnalytics;
