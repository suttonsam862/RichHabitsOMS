import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { getStatusColor, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Palette, 
  FileText, 
  Clock, 
  CheckCircle,
  CalendarClock
} from "lucide-react";
import { DesignerDashboardData, DesignTask } from "@/lib/types";

export default function DesignerDashboard() {
  const { requireAuth, user } = useAuth();
  const [, setLocation] = useLocation();

  // Check if user is authenticated with the right role
  useEffect(() => {
    requireAuth(["designer"]);
  }, [requireAuth]);

  // Fetch designer's assigned tasks
  const { data, isLoading } = useQuery({
    queryKey: ['/api/designer/dashboard'],
    enabled: !!user && user.role === 'designer',
  });

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Designer Dashboard" />
        
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Designer Dashboard</h1>
          
          {/* Tasks Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Tasks</p>
                    <h3 className="text-2xl font-bold">{isLoading ? '...' : data?.stats?.totalTasks || 0}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-yellow-100 rounded-full">
                    <Clock className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Pending</p>
                    <h3 className="text-2xl font-bold">{isLoading ? '...' : data?.stats?.pendingTasks || 0}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-purple-100 rounded-full">
                    <Palette className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">In Progress</p>
                    <h3 className="text-2xl font-bold">{isLoading ? '...' : data?.stats?.inProgressTasks || 0}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-green-100 rounded-full">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Completed</p>
                    <h3 className="text-2xl font-bold">{isLoading ? '...' : data?.stats?.completedTasks || 0}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Active Design Tasks */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Active Design Tasks</CardTitle>
              <CardDescription>Design tasks that require your attention</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-4 text-center text-gray-500">Loading tasks...</div>
              ) : data?.activeTasks?.length ? (
                <div className="space-y-4">
                  {data.activeTasks.map((task: any) => (
                    <Card key={task.id} className="bg-white border hover:border-blue-200 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="font-medium text-gray-900">Order #{task.orderNumber}</h3>
                              <Badge className={getStatusColor(task.status)}>
                                {task.status.replace(/_/g, ' ')}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                            
                            <div className="flex items-center mt-3 text-xs text-gray-500">
                              <CalendarClock className="h-3 w-3 mr-1" />
                              <span>Due: {task.dueDate ? formatDate(task.dueDate) : 'No deadline'}</span>
                            </div>
                          </div>
                          
                          <Button size="sm" onClick={() => setLocation(`/design-tasks/${task.id}`)}>
                            Work on Task
                          </Button>
                        </div>
                        
                        {task.progress !== undefined && (
                          <div className="mt-4">
                            <div className="flex justify-between text-xs mb-1">
                              <span>Progress</span>
                              <span>{task.progress}%</span>
                            </div>
                            <Progress value={task.progress} className="h-2" />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No active tasks</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    You don't have any active design tasks at the moment.
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter className="bg-gray-50 border-t px-6 py-3">
              <Button variant="outline" className="w-full" onClick={() => setLocation("/design-tasks")}>
                View All Design Tasks
              </Button>
            </CardFooter>
          </Card>
          
          {/* Recently Completed Tasks */}
          <Card>
            <CardHeader>
              <CardTitle>Recently Completed</CardTitle>
              <CardDescription>Design tasks you've completed recently</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-4 text-center text-gray-500">Loading...</div>
              ) : data?.completedTasks?.length ? (
                <div className="space-y-4">
                  {data.completedTasks.map((task: any) => (
                    <div key={task.id} className="flex items-start justify-between p-4 border-b last:border-0">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-gray-900">Order #{task.orderNumber}</h3>
                          <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200">
                            Completed
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                        <p className="text-xs text-gray-500 mt-1">Completed on: {formatDate(task.completedAt)}</p>
                      </div>
                      
                      <Button variant="ghost" size="sm" onClick={() => setLocation(`/design-tasks/${task.id}`)}>
                        View Details
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center">
                  <CheckCircle className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No completed tasks</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    You haven't completed any design tasks recently.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}