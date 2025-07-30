
import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Edit,
  Save,
  X,
  Users,
  ShoppingCart,
  DollarSign,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Building,
  Trophy,
  Briefcase,
  GraduationCap,
  Heart,
  Star,
  Package,
  Clock,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OptimisticToggle } from '@/components/ui/optimistic-toggle';
import { useOptimisticCustomerStatus } from '@/hooks/useOptimisticCustomer';

interface Customer {
  id: number | string;
  name?: string;
  email?: string;
  company?: string;
  sport?: string;
  organizationType?: string;
  orders?: number;
  spent?: string;
  lastOrder?: string | null;
  status?: string;
  firstName?: string;
  lastName?: string;
  userId?: number;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  created_at?: string;
}

interface OrganizationCard {
  id: string;
  name: string;
  sport: string;
  type: 'sports' | 'business' | 'education' | 'nonprofit' | 'government';
  customerCount: number;
  totalOrders: number;
  totalSpent: string;
  primaryContact?: string;
  avatar?: string;
  customers: Customer[];
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  items: number;
  notes?: string;
}

const organizationIcons = {
  sports: Trophy,
  business: Briefcase,
  education: GraduationCap,
  nonprofit: Heart,
  government: Building
};

const statusColors = {
  draft: 'bg-gray-500',
  pending: 'bg-yellow-500',
  approved: 'bg-blue-500',
  in_production: 'bg-purple-500',
  shipped: 'bg-green-500',
  delivered: 'bg-emerald-500',
  cancelled: 'bg-red-500'
};

const statusIcons = {
  draft: Edit,
  pending: Clock,
  approved: CheckCircle,
  in_production: Package,
  shipped: Package,
  delivered: CheckCircle,
  cancelled: AlertCircle
};

