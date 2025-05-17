import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import AdminDashboard from "@/pages/AdminDashboard";
import SalespersonDashboard from "@/pages/SalespersonDashboard";
import DesignerDashboard from "@/pages/DesignerDashboard";
import ManufacturerDashboard from "@/pages/ManufacturerDashboard";
import CustomerDashboard from "@/pages/CustomerDashboard";
import { useQuery } from "@tanstack/react-query";
import { useWebSocket } from "@/lib/useWebSocket";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle 
} from "@/components/ui/sheet";
import MessageCenter from "@/components/messaging/MessageCenter";

export default function Dashboard() {
  const { user, role, isAuthenticated, loading, requireAuth } = useAuth();
  const [, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  
  const { connected, notifications } = useWebSocket(user?.id || null);

  // Check if user is authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [isAuthenticated, loading, setLocation]);

  // Prepare dashboard based on role
  const renderDashboard = () => {
    switch (role) {
      case "admin":
        return <AdminDashboard />;
      case "salesperson":
        return <SalespersonDashboard />;
      case "designer":
        return <DesignerDashboard />;
      case "manufacturer":
        return <ManufacturerDashboard />;
      case "customer":
        return <CustomerDashboard />;
      default:
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900">Welcome to ThreadCraft</h1>
            <p className="text-gray-600">Custom Clothing Order Management System</p>
          </div>
        );
    }
  };

  if (loading) {
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
          onOpenMessages={() => setMessagesOpen(true)} 
          onOpenNotifications={() => setNotificationsOpen(true)} 
        />

        <main className="flex-1 overflow-y-auto bg-gray-50">
          {renderDashboard()}
        </main>
      </div>

      {/* Messages Slide-out Panel */}
      <Sheet open={messagesOpen} onOpenChange={setMessagesOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>Messages</SheetTitle>
          </SheetHeader>
          <MessageCenter />
        </SheetContent>
      </Sheet>

      {/* Notifications Slide-out Panel */}
      <Sheet open={notificationsOpen} onOpenChange={setNotificationsOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>Notifications</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            {notifications.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No notifications at this time
              </p>
            ) : (
              notifications.map((notification, index) => (
                <div key={index} className="p-4 rounded-lg border border-gray-200 bg-gray-50">
                  <div className="flex justify-between">
                    <div className="font-medium">{notification.type}</div>
                    <div className="text-sm text-gray-500">
                      {new Date().toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="mt-2 text-sm">
                    {notification.message || "You have a new notification"}
                  </div>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
