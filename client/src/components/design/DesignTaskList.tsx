import { useState } from "react";
import { formatDate, getStatusColor, getStatusLabel } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Brush, CheckCircle, Clock } from "lucide-react";

interface DesignTaskListProps {
  tasks: any[];
  onSelectTask: (task: any) => void;
  selectedTaskId?: number;
}

export function DesignTaskList({ tasks, onSelectTask, selectedTaskId }: DesignTaskListProps) {
  if (!tasks || tasks.length === 0) {
    return (
      <div className="text-center py-8">
        <Brush className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No design tasks</h3>
        <p className="mt-1 text-sm text-gray-500">
          You don't have any design tasks assigned yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <Card 
          key={task.id}
          className={`cursor-pointer transition-all ${
            selectedTaskId === task.id ? 'ring-2 ring-pink-500' : 'hover:bg-gray-50'
          }`}
          onClick={() => onSelectTask(task)}
        >
          <CardContent className="p-4">
            <div className="flex justify-between">
              <div>
                <h3 className="font-medium">{task.description || `Design Task #${task.id}`}</h3>
                <p className="text-sm text-gray-500">Order #{task.orderId}</p>
                <div className="flex items-center mt-2">
                  <Badge className={getStatusColor(task.status)}>
                    {getStatusLabel(task.status)}
                  </Badge>
                  <span className="mx-2 text-gray-500">•</span>
                  <span className="text-xs text-gray-500">
                    {task.dueDate ? (
                      <>
                        <Clock className="inline-block h-3 w-3 mr-1" />
                        Due: {formatDate(task.dueDate)}
                      </>
                    ) : (
                      "No due date"
                    )}
                  </span>
                </div>
              </div>

              {task.status === 'completed' && (
                <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
