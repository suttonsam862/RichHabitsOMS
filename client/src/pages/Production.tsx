import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { formatDate, getStatusColor, getStatusLabel } from '@/lib/utils';
import { apiRequest, getQueryFn } from '@/lib/queryClient';
import { Loader2, ClipboardList, PlayCircle, CheckCircle, Eye } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function Production() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('pending_production');
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [viewingOrder, setViewingOrder] = useState<any>(null);

  // Fetch production tasks
  const { data: productionTasks = [], isLoading } = useQuery({
    queryKey: ['/api/production-tasks'],
    queryFn: getQueryFn({ on401: 'throw' }),
  });

  // Update production status mutation
  const updateStatusMutation = useMutation({
    mutationFn: (data: { orderId: number, status: string, notes?: string }) => {
      return apiRequest('PUT', `/api/orders/${data.orderId}/update-production-status`, {
        status: data.status,
        notes: data.notes
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/production-tasks'] });
      toast({
        title: 'Status Updated',
        description: 'Production status has been updated successfully',
      });
      setSelectedOrderId(null);
      setNotes('');
    },
    onError: (error: any) => {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update production status',
        variant: 'destructive'
      });
    },
  });

  // Filter tasks based on status
  const filteredTasks = productionTasks.filter((task: any) => {
    if (!task.order) return false;
    if (activeTab === 'all') return true;
    return task.order.status === activeTab;
  });

  // Handle status update
  const handleStatusUpdate = (orderId: number, newStatus: string) => {
    if (newStatus === 'in_production' || newStatus === 'completed') {
      setSelectedOrderId(orderId);
    } else {
      updateStatusMutation.mutate({ orderId, status: newStatus });
    }
  };

  // Handle submit status update with notes
  const handleSubmitStatusUpdate = () => {
    if (!selectedOrderId) return;

    const task = productionTasks.find((t: any) => t.orderId === selectedOrderId);
    if (!task) return;

    const newStatus = task.order.status === 'pending_production' ? 'in_production' : 'completed';

    updateStatusMutation.mutate({
      orderId: selectedOrderId,
      status: newStatus,
      notes
    });
  };

  // View order details
  const handleViewOrder = (order: any) => {
    setViewingOrder(order);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Production Management</h1>
        <p className="text-muted-foreground">
          View and manage production tasks assigned to you
        </p>
      </div>

      <Tabs defaultValue="pending_production" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending_production">Awaiting Production</TabsTrigger>
          <TabsTrigger value="in_production">In Production</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="all">All Tasks</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{getStatusLabel(activeTab)} Production Tasks</CardTitle>
              <CardDescription>
                {activeTab === 'pending_production' 
                  ? 'Orders ready for production that need your attention'
                  : activeTab === 'in_production' 
                  ? 'Orders currently in the production process'
                  : activeTab === 'completed'
                  ? 'Orders that have completed the production process'
                  : 'All production tasks assigned to you'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (!(productionTasks as any[]) || (productionTasks as any[])?.length === 0) ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No production tasks found</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date Assigned</TableHead>
                        <TableHead>Design Files</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(productionTasks as any[])?.map((task: any) => (
                        <TableRow key={task.id}>
                          <TableCell className="font-medium">{task.order?.orderNumber}</TableCell>
                          <TableCell>{task.order?.customer?.company || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(task.order?.status)}>
                              {getStatusLabel(task.order?.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(task.createdAt)}</TableCell>
                          <TableCell>
                            {task.order?.designTasks && task.order?.designTasks.length > 0 ? (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleViewOrder(task.order)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View Designs
                              </Button>
                            ) : (
                              <span className="text-sm text-muted-foreground">No designs available</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              {task.order?.status === 'pending_production' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleStatusUpdate(task.order.id, 'in_production')}
                                >
                                  <PlayCircle className="h-4 w-4 mr-1" />
                                  Start Production
                                </Button>
                              )}

                              {task.order?.status === 'in_production' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleStatusUpdate(task.order.id, 'completed')}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Mark as Completed
                                </Button>
                              )}

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewOrder(task.order)}
                              >
                                <ClipboardList className="h-4 w-4 mr-1" />
                                Details
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Status Update Dialog */}
      <Dialog open={!!selectedOrderId} onOpenChange={(open) => !open && setSelectedOrderId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {productionTasks.find((t: any) => t.orderId === selectedOrderId)?.order?.status === 'pending_production' 
                ? 'Start Production' 
                : 'Complete Production'}
            </DialogTitle>
            <DialogDescription>
              {productionTasks.find((t: any) => t.orderId === selectedOrderId)?.order?.status === 'pending_production'
                ? 'Update the status to indicate that production has started'
                : 'Mark this order as completed production'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div>
              <Textarea
                placeholder="Add any notes about production (optional)"
                className="min-h-[100px]"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedOrderId(null)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitStatusUpdate} disabled={updateStatusMutation.isPending}>
              {updateStatusMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : productionTasks.find((t: any) => t.orderId === selectedOrderId)?.order?.status === 'pending_production' 
                ? 'Start Production' 
                : 'Complete Production'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Details Dialog */}
      <Dialog open={!!viewingOrder} onOpenChange={(open) => !open && setViewingOrder(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Order Details: {viewingOrder?.orderNumber}</DialogTitle>
            <DialogDescription>
              View order information and design files
            </DialogDescription>
          </DialogHeader>

          {viewingOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium mb-1">Customer</h3>
                  <p>{viewingOrder.customer?.company || 'N/A'}</p>
                </div>
                <div>
                  <h3 className="font-medium mb-1">Status</h3>
                  <Badge className={getStatusColor(viewingOrder.status)}>
                    {getStatusLabel(viewingOrder.status)}
                  </Badge>
                </div>
                <div>
                  <h3 className="font-medium mb-1">Created Date</h3>
                  <p>{formatDate(viewingOrder.createdAt)}</p>
                </div>
                <div>
                  <h3 className="font-medium mb-1">Total Amount</h3>
                  <p>${parseFloat(viewingOrder.totalAmount).toFixed(2)}</p>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2">Order Items</h3>
                <div className="rounded-md border mb-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewingOrder.orderItems?.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.productName}</TableCell>
                          <TableCell>{item.description || 'N/A'}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>${parseFloat(item.totalPrice).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2">Design Files</h3>
                {viewingOrder.designTasks?.length > 0 && viewingOrder.designTasks[0].files?.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4">
                    {viewingOrder.designTasks[0].files.map((file: any) => (
                      <Card key={file.id} className="overflow-hidden">
                        <CardContent className="p-0">
                          {file.fileType.includes('image') ? (
                            <img 
                              src={file.filePath} 
                              alt={file.filename} 
                              className="w-full h-40 object-contain"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-40 bg-muted">
                              <Button variant="outline" onClick={() => window.open(file.filePath, '_blank')}>
                                View File
                              </Button>
                            </div>
                          )}
                        </CardContent>
                        <div className="p-3 border-t flex justify-between items-center">
                          <span className="text-sm truncate">{file.filename}</span>
                          <Button variant="ghost" size="sm" onClick={() => window.open(file.filePath, '_blank')}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No design files available</p>
                )}
              </div>

              {viewingOrder.notes && (
                <div>
                  <h3 className="font-medium mb-1">Notes</h3>
                  <p className="text-muted-foreground">{viewingOrder.notes}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingOrder(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}