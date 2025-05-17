import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDate, getStatusColor, getStatusLabel } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Factory,
  Loader2
} from "lucide-react";

interface ProductionQueueProps {
  tasks: any[];
}

export function ProductionQueue({ tasks }: ProductionQueueProps) {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [expandedTask, setExpandedTask] = useState<number | null>(null);

  // Update production task status mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: number, status: string }) => {
      return await apiRequest("PUT", `/api/production-tasks/${taskId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production-tasks"] });
      toast({
        title: "Task Updated",
        description: "Production task status has been updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update task: " + error.message,
        variant: "destructive",
      });
    }
  });

  // Group tasks by status
  const pendingTasks = tasks.filter(task => task.status === 'pending');
  const inProgressTasks = tasks.filter(task => task.status === 'in_progress');
  const completedTasks = tasks.filter(task => task.status === 'completed');

  // Handle status update
  const handleStatusChange = (taskId: number, newStatus: string) => {
    updateTaskMutation.mutate({ taskId, status: newStatus });
  };

  // Toggle task expansion
  const toggleTaskExpansion = (taskId: number) => {
    if (expandedTask === taskId) {
      setExpandedTask(null);
    } else {
      setExpandedTask(taskId);
    }
  };

  // Render production task card
  const renderTaskCard = (task: any) => {
    const isExpanded = expandedTask === task.id;
    
    return (
      <Card key={task.id} className="mb-4">
        <CardContent className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium">{task.description || `Production Task #${task.id}`}</h3>
              <p className="text-sm text-gray-500">Order #{task.orderId}</p>
              <div className="flex items-center mt-2">
                <Badge className={getStatusColor(task.status)}>
                  {getStatusLabel(task.status)}
                </Badge>
                {task.dueDate && (
                  <>
                    <span className="mx-2 text-gray-500">•</span>
                    <span className="text-xs text-gray-500">
                      <Clock className="inline-block h-3 w-3 mr-1" />
                      Due: {formatDate(task.dueDate)}
                    </span>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex space-x-2">
              {(role === "admin" || role === "manufacturer") && (
                <Select 
                  value={task.status}
                  onValueChange={(value) => handleStatusChange(task.id, value)}
                  disabled={updateTaskMutation.isPending}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Update Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              )}
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => toggleTaskExpansion(task.id)}
              >
                {isExpanded ? "Less" : "More"}
              </Button>
            </div>
          </div>
          
          {isExpanded && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              {task.notes && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium mb-1">Notes</h4>
                  <p className="text-sm bg-gray-50 p-3 rounded">{task.notes}</p>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="bg-gray-50 p-3 rounded">
                  <h4 className="text-xs font-medium text-gray-500 uppercase">Materials Status</h4>
                  <div className="mt-1 flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-sm font-medium">Materials Ready</span>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-3 rounded">
                  <h4 className="text-xs font-medium text-gray-500 uppercase">Production Status</h4>
                  <div className="mt-1 flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-2 ${
                      task.status === 'completed' ? 'bg-green-500' : 
                      task.status === 'in_progress' ? 'bg-blue-500' : 'bg-yellow-500'
                    }`}></div>
                    <span className="text-sm font-medium">
                      {task.status === 'completed' ? 'Completed' : 
                       task.status === 'in_progress' ? 'In Progress (40%)' : 'Pending'}
                    </span>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-3 rounded">
                  <h4 className="text-xs font-medium text-gray-500 uppercase">Estimated Completion</h4>
                  <div className="mt-1">
                    <span className="text-sm font-medium">
                      {task.dueDate ? formatDate(task.dueDate) : 'Not scheduled'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Production Timeline</h4>
                <div className="bg-gray-50 p-3 rounded">
                  <ol className="relative border-l border-gray-200 ml-3">
                    <li className="mb-3 ml-6">
                      <span className="absolute flex items-center justify-center w-6 h-6 bg-green-100 rounded-full -left-3 ring-8 ring-white">
                        <CheckCircle className="text-green-500 h-3 w-3" />
                      </span>
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-900">Order Received</h3>
                        <time className="text-xs text-gray-500">{formatDate(new Date())}</time>
                      </div>
                    </li>
                    
                    <li className="mb-3 ml-6">
                      <span className={`absolute flex items-center justify-center w-6 h-6 ${
                        task.status !== 'pending' ? 'bg-green-100' : 'bg-gray-100'
                      } rounded-full -left-3 ring-8 ring-white`}>
                        {task.status !== 'pending' ? (
                          <CheckCircle className="text-green-500 h-3 w-3" />
                        ) : (
                          <div className="h-3 w-3 rounded-full bg-gray-400"></div>
                        )}
                      </span>
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-900">Materials Prepared</h3>
                        <time className="text-xs text-gray-500">
                          {task.status !== 'pending' ? formatDate(new Date()) : 'Pending'}
                        </time>
                      </div>
                    </li>
                    
                    <li className="mb-3 ml-6">
                      <span className={`absolute flex items-center justify-center w-6 h-6 ${
                        task.status === 'in_progress' ? 'bg-blue-100' : 
                        task.status === 'completed' ? 'bg-green-100' : 'bg-gray-100'
                      } rounded-full -left-3 ring-8 ring-white`}>
                        {task.status === 'in_progress' ? (
                          <Factory className="text-blue-500 h-3 w-3" />
                        ) : task.status === 'completed' ? (
                          <CheckCircle className="text-green-500 h-3 w-3" />
                        ) : (
                          <div className="h-3 w-3 rounded-full bg-gray-400"></div>
                        )}
                      </span>
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-900">Production In Progress</h3>
                        <time className="text-xs text-gray-500">
                          {task.status === 'in_progress' || task.status === 'completed' ? 
                            formatDate(new Date()) : 'Pending'}
                        </time>
                      </div>
                    </li>
                    
                    <li className="ml-6">
                      <span className={`absolute flex items-center justify-center w-6 h-6 ${
                        task.status === 'completed' ? 'bg-green-100' : 'bg-gray-100'
                      } rounded-full -left-3 ring-8 ring-white`}>
                        {task.status === 'completed' ? (
                          <CheckCircle className="text-green-500 h-3 w-3" />
                        ) : (
                          <div className="h-3 w-3 rounded-full bg-gray-400"></div>
                        )}
                      </span>
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-900">Completed</h3>
                        <time className="text-xs text-gray-500">
                          {task.status === 'completed' ? formatDate(new Date()) : 'Pending'}
                        </time>
                      </div>
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // If no tasks
  if (!tasks || tasks.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Factory className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">No Production Tasks</h3>
          <p className="mt-1 text-gray-500">
            There are no production tasks assigned to you at this time.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Tasks */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
              Pending
              {pendingTasks.length > 0 && (
                <Badge variant="outline" className="ml-2">
                  {pendingTasks.length}
                </Badge>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {pendingTasks.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No pending tasks</p>
          ) : (
            pendingTasks.map(task => renderTaskCard(task))
          )}
        </CardContent>
      </Card>

      {/* In Progress Tasks */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center">
              <Factory className="h-5 w-5 text-blue-500 mr-2" />
              In Production
              {inProgressTasks.length > 0 && (
                <Badge variant="outline" className="ml-2">
                  {inProgressTasks.length}
                </Badge>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {inProgressTasks.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No tasks in production</p>
          ) : (
            inProgressTasks.map(task => renderTaskCard(task))
          )}
        </CardContent>
      </Card>

      {/* Completed Tasks */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              Completed
              {completedTasks.length > 0 && (
                <Badge variant="outline" className="ml-2">
                  {completedTasks.length}
                </Badge>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {completedTasks.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No completed tasks</p>
          ) : (
            completedTasks.map(task => renderTaskCard(task))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
