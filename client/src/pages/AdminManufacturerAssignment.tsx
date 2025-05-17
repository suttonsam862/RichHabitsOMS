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
import { Loader2, UserCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDate, getStatusColor, getStatusLabel } from '@/lib/utils';
import { apiRequest, getQueryFn } from '@/lib/queryClient';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export default function AdminManufacturerAssignment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedManufacturerId, setSelectedManufacturerId] = useState<string>('');

  // Fetch orders ready for production assignment
  const { data: orders = [], isLoading: isLoadingOrders } = useQuery({
    queryKey: ['/api/orders', 'design_approved'],
    queryFn: () => apiRequest('GET', '/api/orders?status=design_approved').then(res => res.json()),
  });

  // Fetch manufacturers
  const { data: manufacturers = [], isLoading: isLoadingManufacturers } = useQuery({
    queryKey: ['/api/users', 'manufacturer'],
    queryFn: () => apiRequest('GET', '/api/users?role=manufacturer').then(res => res.json()),
  });

  // Assign manufacturer mutation
  const assignManufacturerMutation = useMutation({
    mutationFn: (data: { orderId: number, manufacturerId: number }) => {
      return apiRequest('PUT', `/api/orders/${data.orderId}/assign-manufacturer`, {
        manufacturerId: data.manufacturerId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders', 'design_approved'] });
      toast({
        title: 'Manufacturer Assigned',
        description: 'The manufacturer has been assigned to this order successfully',
      });
      setSelectedOrderId(null);
      setSelectedManufacturerId('');
    },
    onError: (error: any) => {
      toast({
        title: 'Assignment Failed',
        description: error.message || 'Failed to assign manufacturer',
        variant: 'destructive'
      });
    },
  });

  // Handle manufacturer assignment
  const handleAssignManufacturer = () => {
    if (!selectedOrderId || !selectedManufacturerId) {
      toast({
        title: 'Invalid Selection',
        description: 'Please select a manufacturer',
        variant: 'destructive'
      });
      return;
    }

    assignManufacturerMutation.mutate({
      orderId: selectedOrderId,
      manufacturerId: parseInt(selectedManufacturerId)
    });
  };

  const isLoading = isLoadingOrders || isLoadingManufacturers;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Assign Manufacturers</h1>
        <p className="text-muted-foreground">
          Assign manufacturers to orders that are approved for production
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Orders Ready for Production</CardTitle>
          <CardDescription>
            These orders have approved designs and are ready to be assigned to a manufacturer
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No orders ready for production assignment</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created Date</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order: any) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.orderNumber}</TableCell>
                      <TableCell>{order.customer?.company || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(order.status)}>
                          {getStatusLabel(order.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(order.createdAt)}</TableCell>
                      <TableCell>{order.orderItems?.length || 0} items</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedOrderId(order.id)}
                        >
                          <UserCheck className="h-4 w-4 mr-1" />
                          Assign Manufacturer
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manufacturer Assignment Dialog */}
      <Dialog open={!!selectedOrderId} onOpenChange={(open) => !open && setSelectedOrderId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Manufacturer</DialogTitle>
            <DialogDescription>
              Select a manufacturer to assign to this order for production
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="manufacturer">Manufacturer</Label>
              <Select 
                value={selectedManufacturerId} 
                onValueChange={setSelectedManufacturerId}
              >
                <SelectTrigger id="manufacturer">
                  <SelectValue placeholder="Select a manufacturer" />
                </SelectTrigger>
                <SelectContent>
                  {manufacturers.map((manufacturer: any) => (
                    <SelectItem key={manufacturer.id} value={manufacturer.id.toString()}>
                      {manufacturer.firstName && manufacturer.lastName 
                        ? `${manufacturer.firstName} ${manufacturer.lastName}` 
                        : manufacturer.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedOrderId(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAssignManufacturer} 
              disabled={assignManufacturerMutation.isPending || !selectedManufacturerId}
            >
              {assignManufacturerMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : 'Assign Manufacturer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}