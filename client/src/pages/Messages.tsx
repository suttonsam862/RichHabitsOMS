import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { MessageCenter } from "@/components/messaging/MessageCenter";
import { useQuery } from "@tanstack/react-query";

import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle 
} from "@/components/ui/sheet";

export default function Messages() {
  const { user, role, isAuthenticated, loading, requireAuth } = useAuth();
  const [, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Check if user is authenticated
  useEffect(() => {
    if (!loading) {
      requireAuth();
    }
  }, [isAuthenticated, loading, requireAuth]);

  // Fetch messages
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ["/api/messages"],
    enabled: isAuthenticated,
  });

  // Show loading state
  if (loading || messagesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="flex-1 flex flex-col md:ml-64">
        <Header 
          onOpenMessages={() => {}} 
          onOpenNotifications={() => setNotificationsOpen(true)} 
        />

        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
            <p className="text-gray-600">
              {role === "customer" 
                ? "Contact our team or get updates on your orders"
                : "Communicate with customers and team members"}
            </p>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Conversations</CardTitle>
              <CardDescription>
                You have {messages?.length || 0} active conversations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MessageCenter fullPage={true} />
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Notifications Slide-out Panel */}
      <Sheet open={notificationsOpen} onOpenChange={setNotificationsOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>Notifications</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            {/* Notification content would go here */}
            <p className="text-gray-500 text-center py-8">
              No notifications at this time
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
