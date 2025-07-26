
import type { WorkflowRoutesConfig } from '../../system_config/types.js';
import SystemConfigurationManager from '../../system_config/config-loader.js';

export interface WorkflowStep {
  id: string;
  name: string;
  actor: 'customer' | 'internal_staff' | 'system';
  onEnter: string[];
  transitions: string[];
}

export interface WorkflowState {
  workflowId: string;
  currentStep: string;
  entityId: string;
  entityType: string;
  metadata: Record<string, any>;
  history: WorkflowHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowHistoryEntry {
  stepId: string;
  timestamp: Date;
  actor: string;
  action: string;
  metadata?: Record<string, any>;
}

export interface WorkflowTransition {
  fromStep: string;
  toStep: string;
  actor: string;
  conditions?: Record<string, any>;
}

class WorkflowEngine {
  private static instance: WorkflowEngine;
  private configManager: SystemConfigurationManager;
  private workflowStates: Map<string, WorkflowState> = new Map();

  private constructor() {
    this.configManager = SystemConfigurationManager.getInstance();
  }

  public static getInstance(): WorkflowEngine {
    if (!WorkflowEngine.instance) {
      WorkflowEngine.instance = new WorkflowEngine();
    }
    return WorkflowEngine.instance;
  }

  /**
   * Initialize a new workflow instance
   */
  public async initializeWorkflow(
    workflowType: string,
    entityId: string,
    entityType: string,
    initialMetadata: Record<string, any> = {}
  ): Promise<WorkflowState> {
    const config = this.configManager.getWorkflowRoutes();
    const workflow = this.getWorkflowDefinition(config, workflowType);
    
    if (!workflow || workflow.length === 0) {
      throw new Error(`Workflow type ${workflowType} not found`);
    }

    const initialStep = workflow[0];
    const workflowId = `${workflowType}_${entityId}_${Date.now()}`;

    const workflowState: WorkflowState = {
      workflowId,
      currentStep: initialStep.id,
      entityId,
      entityType,
      metadata: initialMetadata,
      history: [{
        stepId: initialStep.id,
        timestamp: new Date(),
        actor: 'system',
        action: 'workflow_initialized'
      }],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.workflowStates.set(workflowId, workflowState);
    
    // Execute onEnter actions for initial step
    await this.executeOnEnterActions(initialStep, workflowState);

    return workflowState;
  }

  /**
   * Transition workflow to next step
   */
  public async transitionWorkflow(
    workflowId: string,
    targetStep: string,
    actor: string,
    transitionMetadata: Record<string, any> = {}
  ): Promise<WorkflowState> {
    const workflowState = this.workflowStates.get(workflowId);
    if (!workflowState) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    // Validate transition
    const isValidTransition = await this.validateTransition(
      workflowState.currentStep,
      targetStep,
      actor,
      workflowState
    );

    if (!isValidTransition) {
      throw new Error(`Invalid transition from ${workflowState.currentStep} to ${targetStep} by ${actor}`);
    }

    // Update workflow state
    workflowState.currentStep = targetStep;
    workflowState.updatedAt = new Date();
    workflowState.metadata = { ...workflowState.metadata, ...transitionMetadata };
    
    // Add history entry
    workflowState.history.push({
      stepId: targetStep,
      timestamp: new Date(),
      actor,
      action: 'step_transition',
      metadata: transitionMetadata
    });

    // Get target step definition and execute onEnter actions
    const config = this.configManager.getWorkflowRoutes();
    const workflowType = this.determineWorkflowType(workflowState);
    const workflow = this.getWorkflowDefinition(config, workflowType);
    const targetStepDef = workflow?.find(step => step.id === targetStep);

    if (targetStepDef) {
      await this.executeOnEnterActions(targetStepDef, workflowState);
    }

    return workflowState;
  }

  /**
   * Get current workflow state
   */
  public getWorkflowState(workflowId: string): WorkflowState | undefined {
    return this.workflowStates.get(workflowId);
  }

  /**
   * Get workflow history
   */
  public getWorkflowHistory(workflowId: string): WorkflowHistoryEntry[] {
    const workflowState = this.workflowStates.get(workflowId);
    return workflowState?.history || [];
  }

  /**
   * Check actor permissions for workflow step
   */
  public async checkActorPermissions(
    actor: string,
    workflowState: WorkflowState,
    action: string
  ): Promise<boolean> {
    const securityPolicies = this.configManager.getSecurityPolicies();
    
    // Get actor role from security policies
    // This would typically involve checking the user's role from the database
    // For now, we'll implement basic role checking
    
    if (actor === 'system') {
      return true; // System always has permissions
    }

    // Check if actor has required permissions based on role
    const actorRole = await this.getActorRole(actor);
    const rolePermissions = securityPolicies.rbac.roles[actorRole]?.permissions || [];
    
    // Check if actor has wildcard permissions or specific workflow permissions
    return rolePermissions.includes('*') || 
           rolePermissions.includes(`workflow:${action}`) ||
           rolePermissions.includes('workflow:*');
  }

  /**
   * Execute onEnter actions for a workflow step
   */
  private async executeOnEnterActions(
    step: WorkflowStep,
    workflowState: WorkflowState
  ): Promise<void> {
    for (const action of step.onEnter) {
      try {
        await this.executeAction(action, workflowState);
      } catch (error) {
        console.error(`Failed to execute action ${action} for workflow ${workflowState.workflowId}:`, error);
        // Continue with other actions even if one fails
      }
    }
  }

  /**
   * Execute a specific workflow action
   */
  private async executeAction(
    action: string,
    workflowState: WorkflowState
  ): Promise<void> {
    switch (action) {
      case 'send_confirmation_email':
        await this.sendConfirmationEmail(workflowState);
        break;
      case 'assign_order_id':
        await this.assignOrderId(workflowState);
        break;
      case 'notify_design_team':
        await this.notifyDesignTeam(workflowState);
        break;
      case 'update_status':
        await this.updateEntityStatus(workflowState);
        break;
      case 'schedule_production':
        await this.scheduleProduction(workflowState);
        break;
      // Add more action implementations as needed
      default:
        console.log(`Action ${action} not implemented, skipping...`);
    }
  }

  /**
   * Validate workflow transition
   */
  private async validateTransition(
    fromStep: string,
    toStep: string,
    actor: string,
    workflowState: WorkflowState
  ): Promise<boolean> {
    // Check actor permissions
    const hasPermission = await this.checkActorPermissions(actor, workflowState, 'transition');
    if (!hasPermission) {
      return false;
    }

    // Get workflow definition
    const config = this.configManager.getWorkflowRoutes();
    const workflowType = this.determineWorkflowType(workflowState);
    const workflow = this.getWorkflowDefinition(config, workflowType);
    
    // Find current step and check if transition is allowed
    const currentStepDef = workflow?.find(step => step.id === fromStep);
    return currentStepDef?.transitions.includes(toStep) || false;
  }

  /**
   * Get workflow definition by type
   */
  private getWorkflowDefinition(
    config: WorkflowRoutesConfig,
    workflowType: string
  ): WorkflowStep[] | null {
    switch (workflowType) {
      case 'orderFulfillment':
        return (config as any).orderFulfillmentWorkflow?.steps || null;
      case 'supportTicket':
        return (config as any).supportTicketWorkflow?.steps || null;
      case 'customClothingProduction':
        return (config as any).customClothingProductionWorkflow?.steps || null;
      default:
        return null;
    }
  }

  /**
   * Determine workflow type from workflow state
   */
  private determineWorkflowType(workflowState: WorkflowState): string {
    // Extract workflow type from workflowId
    return workflowState.workflowId.split('_')[0];
  }

  /**
   * Get actor role (simplified implementation)
   */
  private async getActorRole(actor: string): Promise<string> {
    // This would typically query the database for the user's role
    // For now, return a default role
    return 'staff';
  }

  // Action implementations
  private async sendConfirmationEmail(workflowState: WorkflowState): Promise<void> {
    console.log(`Sending confirmation email for ${workflowState.entityType} ${workflowState.entityId}`);
    // Implement email sending logic
  }

  private async assignOrderId(workflowState: WorkflowState): Promise<void> {
    const orderId = `ORD-${Date.now()}`;
    workflowState.metadata.orderId = orderId;
    console.log(`Assigned order ID ${orderId} to ${workflowState.entityId}`);
  }

  private async notifyDesignTeam(workflowState: WorkflowState): Promise<void> {
    console.log(`Notifying design team for ${workflowState.entityType} ${workflowState.entityId}`);
    // Implement notification logic
  }

  private async updateEntityStatus(workflowState: WorkflowState): Promise<void> {
    console.log(`Updating status for ${workflowState.entityType} ${workflowState.entityId}`);
    // Implement status update logic
  }

  private async scheduleProduction(workflowState: WorkflowState): Promise<void> {
    console.log(`Scheduling production for ${workflowState.entityType} ${workflowState.entityId}`);
    // Implement production scheduling logic
  }
}

export default WorkflowEngine;
