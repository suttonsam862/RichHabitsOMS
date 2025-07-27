import { useState, useEffect } from 'react';
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
import { Loader2, UserCheck, Plus } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function AdminManufacturerAssignment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedManufacturerId, setSelectedManufacturerId] = useState<string>('');
  const [showAddManufacturerDialog, setShowAddManufacturerDialog] = useState(false);
  const [newManufacturerData, setNewManufacturerData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    phone: '',
    specialties: ''
  });

  const [orders, setOrders] = useState<any[]>([]);
  const [manufacturers, setManufacturers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const authToken = localStorage.getItem('authToken');
      if (!authToken) {
        console.error('No auth token found');
        setOrders([]);
        setManufacturers([]);
        setLoading(false);
        return;
      }

      // Fetch orders and manufacturers in parallel
      const [ordersResponse, manufacturersResponse] = await Promise.all([
        fetch('/api/orders', {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch('/api/users/manufacturers', {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      // Handle orders response
      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        const ordersArray = Array.isArray(ordersData.data) ? ordersData.data : [];
        setOrders(ordersArray);
        console.log('Orders loaded:', ordersArray.length);
      } else {
        console.error('Failed to fetch orders:', ordersResponse.status);
        setOrders([]);
      }

      // Handle manufacturers response
      if (manufacturersResponse.ok) {
        const manufacturersData = await manufacturersResponse.json();
        const manufacturersArray = Array.isArray(manufacturersData.data) ? manufacturersData.data : [];
        setManufacturers(manufacturersArray);
        console.log('Manufacturers loaded:', manufacturersArray.length);
      } else {
        console.error('Failed to fetch manufacturers:', manufacturersResponse.status);
        setManufacturers([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setOrders([]);
      setManufacturers([]);
    } finally {
      setLoading(false);
    }
  };

  // Add manufacturer mutation
  const addManufacturerMutation = useMutation({
    mutationFn: async (manufacturerData: typeof newManufacturerData) => {
      const response = await apiRequest('POST', '/api/users/create-manufacturer', {
        ...manufacturerData,
        role: 'manufacturer'
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', 'manufacturer'] });
      toast({
        title: 'Manufacturer Added',
        description: 'New manufacturer has been created successfully',
      });
      setShowAddManufacturerDialog(false);
      setNewManufacturerData({
        firstName: '',
        lastName: '',
        email: '',
        company: '',
        phone: '',
        specialties: ''
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Add Manufacturer',
        description: error.message || 'Failed to create new manufacturer',
        variant: 'destructive'
      });
    },
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

  // Handle adding new manufacturer
  const handleAddManufacturer = () => {
    if (!newManufacturerData.firstName || !newManufacturerData.lastName || !newManufacturerData.email) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in first name, last name, and email',
        variant: 'destructive'
      });
      return;
    }

    addManufacturerMutation.mutate(newManufacturerData);
  };

  const isLoading = loading;

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
                  {Array.isArray(orders) && orders.length > 0 ? orders.map((order: any) => (
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
                  )) : (
                    <div className="text-center py-8 text-gray-500">
                      {loading ? 'Loading orders...' : 'No orders found'}
                    </div>
                  )}
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
                  {loading ? (
                    <SelectItem value="" disabled>Loading manufacturers...</SelectItem>
                  ) : (
                    <>
                      <SelectItem 
                        value="add-new-manufacturer" 
                        className="text-cyan-400 hover:text-cyan-300 font-medium"
                        onSelect={() => setShowAddManufacturerDialog(true)}
                      >
                        <div className="flex items-center">
                          <Plus className="h-4 w-4 mr-2" />
                          Add New Manufacturer
                        </div>
                      </SelectItem>
                      {manufacturers.length === 0 ? (
                        <SelectItem value="" disabled>No manufacturers available</SelectItem>
                      ) : (
                        manufacturers.map((manufacturer: any) => (
                          <SelectItem key={manufacturer.id} value={manufacturer.id.toString()}>
                            {manufacturer.firstName && manufacturer.lastName 
                              ? `${manufacturer.firstName} ${manufacturer.lastName}` 
                              : manufacturer.username}
                            {manufacturer.company && ` (${manufacturer.company})`}
                          </SelectItem>
                        ))
                      )}
                    </>
                  )}
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

      {/* Add Manufacturer Dialog */}
      <Dialog open={showAddManufacturerDialog} onOpenChange={setShowAddManufacturerDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Manufacturer</DialogTitle>
            <DialogDescription>
              Create a new manufacturer profile for production assignments
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={newManufacturerData.firstName}
                  onChange={(e) => setNewManufacturerData(prev => ({
                    ...prev,
                    firstName: e.target.value
                  }))}
                  placeholder="Enter first name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={newManufacturerData.lastName}
                  onChange={(e) => setNewManufacturerData(prev => ({
                    ...prev,
                    lastName: e.target.value
                  }))}
                  placeholder="Enter last name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={newManufacturerData.email}
                onChange={(e) => setNewManufacturerData(prev => ({
                  ...prev,
                  email: e.target.value
                }))}
                placeholder="Enter email address"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={newManufacturerData.company}
                onChange={(e) => setNewManufacturerData(prev => ({
                  ...prev,
                  company: e.target.value
                }))}
                placeholder="Enter company name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={newManufacturerData.phone}
                onChange={(e) => setNewManufacturerData(prev => ({
                  ...prev,
                  phone: e.target.value
                }))}
                placeholder="Enter phone number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="specialties">Specialties</Label>
              <Textarea
                id="specialties"
                value={newManufacturerData.specialties}
                onChange={(e) => setNewManufacturerData(prev => ({
                  ...prev,
                  specialties: e.target.value
                }))}
                placeholder="Enter manufacturing specialties (e.g., embroidery, screen printing, etc.)"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddManufacturerDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddManufacturer} 
              disabled={addManufacturerMutation.isPending}
            >
              {addManufacturerMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Manufacturer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}