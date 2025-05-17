import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

export default function Messages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Mock data for initial UI (will be replaced with real data from API)
  const [contacts, setContacts] = useState([
    { id: 1, name: 'John Designer', role: 'designer', unread: 2 },
    { id: 2, name: 'Mary Sales', role: 'salesperson', unread: 0 },
    { id: 3, name: 'Bob Manufacturer', role: 'manufacturer', unread: 1 },
  ]);
  
  const [messages, setMessages] = useState<any[]>([]);
  
  useEffect(() => {
    if (selectedContact) {
      // Load messages for the selected contact (mock data for now)
      setMessages([
        { id: 1, senderId: selectedContact.id, text: 'Hi there! How can I help with your order?', timestamp: '2023-05-16T10:30:00Z' },
        { id: 2, senderId: user?.id, text: 'I was wondering about the status of my design', timestamp: '2023-05-16T10:35:00Z' },
        { id: 3, senderId: selectedContact.id, text: 'I\'ve just completed the initial sketches. Should be ready for review by tomorrow.', timestamp: '2023-05-16T10:40:00Z' },
      ]);
    } else {
      setMessages([]);
    }
  }, [selectedContact, user?.id]);
  
  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedContact) return;
    
    // Add the new message to the conversation
    const newMessageObj = {
      id: Date.now(), // temporary ID
      senderId: user?.id,
      text: newMessage,
      timestamp: new Date().toISOString(),
    };
    
    setMessages([...messages, newMessageObj]);
    setNewMessage('');
    
    // In a real implementation, we would send the message to the server here
    toast({
      title: "Message Sent",
      description: "Your message has been sent successfully.",
    });
  };
  
  const filteredContacts = contacts.filter(contact => 
    contact.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
        <p className="text-muted-foreground">
          Communicate with customers, designers, and manufacturers
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card className="h-[calc(100vh-200px)]">
            <CardHeader className="pb-2">
              <CardTitle>Contacts</CardTitle>
              <div className="relative">
                <Input
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="unread">Unread</TabsTrigger>
                  <TabsTrigger value="recent">Recent</TabsTrigger>
                </TabsList>
                <TabsContent value="all" className="mt-4">
                  <div className="space-y-2 h-[calc(100vh-320px)] overflow-y-auto">
                    {filteredContacts.length > 0 ? (
                      filteredContacts.map(contact => (
                        <div
                          key={contact.id}
                          className={`p-3 rounded-md cursor-pointer flex items-center justify-between ${
                            selectedContact?.id === contact.id ? 'bg-gray-100' : 'hover:bg-gray-50'
                          }`}
                          onClick={() => setSelectedContact(contact)}
                        >
                          <div>
                            <div className="font-medium">{contact.name}</div>
                            <div className="text-xs text-gray-500 capitalize">{contact.role}</div>
                          </div>
                          {contact.unread > 0 && (
                            <div className="bg-primary text-primary-foreground h-5 w-5 rounded-full flex items-center justify-center text-xs">
                              {contact.unread}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">No contacts found</div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="unread" className="mt-4">
                  <div className="space-y-2 h-[calc(100vh-320px)] overflow-y-auto">
                    {filteredContacts.filter(c => c.unread > 0).length > 0 ? (
                      filteredContacts
                        .filter(c => c.unread > 0)
                        .map(contact => (
                          <div
                            key={contact.id}
                            className={`p-3 rounded-md cursor-pointer flex items-center justify-between ${
                              selectedContact?.id === contact.id ? 'bg-gray-100' : 'hover:bg-gray-50'
                            }`}
                            onClick={() => setSelectedContact(contact)}
                          >
                            <div>
                              <div className="font-medium">{contact.name}</div>
                              <div className="text-xs text-gray-500 capitalize">{contact.role}</div>
                            </div>
                            <div className="bg-primary text-primary-foreground h-5 w-5 rounded-full flex items-center justify-center text-xs">
                              {contact.unread}
                            </div>
                          </div>
                        ))
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">No unread messages</div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="recent" className="mt-4">
                  <div className="text-center py-4 text-muted-foreground">Recent conversations will appear here</div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
        
        <div className="md:col-span-2">
          <Card className="h-[calc(100vh-200px)] flex flex-col">
            {selectedContact ? (
              <>
                <CardHeader className="pb-2 border-b">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>{selectedContact.name}</CardTitle>
                      <p className="text-sm text-muted-foreground capitalize">{selectedContact.role}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto py-4">
                  <div className="space-y-4">
                    {messages.map(message => (
                      <div
                        key={message.id}
                        className={`flex ${message.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] p-3 rounded-lg ${
                            message.senderId === user?.id
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          <p>{message.text}</p>
                          <p className="text-xs mt-1 opacity-70">
                            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="min-h-[80px]"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />
                    <Button onClick={handleSendMessage}>Send</Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center p-4">
                  <h3 className="font-medium text-lg mb-2">No conversation selected</h3>
                  <p className="text-muted-foreground">Select a contact to start messaging</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}