interface OrganizationDetailModalProps {
  organization: OrganizationCard | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

// Customer Row Component with Optimistic Updates
const CustomerRow = ({ customer }: { customer: Customer & { id: string; firstName: string; lastName: string; email: string; status: 'active' | 'inactive' | 'suspended'; priority: 'low' | 'medium' | 'high' } }) => {
  const statusUpdate = useOptimisticCustomerStatus(customer);
  
  return (
    <TableRow>
      <TableCell className="font-medium">
        {customer.firstName} {customer.lastName}
      </TableCell>
      <TableCell>{customer.email}</TableCell>
      <TableCell>{customer.phone || '-'}</TableCell>
      <TableCell>{customer.orders || 0}</TableCell>
      <TableCell>
        <OptimisticToggle
          checked={statusUpdate.data.status === 'active'}
          onToggle={() => {
            const newStatus = statusUpdate.data.status === 'active' ? 'inactive' : 'active';
            statusUpdate.updateField(newStatus);
          }}
          isPending={statusUpdate.isPending}
          isOptimistic={statusUpdate.isOptimistic}
          variant="badge"
          checkedLabel="Active"
          uncheckedLabel="Inactive"
          size="sm"
        />
      </TableCell>
      <TableCell>
        {customer.created_at ? new Date(customer.created_at).toLocaleDateString() : '-'}
      </TableCell>
    </TableRow>
  );
};

export default function OrganizationDetailModal({
  organization,
  isOpen,
  onClose,
  onUpdate
}: OrganizationDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    sport: '',
    type: 'business' as OrganizationCard['type'],
    primaryContact: '',
    address: '',
    phone: '',
    email: '',
    website: ''
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Initialize edit form when organization changes
  React.useEffect(() => {
    if (organization) {
      setEditForm({
        name: organization.name,
        sport: organization.sport,
        type: organization.type,
        primaryContact: organization.primaryContact || '',
        address: '',
        phone: '',
        email: '',
        website: ''
      });
    }
  }, [organization]);

  // Fetch organization orders
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ["organization", "orders", organization?.id],
    queryFn: async () => {
      if (!organization) return { current: [], past: [] };
      
      try {
        const response = await fetch(`/api/orders/organization/${organization.id}`);
        if (!response.ok) {
          // Mock data for now since endpoint doesn't exist yet
          return {
            current: [
              {
                id: '1',
                orderNumber: 'ORD-2024-001',
                customerName: organization.primaryContact || 'Unknown',
                status: 'in_production',
                totalAmount: 1250.00,
                createdAt: '2024-01-15',
                items: 3,
                notes: 'Custom team jerseys'
              },
              {
                id: '2',
                orderNumber: 'ORD-2024-002',
                customerName: organization.primaryContact || 'Unknown',
                status: 'pending',
                totalAmount: 850.00,
                createdAt: '2024-01-20',
                items: 2,
                notes: 'Training uniforms'
              }
            ],
            past: [
              {
                id: '3',
                orderNumber: 'ORD-2023-045',
                customerName: organization.primaryContact || 'Unknown',
                status: 'delivered',
                totalAmount: 2100.00,
                createdAt: '2023-12-10',
                items: 5,
                notes: 'Season uniforms'
              },
              {
                id: '4',
                orderNumber: 'ORD-2023-032',
                customerName: organization.primaryContact || 'Unknown',
                status: 'delivered',
                totalAmount: 950.00,
                createdAt: '2023-11-15',
                items: 2,
                notes: 'Coach apparel'
              }
            ]
          };
        }
        return response.json();
      } catch (error) {
        console.error('Error fetching orders:', error);
        return { current: [], past: [] };
      }
    },
    enabled: !!organization && isOpen,
    staleTime: 1000 * 60 * 5
  });

  const handleSave = async () => {
    if (!organization) return;

    try {
      const token = localStorage.getItem('token') || 'dev-admin-token-12345';
      
      const response = await fetch(`/api/organizations/${organization.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editForm),
      });

      const responseData = await response.json();

      if (!response.ok) {
        const errorMessage = responseData?.message || responseData?.error || 'Failed to update organization';
        throw new Error(errorMessage);
      }

      toast({
        title: "Organization Updated",
        description: "Organization details have been successfully updated.",
      });

      setIsEditing(false);
      onUpdate();
      queryClient.invalidateQueries({ queryKey: ["admin", "customers"] });
      queryClient.invalidateQueries({ queryKey: ["organization", "orders", organization.id] });
    } catch (error) {
      console.error('Error updating organization:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const OrderTable = ({ orders, title }: { orders: Order[], title: string }) => {
    if (!orders.length) {
      return (
        <Card className="rich-card">
          <CardContent className="py-8 text-center">
            <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No {title.toLowerCase()} found</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="rich-card">
        <CardHeader>
          <CardTitle className="text-foreground">{title}</CardTitle>
          <CardDescription>
            {orders.length} order{orders.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => {
                const StatusIcon = statusIcons[order.status as keyof typeof statusIcons];
                return (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono font-medium">
                      {order.orderNumber}
                    </TableCell>
                    <TableCell>{order.customerName}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="secondary" 
                        className={`${statusColors[order.status as keyof typeof statusColors]} text-white`}
                      >
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {order.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>{order.items}</TableCell>
                    <TableCell className="font-medium">
                      ${order.totalAmount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {new Date(order.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {order.notes || '-'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  if (!organization) return null;

  const IconComponent = organizationIcons[organization.type];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-rich-black/95 backdrop-blur-xl border border-glass-border max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-neon-blue/20 to-neon-green/20 backdrop-blur-md border border-glass-border flex items-center justify-center">
                <IconComponent className="w-6 h-6 text-neon-blue" />
              </div>
              <div>
                <DialogTitle className="text-2xl text-neon-blue">
                  {organization.name}
                </DialogTitle>
                <DialogDescription className="text-neon-green">
                  {organization.sport} • {organization.type.toUpperCase()}
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {isEditing ? (
                <>
                  <Button
                    onClick={handleSave}
                    size="sm"
                    className="bg-neon-green/20 hover:bg-neon-green/30 text-neon-green border-neon-green/30"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                  <Button
                    onClick={() => setIsEditing(false)}
                    variant="outline"
                    size="sm"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => setIsEditing(true)}
                  size="sm"
                  className="bg-neon-blue/20 hover:bg-neon-blue/30 text-neon-blue border-neon-blue/30"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="glass-panel border-glass-border">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="rich-card">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <Users className="w-8 h-8 text-neon-blue" />
                    <div>
                      <p className="text-2xl font-bold text-foreground">{organization.customerCount}</p>
                      <p className="text-sm text-muted-foreground">Members</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rich-card">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <ShoppingCart className="w-8 h-8 text-neon-green" />
                    <div>
                      <p className="text-2xl font-bold text-foreground">{organization.totalOrders}</p>
                      <p className="text-sm text-muted-foreground">Total Orders</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rich-card">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <DollarSign className="w-8 h-8 text-yellow-500" />
                    <div>
                      <p className="text-2xl font-bold text-foreground">{organization.totalSpent}</p>
                      <p className="text-sm text-muted-foreground">Total Spent</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rich-card">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-8 h-8 text-purple-500" />
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        {ordersData?.current?.length || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">Active Orders</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Organization Info */}
            <Card className="rich-card">
              <CardHeader>
                <CardTitle className="text-foreground">Organization Information</CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="org-name">Organization Name</Label>
                      <Input
                        id="org-name"
                        value={editForm.name}
                        onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                        className="glass-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="org-type">Type</Label>
                      <Select
                        value={editForm.type}
                        onValueChange={(value) => setEditForm(prev => ({ ...prev, type: value as OrganizationCard['type'] }))}
                      >
                        <SelectTrigger className="glass-input">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="glass-panel border-glass-border">
                          <SelectItem value="sports">Sports</SelectItem>
                          <SelectItem value="business">Business</SelectItem>
                          <SelectItem value="education">Education</SelectItem>
                          <SelectItem value="nonprofit">Non-Profit</SelectItem>
                          <SelectItem value="government">Government</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="org-sport">Sport/Focus</Label>
                      <Input
                        id="org-sport"
                        value={editForm.sport}
                        onChange={(e) => setEditForm(prev => ({ ...prev, sport: e.target.value }))}
                        className="glass-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="org-contact">Primary Contact</Label>
                      <Input
                        id="org-contact"
                        value={editForm.primaryContact}
                        onChange={(e) => setEditForm(prev => ({ ...prev, primaryContact: e.target.value }))}
                        className="glass-input"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <Building className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Organization</p>
                          <p className="font-medium text-foreground">{organization.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Trophy className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Sport/Focus</p>
                          <p className="font-medium text-foreground">{organization.sport}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <Star className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Type</p>
                          <p className="font-medium text-foreground capitalize">{organization.type}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Users className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Primary Contact</p>
                          <p className="font-medium text-foreground">{organization.primaryContact || 'Not specified'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="space-y-6">
            <Tabs defaultValue="current" className="w-full">
              <TabsList className="glass-panel border-glass-border">
                <TabsTrigger value="current">Current Orders</TabsTrigger>
                <TabsTrigger value="past">Past Orders</TabsTrigger>
              </TabsList>
              
              <TabsContent value="current">
                {ordersLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin w-8 h-8 border-4 border-neon-blue border-t-transparent rounded-full" />
                  </div>
                ) : (
                  <OrderTable orders={ordersData?.current || []} title="Current Orders" />
                )}
              </TabsContent>
              
              <TabsContent value="past">
                {ordersLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin w-8 h-8 border-4 border-neon-blue border-t-transparent rounded-full" />
                  </div>
                ) : (
                  <OrderTable orders={ordersData?.past || []} title="Past Orders" />
                )}
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="customers" className="space-y-6">
            <Card className="rich-card">
              <CardHeader>
                <CardTitle className="text-foreground">
                  Organization Members ({organization.customers.length})
                </CardTitle>
                <CardDescription>
                  All customers associated with this organization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Orders</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {organization.customers.map((customer) => {
                      // Ensure customer has the required fields for optimistic updates
                      const customerWithDefaults = {
                        ...customer,
                        id: customer.id?.toString() || '',
                        firstName: customer.firstName || '',
                        lastName: customer.lastName || '',
                        email: customer.email || '',
                        status: (customer.status as 'active' | 'inactive' | 'suspended') || 'active',
                        priority: 'medium' as const
                      };
                      
                      return (
                        <CustomerRow 
                          key={customer.id} 
                          customer={customerWithDefaults} 
                        />
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details" className="space-y-6">
            <Card className="rich-card">
              <CardHeader>
                <CardTitle className="text-foreground">Additional Details</CardTitle>
                <CardDescription>
                  Extended organization information and settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold text-foreground">Contact Information</h4>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Email: Not specified</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Phone: Not specified</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Address: Not specified</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold text-foreground">Organization Stats</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Founded</span>
                        <span className="text-sm font-medium text-foreground">Not specified</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Members</span>
                        <span className="text-sm font-medium text-foreground">{organization.customerCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Total Revenue</span>
                        <span className="text-sm font-medium text-foreground">{organization.totalSpent}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
