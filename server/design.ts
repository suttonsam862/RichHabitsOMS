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
export async function getDesignerTasks(designerId: number) {
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
export async function uploadDesignFile(taskId: number, userId: number, filename: string, fileType: string, filePath: string, notes?: string) {
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
  
  // Update task status
  await storage.updateDesignTask(taskId, {
    status: 'submitted',
    notes: notes || task.notes
  });
  
  // Get the updated task
  const updatedTask = await storage.getDesignTask(taskId);
  
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
export async function updateDesignTaskStatus(taskId: number, status: string, notes?: string) {
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
    await sendStatusNotification(task, 'approved', notes);
    
    // Update order status if needed
    const order = await storage.getOrder(task.orderId);
    if (order && order.status === 'design_review') {
      await storage.updateOrder(order.id, {
        status: 'design_approved'
      });
    }
  } else if (status === 'rejected') {
    await sendStatusNotification(task, 'rejected', notes);
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
    await sendNotification(order.salespersonId, {
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
  
  // Notify customer
  const customer = await storage.getCustomer(order.customerId);
  if (customer) {
    await sendNotification(customer.userId, {
      type: 'design_submitted',
      task: {
        id: task.id,
        orderId: task.orderId,
        orderNumber: order.orderNumber
      },
      message: 'A new design is ready for your review'
    });
    
    // Send email notification
    const user = await storage.getUser(customer.userId);
    if (user && user.email) {
      const emailOptions = getDesignApprovalEmailTemplate(
        order.orderNumber,
        `${user.firstName} ${user.lastName}`
      );
      await sendEmail({
        ...emailOptions,
        to: user.email
      });
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