import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { ProductionQueue } from "@/components/manufacturing/ProductionQueue";
import { useQuery } from "@tanstack/react-query";
import { MessageCenter } from "@/components/messaging/MessageCenter";
import { formatCurrency } from "@/lib/utils";

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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";

export default function Production() {
  const { user, role, isAuthenticated, loading, requireAuth } = useAuth();
  const [, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Check if user is authenticated and has manufacturer role
  useEffect(() => {
    if (!loading) {
      const hasAccess = requireAuth(["admin", "manufacturer"]);
      if (!hasAccess) {
        setLocation("/dashboard");
      }
    }
  }, [isAuthenticated, loading, requireAuth, setLocation]);

  // Fetch production tasks
  const { data: productionTasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["/api/production-tasks"],
    enabled: isAuthenticated && (role === "manufacturer" || role === "admin"),
  });

  // Fetch inventory
  const { data: inventory, isLoading: inventoryLoading } = useQuery({
    queryKey: ["/api/dashboard/inventory"],
    enabled: isAuthenticated && (role === "manufacturer" || role === "admin"),
  });

  // Show loading state
  if (loading || tasksLoading || inventoryLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // Example production metrics
  const productionMetrics = [
    {
      label: "Orders In Production",
      value: "2",
      change: "-15%",
      changeType: "decrease"
    },
    {
      label: "Completed This Month",
      value: "8",
      change: "+23%",
      changeType: "increase"
    },
    {
      label: "On-Time Completion Rate",
      value: "94%",
      change: "+2%",
      changeType: "increase"
    },
    {
      label: "Avg. Production Time",
      value: "4.2 days",
      change: "-0.3 days",
      changeType: "decrease"
    }
  ];

  // Example inventory items
  const inventoryItems = [
    {
      name: "T-shirts (Black)",
      sizes: "Medium, Large, XL",
      quantity: 145,
      percentage: 75
    },
    {
      name: "Polo Shirts (Navy)",
      sizes: "Small, Medium, Large",
      quantity: 78,
      percentage: 60
    },
    {
      name: "Hoodies (Gray)",
      sizes: "Medium, Large, XL",
      quantity: 32,
      percentage: 35
    },
    {
      name: "Jackets (Black)",
      sizes: "Small, Medium, Large",
      quantity: 12,
      percentage: 15
    }
  ];

  return (
    <div className="min-h-screen flex">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="flex-1 flex flex-col md:ml-64">
        <Header 
          onOpenMessages={() => setMessagesOpen(true)} 
          onOpenNotifications={() => setNotificationsOpen(true)} 
        />

        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Production Dashboard</h1>
            <p className="text-gray-600">Track and manage manufacturing production orders.</p>
          </div>
          
          <Tabs defaultValue="active">
            <TabsList className="mb-6">
              <TabsTrigger value="active">Active Orders</TabsTrigger>
              <TabsTrigger value="metrics">Production Metrics</TabsTrigger>
              <TabsTrigger value="inventory">Inventory</TabsTrigger>
            </TabsList>
            
            <TabsContent value="active">
              <ProductionQueue tasks={productionTasks || []} />
            </TabsContent>
            
            <TabsContent value="metrics">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
                {productionMetrics.map((metric, index) => (
                  <Card key={index}>
                    <CardContent className="p-6">
                      <h3 className="text-sm font-medium text-gray-500 uppercase">{metric.label}</h3>
                      <p className="text-3xl font-bold mt-2">{metric.value}</p>
                      <div className={`flex items-center mt-2 text-sm ${
                        metric.changeType === "increase" ? "text-green-600" : "text-red-600"
                      }`}>
                        <span className="mr-1">{metric.changeType === "increase" ? "↑" : "↓"}</span>
                        <span>{metric.change} from last month</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>Production Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80 flex items-center justify-center">
                    <p className="text-gray-500">Production timeline chart would go here</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="inventory">
              <Card>
                <CardHeader>
                  <CardTitle>Inventory Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {inventoryItems.map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-md flex items-center justify-center mr-3">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-gray-500">{item.sizes}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">{item.quantity} units</p>
                          <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                            <div 
                              className={`h-2 rounded-full ${
                                item.percentage > 60 ? "bg-green-500" : 
                                item.percentage > 30 ? "bg-yellow-500" : "bg-red-500"
                              }`} 
                              style={{ width: `${item.percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <div className="mt-6">
                      <Button>Request Inventory Restock</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
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
