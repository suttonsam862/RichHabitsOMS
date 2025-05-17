import { WebSocketServer } from 'ws';
import { Server as HttpServer } from 'http';
import { storage } from './storage';
import { sendEmail } from './email';
import type { InsertMessage, User } from '@shared/schema';

let wss: WebSocketServer;
const clients = new Map<number, WebSocket[]>();

export interface WebSocketMessage {
  type: string;
  payload: any;
}

export function setupWebSocketServer(server: HttpServer) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    // Authentication
    const userId = getUserIdFromRequest(req);
    
    if (!userId) {
      ws.close(1008, 'Authentication failed');
      return;
    }

    // Store client connection
    if (!clients.has(userId)) {
      clients.set(userId, []);
    }
    clients.get(userId)?.push(ws as WebSocket);

    // Handle incoming messages
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString()) as WebSocketMessage;
        
        if (message.type === 'message') {
          await handleNewMessage(userId, message.payload);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });

    // Handle client disconnect
    ws.on('close', () => {
      removeClient(userId, ws as WebSocket);
    });

    // Send connection confirmation
    ws.send(JSON.stringify({ type: 'connected', payload: { userId } }));
  });

  return wss;
}

// Helper to get user ID from the request
function getUserIdFromRequest(req: any): number | null {
  // Extract user ID from session/cookie/token
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const token = url.searchParams.get('token');
  
  if (!token) return null;
  
  try {
    // Simple token format: userId:timestamp:signature
    const [userIdStr] = token.split(':');
    return parseInt(userIdStr, 10);
  } catch (error) {
    return null;
  }
}

// Remove client when disconnected
function removeClient(userId: number, ws: WebSocket) {
  if (clients.has(userId)) {
    const userClients = clients.get(userId) || [];
    const index = userClients.findIndex((client) => client === ws);
    
    if (index !== -1) {
      userClients.splice(index, 1);
      
      if (userClients.length === 0) {
        clients.delete(userId);
      }
    }
  }
}

// Handle new message from WebSocket
async function handleNewMessage(senderId: number, payload: any) {
  try {
    // Save message to database
    const messageData: InsertMessage = {
      senderId,
      receiverId: payload.receiverId,
      subject: payload.subject || '',
      content: payload.content,
      orderId: payload.orderId || null,
      designTaskId: payload.designTaskId || null,
      productionTaskId: payload.productionTaskId || null,
    };
    
    const savedMessage = await storage.createMessage(messageData);
    
    // Attempt to deliver message via WebSocket
    const delivered = deliverMessageToUser(payload.receiverId, {
      type: 'new_message',
      payload: savedMessage
    });
    
    // If not delivered (user offline), send email
    if (!delivered) {
      const receiver = await storage.getUser(payload.receiverId);
      const sender = await storage.getUser(senderId);
      
      if (receiver && sender) {
        await sendEmail({
          to: receiver.email,
          subject: `New message from ${sender.firstName} ${sender.lastName || ''}`,
          text: `You have a new message from ${sender.firstName} ${sender.lastName || ''}:\n\n${payload.content}\n\nLog in to the system to reply.`,
          html: `
            <p>You have a new message from ${sender.firstName} ${sender.lastName || ''}:</p>
            <blockquote>${payload.content}</blockquote>
            <p>Log in to the system to reply.</p>
          `
        });
        
        // Mark message as email sent
        await storage.markMessageAsEmailSent(savedMessage.id);
      }
    }
    
  } catch (error) {
    console.error('Error handling new message:', error);
  }
}

// Deliver message to connected user
function deliverMessageToUser(userId: number, message: WebSocketMessage): boolean {
  if (!clients.has(userId)) {
    return false;
  }
  
  const userClients = clients.get(userId) || [];
  let delivered = false;
  
  userClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
      delivered = true;
    }
  });
  
  return delivered;
}

// Send notification to specific user
export async function sendNotification(userId: number, notification: any) {
  deliverMessageToUser(userId, {
    type: 'notification',
    payload: notification
  });
}

// Broadcast message to all users or users with specific role
export function broadcastMessage(message: WebSocketMessage, role?: string) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      // If role is specified, only send to users with that role
      // This would require additional tracking of client roles
      client.send(JSON.stringify(message));
    }
  });
}
