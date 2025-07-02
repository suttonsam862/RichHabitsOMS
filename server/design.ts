import { storage } from './storage';
import { sendNotification } from './messaging';
import { sendEmail, getDesignApprovalEmailTemplate } from './email';
import fs from 'fs';
import path from 'path';

// Ensure uploads directory exists
const designUploadsDir = path.join(process.cwd(), 'uploads', 'designs');
if (!fs.existsSync(designUploadsDir)) {
  fs.mkdirSync(designUploadsDir, { recursive: true });
}

/**
 * Get all design tasks for a designer
 */
export async function getDesignerTasks(designerId: string) {
  const tasks = await storage.getDesignTasksByDesignerId(designerId);
  
  // Enrich with order data and files
  const enrichedTasks = await Promise.all(tasks.map(async (task) => {
    const order = await storage.getOrder(task.orderId);
    const files = await storage.getDesignFilesByTaskId(task.id);
    
    return {
      ...task,
      order: order ? {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status
      } : null,
      files: files || []
    };
  }));
  
  return enrichedTasks;
}

/**
 * Upload a design file for a task
 */
export async function uploadDesignFile(taskId: string, userId: string, filename: string, fileType: string, filePath: string, notes?: string) {
  // Get task
  const task = await storage.getDesignTask(taskId);
  if (!task) {
    throw new Error("Design task not found");
  }
  
  // Create design file record
  const designFile = await storage.createDesignFile({
    designTaskId: taskId,
    filename,
    fileType,
    filePath,
    uploadedBy: userId
  });
  
  // Update task status to submitted
  const updatedTask = await storage.updateDesignTask(taskId, {
    status: 'submitted',
    notes: notes || task.notes
  });
  
  // Update order status if needed
  const order = await storage.getOrder(task.orderId);
  if (order && (order.status === 'pending_design' || order.status === 'design_in_progress')) {
    await storage.updateOrder(order.id, {
      status: 'design_review'
    });
  }
  
  // Send notifications
  await sendNotifications(task, designFile, filename);
  
  return {
    task: updatedTask,
    file: designFile
  };
}

/**
 * Update design task status
 */
export async function updateDesignTaskStatus(taskId: string, status: 'pending' | 'in_progress' | 'submitted' | 'approved' | 'rejected' | 'completed' | 'cancelled', notes?: string) {
  // Get task
  const task = await storage.getDesignTask(taskId);
  if (!task) {
    throw new Error("Design task not found");
  }
  
  // Update the task
  const updatedTask = await storage.updateDesignTask(taskId, {
    status,
    notes: notes || task.notes
  });
  
  // Send status notifications
  if (status === 'approved') {
    // Send approval notification
    if (task.designerId) {
      const designerIdNum = parseInt(task.designerId, 10);
      if (!isNaN(designerIdNum)) {
        await sendNotification(designerIdNum, {
          type: 'design_approved',
          message: `Your design for task ${taskId} has been approved.`,
          notes: notes
        });
      }
    }
    
    // Update order status if needed
    const order = await storage.getOrder(task.orderId);
    if (order && order.status === 'design_review') {
      await storage.updateOrder(order.id, {
        status: 'design_approved'
      });
    }
  } else if (status === 'rejected') {
    // Send rejection notification
    if (task.designerId) {
      const designerIdNum = parseInt(task.designerId, 10);
      if (!isNaN(designerIdNum)) {
        await sendNotification(designerIdNum, {
          type: 'design_rejected',
          message: `Your design for task ${taskId} has been rejected.`,
          notes: notes
        });
      }
    }
  }
  
  return updatedTask;
}

// Helper functions
async function sendNotifications(task: any, designFile: any, filename: string) {
  // Get order
  const order = await storage.getOrder(task.orderId);
  if (!order) return;
  
  // Notify salesperson
  if (order.salespersonId) {
    const salespersonIdNum = parseInt(order.salespersonId, 10);
    if (!isNaN(salespersonIdNum)) {
      await sendNotification(salespersonIdNum, {
      type: 'design_submitted',
      task: {
        id: task.id,
        designerId: task.designerId,
        orderId: task.orderId,
        orderNumber: order.orderNumber
      },
      file: {
        filename,
        filePath: designFile.filePath
      }
    });
    }
  }
}
  
  // Notify customer
  const customer = await storage.getCustomer(order.customerId);
  if (customer && customer.userId) {
    const customerUserIdNum = parseInt(customer.userId, 10);
    if (!isNaN(customerUserIdNum)) {
      await sendNotification(customerUserIdNum, {
      type: 'design_submitted',
      task: {
        id: task.id,
        orderId: task.orderId,
        orderNumber: order.orderNumber
      },
      message: 'A new design is ready for your review'
    });
    
    // Send email notification
    if (customer.userId) {
      const user = await storage.getUser(customer.userId);
      if (user && user.username) {
        const displayName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username;
        // Note: Email functionality disabled due to user profile schema limitations
        // Email should be obtained from auth service, not user profile
        console.log(`Would send design approval email to ${displayName} for order ${order.orderNumber}`);
      }
    }
    }
  }
}

async function sendStatusNotification(task: any, status: 'approved' | 'rejected', notes?: string) {
  if (!task.designerId) return;
  
  const order = await storage.getOrder(task.orderId);
  const orderNumber = order?.orderNumber || `Order #${task.orderId}`;
  
  if (status === 'approved') {
    await sendNotification(task.designerId, {
      type: 'design_approved',
      task: {
        id: task.id,
        orderId: task.orderId,
        orderNumber
      },
      message: 'Your design has been approved!'
    });
  } else {
    await sendNotification(task.designerId, {
      type: 'design_rejected',
      task: {
        id: task.id,
        orderId: task.orderId,
        orderNumber,
        notes: notes || 'No feedback provided'
      },
      message: 'Your design needs revisions'
    });
  }
}