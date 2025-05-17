import { useEffect } from "react";
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
  Hammer, 
  ShoppingCart, 
  ClipboardList, 
  CheckCircle,
  CalendarClock,
  TruckIcon
} from "lucide-react";

export default function ManufacturerDashboard() {
  const { requireAuth, user } = useAuth();
  const [, setLocation] = useLocation();

  // Check if user is authenticated with the right role
  useEffect(() => {
    requireAuth(["manufacturer"]);
  }, [requireAuth]);

  // Fetch manufacturer's assigned production tasks
  const { data, isLoading } = useQuery({
    queryKey: ['/api/manufacturer/dashboard'],
    enabled: !!user && user.role === 'manufacturer',
  });

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Manufacturer Dashboard" />
        
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Manufacturer Dashboard</h1>
          
          {/* Production Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <ClipboardList className="h-6 w-6 text-blue-600" />
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
                    <ShoppingCart className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Awaiting</p>
                    <h3 className="text-2xl font-bold">{isLoading ? '...' : data?.stats?.pendingTasks || 0}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-purple-100 rounded-full">
                    <Hammer className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">In Production</p>
                    <h3 className="text-2xl font-bold">{isLoading ? '...' : data?.stats?.inProgressTasks || 0}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-green-100 rounded-full">
                    <TruckIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Shipped</p>
                    <h3 className="text-2xl font-bold">{isLoading ? '...' : data?.stats?.completedTasks || 0}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Current Production Orders */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Current Production Orders</CardTitle>
              <CardDescription>Orders currently in the production phase</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-4 text-center text-gray-500">Loading production tasks...</div>
              ) : data?.activeTasks?.length ? (
                <div className="space-y-4">
                  {data.activeTasks.map((task: any) => (
                    <Card key={task.id} className="bg-white border hover:border-purple-200 transition-colors">
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
                            
                            <div className="grid grid-cols-2 gap-4 mt-2">
                              <div className="text-xs text-gray-500">
                                <span className="font-medium">Quantity:</span> {task.quantity}
                              </div>
                              <div className="text-xs text-gray-500">
                                <span className="font-medium">Due Date:</span> {task.dueDate ? formatDate(task.dueDate) : 'Not set'}
                              </div>
                            </div>
                          </div>
                          
                          <Button size="sm" onClick={() => setLocation(`/production/${task.id}`)}>
                            Manage Production
                          </Button>
                        </div>
                        
                        {task.progress !== undefined && (
                          <div className="mt-4">
                            <div className="flex justify-between text-xs mb-1">
                              <span>Production Progress</span>
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
                  <Hammer className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No active production orders</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    You don't have any active production tasks at the moment.
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter className="bg-gray-50 border-t px-6 py-3">
              <Button variant="outline" className="w-full" onClick={() => setLocation("/production")}>
                View All Production Tasks
              </Button>
            </CardFooter>
          </Card>
          
          {/* Production Queue */}
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Production Queue</CardTitle>
              <CardDescription>Production tasks awaiting to be started</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-4 text-center text-gray-500">Loading queue...</div>
              ) : data?.pendingTasks?.length ? (
                <div className="space-y-4">
                  {data.pendingTasks.map((task: any) => (
                    <div key={task.id} className="flex items-start justify-between p-4 border-b last:border-0">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-gray-900">Order #{task.orderNumber}</h3>
                          <Badge variant="outline" className="text-yellow-600 bg-yellow-50 border-yellow-200">
                            Awaiting Production
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                        <div className="flex items-center mt-2 text-xs text-gray-500">
                          <CalendarClock className="h-3 w-3 mr-1" />
                          <span>Expected start: {task.startDate ? formatDate(task.startDate) : 'Not scheduled'}</span>
                        </div>
                      </div>
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setLocation(`/production/${task.id}`)}
                      >
                        Start Production
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center">
                  <ClipboardList className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No pending tasks</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    There are no production tasks waiting in the queue.
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