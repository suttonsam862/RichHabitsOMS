import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  MessagesSquare, 
  Send, 
  RefreshCw, 
  User as UserIcon 
} from 'lucide-react';

interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  orderId?: number | null;
  content: string;
  senderName?: string;
  status: string;
  createdAt: string;
}

interface User {
  id: number;
  firstName?: string;
  lastName?: string;
  email: string;
  role: string;
}

export default function CustomerMessagesPage() {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [receiver, setReceiver] = useState('');
  const [orderFilter, setOrderFilter] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch messages
  const { data: messages, isLoading, refetch } = useQuery({
    queryKey: ['customer', 'messages'],
    queryFn: async () => {
      const response = await fetch('/api/customer/messages');
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      return response.json();
    }
  });
  
  // Fetch admin and salesperson users for messaging
  const { data: staffUsers } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const response = await fetch('/api/users?role=admin,salesperson');
      if (!response.ok) {
        throw new Error('Failed to fetch staff users');
      }
      return response.json();
    }
  });
  
  // Fetch customer orders for filtering
  const { data: orders } = useQuery({
    queryKey: ['customer', 'orders'],
    queryFn: async () => {
      const response = await fetch('/api/customer/orders');
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }
      return response.json();
    }
  });
  
  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { receiverId: number, content: string, orderId?: number }) => {
      const response = await fetch('/api/customer/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send message');
      }
      
      return response.json();
    },
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['customer', 'messages'] });
      toast({
        title: 'Message sent',
        description: 'Your message has been sent successfully',
      });
      
      // Scroll to bottom after message is sent
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  // Handle sending message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a message',
        variant: 'destructive'
      });
      return;
    }
    
    if (!receiver) {
      toast({
        title: 'Error',
        description: 'Please select a recipient',
        variant: 'destructive'
      });
      return;
    }
    
    const messageData: any = {
      receiverId: parseInt(receiver),
      content: message
    };
    
    if (orderFilter) {
      messageData.orderId = parseInt(orderFilter);
    }
    
    sendMessageMutation.mutate(messageData);
  };
  
  // Filter messages based on order
  const filteredMessages = messages?.filter((message: Message) => {
    if (!orderFilter) return true;
    return message.orderId === parseInt(orderFilter);
  }) || [];
  
  // Scroll to the bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Get staff name
  const getStaffName = (userId: number) => {
    if (!staffUsers) return 'Staff';
    
    const staff = staffUsers.find((u: User) => u.id === userId);
    if (!staff) return 'Staff';
    
    return staff.firstName && staff.lastName
      ? `${staff.firstName} ${staff.lastName}`
      : staff.email;
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
        <p className="text-muted-foreground">
          Communicate with our team about your orders
        </p>
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Conversations</CardTitle>
              <CardDescription>
                View and send messages to our sales and support team
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                refetch();
                scrollToBottom();
              }}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full mr-2" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>
          </div>
          
          <div className="mt-2">
            <Select
              value={orderFilter || ''}
              onValueChange={(value) => setOrderFilter(value || null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by order (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Messages</SelectItem>
                {orders?.map((order: any) => (
                  <SelectItem key={order.id} value={order.id.toString()}>
                    Order #{order.orderNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="h-[400px] overflow-y-auto border rounded-md p-4 mb-4">
            {isLoading ? (
              <div className="flex justify-center items-center h-full">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : filteredMessages.length > 0 ? (
              <div className="space-y-4">
                {filteredMessages.map((msg: Message) => {
                  const isOutgoing = msg.senderId === user?.id;
                  
                  return (
                    <div 
                      key={msg.id} 
                      className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-[80%] px-4 py-2 rounded-lg ${
                          isOutgoing 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium">
                            {isOutgoing ? 'You' : (msg.senderName || getStaffName(msg.senderId))}
                          </span>
                          <span className="text-xs opacity-70">
                            {format(new Date(msg.createdAt), 'MMM d, h:mm a')}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        {msg.orderId && (
                          <div className="mt-1">
                            <span className="text-xs opacity-70">
                              Order #{orders?.find((o: any) => o.id === msg.orderId)?.orderNumber || msg.orderId}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <MessagesSquare className="h-12 w-12 text-muted-foreground opacity-50 mb-2" />
                <h3 className="text-lg font-medium">No messages yet</h3>
                <p className="text-sm text-muted-foreground">
                  {orderFilter 
                    ? "No messages found for this order. Try selecting a different order or send a new message."
                    : "Start a conversation with our team about your orders or inquiries."}
                </p>
              </div>
            )}
          </div>
        </CardContent>
        
        <CardFooter>
          <form onSubmit={handleSendMessage} className="w-full space-y-4">
            <div>
              <Select
                value={receiver}
                onValueChange={setReceiver}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select recipient" />
                </SelectTrigger>
                <SelectContent>
                  {staffUsers?.map((user: User) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      <div className="flex items-center">
                        <UserIcon className="h-4 w-4 mr-2" />
                        <span>
                          {user.firstName && user.lastName 
                            ? `${user.firstName} ${user.lastName} (${user.role})` 
                            : `${user.email} (${user.role})`}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2">
              <Textarea 
                placeholder="Type your message here..." 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[80px]"
              />
              <Button 
                type="submit"
                className="self-end"
                disabled={sendMessageMutation.isPending}
              >
                {sendMessageMutation.isPending ? (
                  <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full mr-2" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Send
              </Button>
            </div>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}