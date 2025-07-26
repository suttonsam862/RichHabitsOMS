
import { Router, Request, Response } from 'express';
import WorkflowEngine from '../../workflow/WorkflowEngine.js';

const router = Router();
const workflowEngine = WorkflowEngine.getInstance();

// Initialize new workflow
router.post('/workflows/initialize', async (req: Request, res: Response) => {
  try {
    const { workflowType, entityId, entityType, metadata } = req.body;

    if (!workflowType || !entityId || !entityType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: workflowType, entityId, entityType'
      });
    }

    const workflowState = await workflowEngine.initializeWorkflow(
      workflowType,
      entityId,
      entityType,
      metadata || {}
    );

    res.status(201).json({
      success: true,
      data: workflowState
    });
  } catch (error) {
    console.error('Error initializing workflow:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize workflow',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Transition workflow to next step
router.post('/workflows/:workflowId/transition', async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const { targetStep, actor, metadata } = req.body;

    if (!targetStep || !actor) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: targetStep, actor'
      });
    }

    const workflowState = await workflowEngine.transitionWorkflow(
      workflowId,
      targetStep,
      actor,
      metadata || {}
    );

    res.json({
      success: true,
      data: workflowState
    });
  } catch (error) {
    console.error('Error transitioning workflow:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to transition workflow',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get workflow status
router.get('/workflows/:workflowId', async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const workflowState = workflowEngine.getWorkflowState(workflowId);

    if (!workflowState) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found'
      });
    }

    res.json({
      success: true,
      data: workflowState
    });
  } catch (error) {
    console.error('Error getting workflow status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get workflow status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get workflow history
router.get('/workflows/:workflowId/history', async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const history = workflowEngine.getWorkflowHistory(workflowId);

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error getting workflow history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get workflow history',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Check actor permissions
router.post('/workflows/:workflowId/check-permissions', async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const { actor, action } = req.body;

    if (!actor || !action) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: actor, action'
      });
    }

    const workflowState = workflowEngine.getWorkflowState(workflowId);
    if (!workflowState) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found'
      });
    }

    const hasPermission = await workflowEngine.checkActorPermissions(
      actor,
      workflowState,
      action
    );

    res.json({
      success: true,
      data: { hasPermission }
    });
  } catch (error) {
    console.error('Error checking workflow permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check workflow permissions',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
