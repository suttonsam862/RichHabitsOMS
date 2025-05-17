import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { DesignTaskList } from "@/components/design/DesignTaskList";
import { FileUpload } from "@/components/design/FileUpload";
import { useQuery } from "@tanstack/react-query";
import { MessageCenter } from "@/components/messaging/MessageCenter";

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

export default function DesignTasks() {
  const { user, role, isAuthenticated, loading, requireAuth } = useAuth();
  const [, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  // Check if user is authenticated and has designer role
  useEffect(() => {
    if (!loading) {
      const hasAccess = requireAuth(["admin", "designer"]);
      if (!hasAccess) {
        setLocation("/dashboard");
      }
    }
  }, [isAuthenticated, loading, requireAuth, setLocation]);

  // Fetch design tasks
  const { data: designTasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["/api/design-tasks"],
    enabled: isAuthenticated && (role === "designer" || role === "admin"),
  });

  // Show loading state
  if (loading || tasksLoading) {
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

        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Design Tasks</h1>
            <p className="text-gray-600">Manage your design tasks and file uploads here.</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Task List */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>My Design Tasks</CardTitle>
                  <CardDescription>
                    You have {designTasks?.length || 0} design tasks assigned
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DesignTaskList 
                    tasks={designTasks || []} 
                    onSelectTask={setSelectedTask} 
                    selectedTaskId={selectedTask?.id}
                  />
                </CardContent>
              </Card>
            </div>
            
            {/* Task Details */}
            <div className="lg:col-span-2">
              {selectedTask ? (
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>Design Workspace</CardTitle>
                        <CardDescription>
                          Order #{selectedTask.orderId} - Task #{selectedTask.id}
                        </CardDescription>
                      </div>
                      <FileUpload 
                        designTaskId={selectedTask.id} 
                        onSuccess={() => {
                          // Refetch tasks after upload
                        }}
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Design Preview */}
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Design Preview</h3>
                        <div className="border border-gray-200 rounded-lg bg-gray-50 h-64 flex items-center justify-center">
                          <div className="text-center text-gray-500">
                            <p>No preview available</p>
                            <p className="text-sm">Upload a design file to see preview</p>
                          </div>
                        </div>
                        
                        <div className="mt-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Task Description</h4>
                          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <p className="text-sm text-gray-700">
                              {selectedTask.description || "No description provided."}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Design Details */}
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Design Details</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select 
                              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                              value={selectedTask.status}
                            >
                              <option value="pending">Not Started</option>
                              <option value="in_progress">In Progress</option>
                              <option value="completed">Completed</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Design Notes</label>
                            <textarea 
                              rows={4} 
                              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                              defaultValue={selectedTask.notes || ""}
                              placeholder="Add notes about your design process..."
                            ></textarea>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                            <input 
                              type="date" 
                              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                              value={selectedTask.dueDate ? new Date(selectedTask.dueDate).toISOString().split('T')[0] : ''}
                            />
                          </div>
                        </div>
                        
                        <div className="mt-6 flex justify-end space-x-2">
                          <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500">
                            Save Draft
                          </button>
                          <button className="px-4 py-2 text-sm font-medium text-white bg-pink-500 border border-transparent rounded-md shadow-sm hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500">
                            Complete Task
                          </button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Task Selected</h3>
                    <p className="text-gray-500">Select a task from the list to view its details.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
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
