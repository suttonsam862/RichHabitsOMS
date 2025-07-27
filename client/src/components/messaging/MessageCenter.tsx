import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/lib/useWebSocket";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDateTime, getTimeAgo, getInitials, getRoleColor } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Send, UserPlus, MessageSquare } from "lucide-react";

interface MessageCenterProps {
  fullPage?: boolean;
  orderId?: number;
}

export function MessageCenter({ fullPage = false, orderId }: MessageCenterProps) {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messageText, setMessageText] = useState("");
  const [selectedRecipient, setSelectedRecipient] = useState<number | null>(null);
  const [activeConversation, setActiveConversation] = useState<number | null>(null);
  const { connected, sendMessage } = useWebSocket(user?.id ? parseInt(user.id) : null);

  // Fetch messages
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ["/api/messages"],
    enabled: !!user,
  });

  // Fetch users for recipient selection
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/users"],
    enabled: !!user && (role === "admin" || role === "salesperson"),
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: any) => {
      return await apiRequest("POST", "/api/messages", messageData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      setMessageText("");
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send message: " + error.message,
        variant: "destructive",
      });
    }
  });

  // Mark message as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: number) => {
      return await apiRequest("PUT", `/api/messages/${messageId}/read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    }
  });

  // Scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeConversation]);

  // Process messages to organize by conversation
  const conversations = (Array.isArray(messages) ? messages : []).reduce((acc: any, message: any) => {
    const otherUserId = message.senderId === user?.id ? message.receiverId : message.senderId;
    
    if (!acc[otherUserId]) {
      acc[otherUserId] = {
        userId: otherUserId,
        messages: [],
        unreadCount: 0,
        lastMessage: null,
      };
    }
    
    // Add message to conversation
    acc[otherUserId].messages.push(message);
    
    // Track unread messages
    if (message.receiverId === user?.id && message.status !== 'read') {
      acc[otherUserId].unreadCount++;
    }
    
    // Update last message
    if (!acc[otherUserId].lastMessage || new Date(message.createdAt) > new Date(acc[otherUserId].lastMessage.createdAt)) {
      acc[otherUserId].lastMessage = message;
    }
    
    return acc;
  }, {});

  // Convert conversations object to array and sort by last message date
  const conversationsList = Object.values(conversations).sort((a: any, b: any) => {
    return new Date(b.lastMessage?.createdAt).getTime() - new Date(a.lastMessage?.createdAt).getTime();
  });

  // Current active conversation messages
  const activeMessages = activeConversation ? conversations[activeConversation]?.messages || [] : [];
  
  // Order-specific messages
  const orderMessages = orderId ? (Array.isArray(messages) ? messages : []).filter((msg: any) => msg.orderId === orderId) : [];

  // Handle message sending
  const handleSendMessage = () => {
    if (!messageText.trim()) return;
    
    let receiverId = activeConversation;
    
    // If in new message mode and no recipient is selected
    if (!receiverId && !selectedRecipient) {
      toast({
        title: "Error",
        description: "Please select a recipient",
        variant: "destructive",
      });
      return;
    }
    
    // If in new message mode, use the selected recipient
    if (!receiverId && selectedRecipient) {
      receiverId = selectedRecipient;
      setActiveConversation(selectedRecipient);
    }
    
    const messageData = {
      receiverId,
      content: messageText,
      orderId: orderId || undefined,
    };
    
    // Send via API
    sendMessageMutation.mutate(messageData);
    
    // Also try to send via WebSocket for immediate delivery
    if (connected) {
      sendMessage("message", messageData);
    }
  };

  // Handle conversation selection
  const handleSelectConversation = (userId: number) => {
    setActiveConversation(userId);
    
    // Mark unread messages as read
    const convo = conversations[userId];
    if (convo) {
      convo.messages.forEach((msg: any) => {
        if (msg.receiverId === user?.id && msg.status !== 'read') {
          markAsReadMutation.mutate(msg.id);
        }
      });
    }
  };

  // Find user by ID helper
  const findUserById = (userId: number) => {
    return (Array.isArray(users) ? users : []).find((u: any) => u.id === userId);
  };

  // Get username helper
  const getUsernameById = (userId: number) => {
    const foundUser = findUserById(userId);
    if (foundUser) {
      return foundUser.firstName && foundUser.lastName
        ? `${foundUser.firstName} ${foundUser.lastName}`
        : foundUser.username;
    }
    return `User #${userId}`;
  };

  // Handle key press in message input
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Order-specific messaging view
  if (orderId) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {orderMessages.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No messages yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Start a conversation about this order
              </p>
            </div>
          ) : (
            orderMessages.map((message: any) => (
              <div
                key={message.id}
                className={`flex ${message.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`flex max-w-xs md:max-w-md ${
                    message.senderId === user?.id ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <Avatar className={`h-8 w-8 ${message.senderId === user?.id ? 'ml-2' : 'mr-2'}`}>
                    <AvatarFallback className={getRoleColor(message.senderId === user?.id ? role : 'unknown')}>
                      {getInitials(getUsernameById(message.senderId))}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={`p-3 rounded-lg ${
                      message.senderId === user?.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs mt-1 opacity-70">
                      {getTimeAgo(message.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t">
          <div className="flex items-center space-x-2">
            <Textarea
              placeholder="Type your message..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={handleKeyPress}
              className="flex-1 resize-none"
              rows={2}
            />
            <Button size="icon" onClick={handleSendMessage} disabled={!messageText.trim() || sendMessageMutation.isPending}>
              {sendMessageMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Full messaging center view
  return (
    <div className={`${fullPage ? '' : 'h-[80vh]'}`}>
      <Tabs defaultValue="conversations">
        <TabsList className="w-full">
          <TabsTrigger value="conversations" className="flex-1">Conversations</TabsTrigger>
          <TabsTrigger value="new" className="flex-1">New Message</TabsTrigger>
        </TabsList>
        
        <TabsContent value="conversations" className="h-full">
          <div className="grid grid-cols-1 md:grid-cols-3 h-full">
            {/* Conversations List */}
            <div className={`${fullPage ? 'border-r' : ''} md:col-span-1 overflow-y-auto max-h-[60vh] md:max-h-[70vh]`}>
              {conversationsList.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No conversations yet</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Start a new conversation using the "New Message" tab
                  </p>
                </div>
              ) : (
                conversationsList.map((convo: any) => (
                  <div
                    key={convo.userId}
                    className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${
                      activeConversation === convo.userId ? 'bg-gray-100' : ''
                    }`}
                    onClick={() => handleSelectConversation(convo.userId)}
                  >
                    <div className="flex items-center">
                      <Avatar className="h-10 w-10 mr-3">
                        <AvatarFallback className={getRoleColor('unknown')}>
                          {getInitials(getUsernameById(convo.userId))}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between">
                          <p className="text-sm font-medium truncate">
                            {getUsernameById(convo.userId)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {getTimeAgo(convo.lastMessage?.createdAt)}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {convo.lastMessage?.content}
                        </p>
                      </div>
                      {convo.unreadCount > 0 && (
                        <Badge variant="destructive" className="ml-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
                          {convo.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {/* Active Conversation */}
            <div className={`${fullPage ? '' : ''} md:col-span-2 flex flex-col h-full ${!activeConversation ? 'items-center justify-center' : ''}`}>
              {!activeConversation ? (
                <div className="text-center p-6">
                  <MessageSquare className="mx-auto h-16 w-16 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">Select a conversation</h3>
                  <p className="mt-2 text-gray-500">
                    Choose a conversation from the list or start a new one
                  </p>
                </div>
              ) : (
                <>
                  {/* Conversation Header */}
                  <div className="p-3 border-b">
                    <div className="flex items-center">
                      <Avatar className="h-8 w-8 mr-2">
                        <AvatarFallback className={getRoleColor('unknown')}>
                          {getInitials(getUsernameById(activeConversation))}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-sm font-medium">
                          {getUsernameById(activeConversation)}
                        </h3>
                      </div>
                    </div>
                  </div>
                  
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {activeMessages.map((message: any) => (
                      <div
                        key={message.id}
                        className={`flex ${message.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`flex max-w-xs md:max-w-md ${
                            message.senderId === user?.id ? 'flex-row-reverse' : 'flex-row'
                          }`}
                        >
                          <Avatar className={`h-8 w-8 ${message.senderId === user?.id ? 'ml-2' : 'mr-2'}`}>
                            <AvatarFallback className={getRoleColor(message.senderId === user?.id ? role : 'unknown')}>
                              {getInitials(getUsernameById(message.senderId))}
                            </AvatarFallback>
                          </Avatar>
                          <div
                            className={`p-3 rounded-lg ${
                              message.senderId === user?.id
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-gray-100 text-gray-900'
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                            <p className="text-xs mt-1 opacity-70">
                              {getTimeAgo(message.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                  
                  {/* Message Input */}
                  <div className="p-4 border-t">
                    <div className="flex items-center space-x-2">
                      <Textarea
                        placeholder="Type your message..."
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyDown={handleKeyPress}
                        className="flex-1 resize-none"
                        rows={2}
                      />
                      <Button 
                        size="icon" 
                        onClick={handleSendMessage} 
                        disabled={!messageText.trim() || sendMessageMutation.isPending}
                      >
                        {sendMessageMutation.isPending ? 
                          <Loader2 className="h-4 w-4 animate-spin" /> : 
                          <Send className="h-4 w-4" />
                        }
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="new">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recipient
                </label>
                <Select 
                  onValueChange={(value) => setSelectedRecipient(parseInt(value))}
                  value={selectedRecipient?.toString()}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select recipient" />
                  </SelectTrigger>
                  <SelectContent>
                    {usersLoading ? (
                      <SelectItem value="loading" disabled>Loading users...</SelectItem>
                    ) : (
                      (Array.isArray(users) ? users : []).filter((u: any) => u.id !== user?.id).map((u: any) => (
                        <SelectItem key={u.id} value={u.id.toString()}>
                          {u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.username} ({u.role})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <Textarea
                  placeholder="Type your message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>
              
              <div className="flex justify-end">
                <Button 
                  onClick={handleSendMessage} 
                  disabled={!selectedRecipient || !messageText.trim() || sendMessageMutation.isPending}
                >
                  {sendMessageMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" /> Send Message
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default MessageCenter;
