import { useState, useEffect, useMemo } from 'react';
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
import { 
  Loader2, 
  UserCheck, 
  Plus, 
  MessageSquare, 
  FileText, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Filter,
  Search,
  Calendar,
  Package,
  Users,
  ArrowUpDown,
  Eye,
  Edit,
  Trash2,
  Download,
  Upload,
  Phone,
  Mail,
  Building2,
  MapPin,
  Timer,
  Target,
  TrendingUp,
  Factory
} from 'lucide-react';
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

// Enhanced data types for Manufacturing Management
interface OrderWithDetails {
  id: string;
  orderNumber: string;
  customerId: string;
  customer: {
    firstName: string;
    lastName: string;
    company: string;
    email: string;
    phone?: string;
  };
  status: string;
  totalAmount: string;
  createdAt: string;
  updatedAt: string;
  orderItems: OrderItem[];
  productionTask?: ProductionTask;
  designTask?: DesignTask;
  messages?: Message[];
  dueDate?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  manufacturerId?: string;
  manufacturer?: Manufacturer;
}

interface OrderItem {
  id: string;
  orderId: string;
  catalogItemId?: string;
  catalogItem?: CatalogItem;
  productName: string;
  description?: string;
  size?: string;
  color?: string;
  quantity: string;
  unitPrice: string;
  totalPrice: string;
  customImageUrl?: string;
}

interface CatalogItem {
  id: string;
  name: string;
  category: string;
  sport: string;
  basePrice: string;
  sku: string;
  etaDays: string;
  buildInstructions?: string;
  specifications?: any;
  preferredManufacturerId?: string;
}

interface ProductionTask {
  id: string;
  orderId: string;
  manufacturerId?: string;
  status: string;
  description?: string;
  notes?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface DesignTask {
  id: string;
  orderId: string;
  designerId?: string;
  status: string;
  description?: string;
  notes?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  subject?: string;
  content: string;
  status: string;
  orderId?: string;
  createdAt: string;
  readAt?: string;
}

interface Manufacturer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company?: string;
  phone?: string;
  specialties?: string;
  workload?: number;
  activeOrders?: number;
  completedOrders?: number;
  averageCompletionTime?: number;
}

// Main Manufacturing Management Component
export default function ManufacturingManagement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Core state management
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedManufacturerId, setSelectedManufacturerId] = useState<string>('');
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'kanban' | 'timeline'>('table');
  const [activeTab, setActiveTab] = useState('overview');

  // Dialog states
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showAddManufacturerDialog, setShowAddManufacturerDialog] = useState(false);
  const [showBulkAssignDialog, setShowBulkAssignDialog] = useState(false);
  const [showOrderDetailsDialog, setShowOrderDetailsDialog] = useState(false);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [showProgressDialog, setShowProgressDialog] = useState(false);

  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [manufacturerFilter, setManufacturerFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<{start?: string; end?: string}>({});

  // Data states
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [productionTasks, setProductionTasks] = useState<ProductionTask[]>([]);
  const [designTasks, setDesignTasks] = useState<DesignTask[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Form states
  const [newManufacturerData, setNewManufacturerData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    phone: '',
    specialties: ''
  });

  const [messageData, setMessageData] = useState({
    subject: '',
    content: '',
    receiverId: ''
  });

  const [progressData, setProgressData] = useState({
    orderId: '',
    status: '',
    notes: '',
    completionPercentage: 0
  });

  // Data fetching effect
  useEffect(() => {
    fetchAllData();
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAllData(true);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Comprehensive data fetching function
  const fetchAllData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const authToken = localStorage.getItem('authToken');
      if (!authToken) {
        console.error('No auth token found');
        resetData();
        return;
      }

      // Fetch all required data in parallel
      const [
        ordersResponse,
        manufacturersResponse,
        productionTasksResponse,
        designTasksResponse,
        messagesResponse
      ] = await Promise.all([
        fetch('/api/orders?include_relations=true', {
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
        }),
        fetch('/api/production-tasks', {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch('/api/design-tasks', {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch('/api/messages', {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      // Process orders with enhanced details
      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        const ordersArray = Array.isArray(ordersData.data) ? ordersData.data : [];

        // Enhance orders with priority calculation and additional data
        const enhancedOrders = ordersArray.map((order: any) => ({
          ...order,
          priority: calculateOrderPriority(order),
          dueDate: calculateDueDate(order),
        }));

        setOrders(enhancedOrders);
        console.log('Orders loaded:', enhancedOrders.length);
      } else {
        console.error('Failed to fetch orders:', ordersResponse.status);
        setOrders([]);
      }

      // Process manufacturers with workload calculations
      if (manufacturersResponse.ok) {
        const manufacturersData = await manufacturersResponse.json();
        const manufacturersArray = Array.isArray(manufacturersData.data) ? manufacturersData.data : [];
        setManufacturers(manufacturersArray);
        console.log('Manufacturers loaded:', manufacturersArray.length);
      } else {
        console.error('Failed to fetch manufacturers:', manufacturersResponse.status);
        setManufacturers([]);
      }

      // Process production tasks
      if (productionTasksResponse.ok) {
        const tasksData = await productionTasksResponse.json();
        const tasksArray = Array.isArray(tasksData.data) ? tasksData.data : [];
        setProductionTasks(tasksArray);
      } else {
        setProductionTasks([]);
      }

      // Process design tasks
      if (designTasksResponse.ok) {
        const designData = await designTasksResponse.json();
        const designArray = Array.isArray(designData.data) ? designData.data : [];
        setDesignTasks(designArray);
      } else {
        setDesignTasks([]);
      }

      // Process messages
      if (messagesResponse.ok) {
        const messagesData = await messagesResponse.json();
        const messagesArray = Array.isArray(messagesData.data) ? messagesData.data : [];
        setMessages(messagesArray);
      } else {
        setMessages([]);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      resetData();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const resetData = () => {
    setOrders([]);
    setManufacturers([]);
    setProductionTasks([]);
    setDesignTasks([]);
    setMessages([]);
    setLoading(false);
    setRefreshing(false);
  };

  // Helper functions for data processing
  const calculateOrderPriority = (order: any): 'low' | 'medium' | 'high' | 'urgent' => {
    const daysOld = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    const totalAmount = parseFloat(order.totalAmount || '0');

    if (daysOld > 14 || totalAmount > 5000) return 'urgent';
    if (daysOld > 7 || totalAmount > 2000) return 'high';
    if (daysOld > 3 || totalAmount > 500) return 'medium';
    return 'low';
  };

  const calculateDueDate = (order: any): string => {
    const createdDate = new Date(order.createdAt);
    const etaDays = order.orderItems?.[0]?.catalogItem?.etaDays || '7';
    const dueDate = new Date(createdDate);
    dueDate.setDate(dueDate.getDate() + parseInt(etaDays));
    return dueDate.toISOString();
  };

  // Computed values for dashboard metrics
  const metrics = useMemo(() => {
    const totalOrders = orders.length;
    const ordersInProduction = orders.filter(o => o.status === 'in_production').length;
    const pendingAssignment = orders.filter(o => o.status === 'design_approved' && !o.manufacturerId).length;
    const overdueOrders = orders.filter(o => o.dueDate && new Date(o.dueDate) < new Date()).length;
    const avgCompletionTime = 7; // Calculate from historical data
    const manufacturerUtilization = manufacturers.length > 0 ? 
      (ordersInProduction / manufacturers.length * 100) : 0;

    return {
      totalOrders,
      ordersInProduction,
      pendingAssignment,
      overdueOrders,
      avgCompletionTime,
      manufacturerUtilization
    };
  }, [orders, manufacturers]);

  // Filtered and sorted orders
  const filteredOrders = useMemo(() => {
    let filtered = orders;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer?.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer?.lastName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(order => order.priority === priorityFilter);
    }

    // Manufacturer filter
    if (manufacturerFilter !== 'all') {
      if (manufacturerFilter === 'unassigned') {
        filtered = filtered.filter(order => !order.manufacturerId);
      } else {
        filtered = filtered.filter(order => order.manufacturerId === manufacturerFilter);
      }
    }

    // Date range filter
    if (dateRangeFilter.start) {
      filtered = filtered.filter(order => 
        new Date(order.createdAt) >= new Date(dateRangeFilter.start!)
      );
    }
    if (dateRangeFilter.end) {
      filtered = filtered.filter(order => 
        new Date(order.createdAt) <= new Date(dateRangeFilter.end!)
      );
    }

    // Sort by priority and creation date
    return filtered.sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [orders, searchTerm, statusFilter, priorityFilter, manufacturerFilter, dateRangeFilter]);

  // Enhanced mutation functions
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
      fetchAllData(true); // Refresh all data
      toast({
        title: 'Manufacturer Added',
        description: 'New manufacturer has been created successfully',
      });
      setShowAddManufacturerDialog(false);
      resetManufacturerForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Add Manufacturer',
        description: error.message || 'Failed to create new manufacturer',
        variant: 'destructive'
      });
    },
  });

  // Single manufacturer assignment
  const assignManufacturerMutation = useMutation({
    mutationFn: (data: { orderId: string, manufacturerId: string }) => {
      return apiRequest('PUT', `/api/orders/${data.orderId}/assign-manufacturer`, {
        manufacturerId: data.manufacturerId
      });
    },
    onSuccess: () => {
      fetchAllData(true); // Refresh all data
      toast({
        title: 'Manufacturer Assigned',
        description: 'The manufacturer has been assigned to this order successfully',
      });
      setShowAssignDialog(false);
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

  // Bulk manufacturer assignment
  const bulkAssignMutation = useMutation({
    mutationFn: async (data: { orderIds: string[], manufacturerId: string }) => {
      const results = await Promise.all(
        data.orderIds.map(orderId =>
          apiRequest('PUT', `/api/orders/${orderId}/assign-manufacturer`, {
            manufacturerId: data.manufacturerId
          })
        )
      );
      return results;
    },
    onSuccess: () => {
      fetchAllData(true);
      toast({
        title: 'Bulk Assignment Complete',
        description: `Successfully assigned manufacturer to ${selectedOrders.length} orders`,
      });
      setShowBulkAssignDialog(false);
      setSelectedOrders([]);
      setSelectedManufacturerId('');
    },
    onError: (error: any) => {
      toast({
        title: 'Bulk Assignment Failed',
        description: error.message || 'Failed to assign manufacturer to some orders',
        variant: 'destructive'
      });
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: typeof messageData & { orderId?: string }) => {
      return apiRequest('POST', '/api/messages', data);
    },
    onSuccess: () => {
      fetchAllData(true);
      toast({
        title: 'Message Sent',
        description: 'Your message has been sent successfully',
      });
      setShowMessageDialog(false);
      resetMessageForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Send Message',
        description: error.message || 'Failed to send message',
        variant: 'destructive'
      });
    },
  });

  // Update production progress mutation
  const updateProgressMutation = useMutation({
    mutationFn: async (data: typeof progressData) => {
      return apiRequest('PUT', `/api/production-tasks/${data.orderId}/progress`, {
        status: data.status,
        notes: data.notes,
        completionPercentage: data.completionPercentage
      });
    },
    onSuccess: () => {
      fetchAllData(true);
      toast({
        title: 'Progress Updated',
        description: 'Production progress has been updated successfully',
      });
      setShowProgressDialog(false);
      resetProgressForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update progress',
        variant: 'destructive'
      });
    },
  });

  // Helper functions for form handling
  const resetManufacturerForm = () => {
    setNewManufacturerData({
      firstName: '',
      lastName: '',
      email: '',
      company: '',
      phone: '',
      specialties: ''
    });
  };

  const resetMessageForm = () => {
    setMessageData({
      subject: '',
      content: '',
      receiverId: ''
    });
  };

  const resetProgressForm = () => {
    setProgressData({
      orderId: '',
      status: '',
      notes: '',
      completionPercentage: 0
    });
  };

  // Event handlers
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
      manufacturerId: selectedManufacturerId
    });
  };

  const handleBulkAssignManufacturer = () => {
    if (selectedOrders.length === 0 || !selectedManufacturerId) {
      toast({
        title: 'Invalid Selection',
        description: 'Please select orders and a manufacturer',
        variant: 'destructive'
      });
      return;
    }

    bulkAssignMutation.mutate({
      orderIds: selectedOrders,
      manufacturerId: selectedManufacturerId
    });
  };

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

  const handleSendMessage = () => {
    if (!messageData.content || !messageData.receiverId) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in message content and select a recipient',
        variant: 'destructive'
      });
      return;
    }

    sendMessageMutation.mutate({
      ...messageData,
      orderId: selectedOrderId || undefined
    });
  };

  const handleUpdateProgress = () => {
    if (!progressData.orderId || !progressData.status) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    updateProgressMutation.mutate(progressData);
  };

  const handleOrderSelection = (orderId: string, selected: boolean) => {
    if (selected) {
      setSelectedOrders(prev => [...prev, orderId]);
    } else {
      setSelectedOrders(prev => prev.filter(id => id !== orderId));
    }
  };

  const handleSelectAllOrders = (selected: boolean) => {
    if (selected) {
      setSelectedOrders(filteredOrders.map(order => order.id));
    } else {
      setSelectedOrders([]);
    }
  };

  // Utility functions
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getOrderProgress = (order: OrderWithDetails) => {
    if (order.status === 'completed') return 100;
    if (order.status === 'in_production') return 75;
    if (order.status === 'pending_production') return 50;
    if (order.status === 'design_approved') return 25;
    return 0;
  };

  const isLoading = loading;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Factory className="h-8 w-8 text-primary" />
              Manufacturing Management
            </h1>
            <p className="text-muted-foreground mt-2">
              Comprehensive production pipeline management and supply chain coordination
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchAllData(true)}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button
              onClick={() => setShowAddManufacturerDialog(true)}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Manufacturer
            </Button>
            {selectedOrders.length > 0 && (
              <Button
                onClick={() => setShowBulkAssignDialog(true)}
                size="sm"
                variant="secondary"
              >
                <Users className="h-4 w-4 mr-2" />
                Bulk Assign ({selectedOrders.length})
              </Button>
            )}
          </div>
        </div>

        {/* Dashboard Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalOrders}</div>
              <p className="text-xs text-muted-foreground">
                Active in system
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Production</CardTitle>
              <Factory className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{metrics.ordersInProduction}</div>
              <p className="text-xs text-muted-foreground">
                Currently manufacturing
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Assignment</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{metrics.pendingAssignment}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting manufacturer
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{metrics.overdueOrders}</div>
              <p className="text-xs text-muted-foreground">
                Past due date
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Completion</CardTitle>
              <Timer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.avgCompletionTime}d</div>
              <p className="text-xs text-muted-foreground">
                Days average
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Utilization</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{Math.round(metrics.manufacturerUtilization)}%</div>
              <p className="text-xs text-muted-foreground">
                Manufacturer capacity
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="production-queue">Production Queue</TabsTrigger>
            <TabsTrigger value="manufacturers">Manufacturers</TabsTrigger>
            <TabsTrigger value="communications">Communications</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Search and Filter Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Order Management & Assignment
                </CardTitle>
                <CardDescription>
                  Search, filter, and manage production orders with manufacturer assignments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col lg:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search orders, customers, or manufacturers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="design_approved">Design Approved</SelectItem>
                        <SelectItem value="pending_production">Pending Production</SelectItem>
                        <SelectItem value="in_production">In Production</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                      <SelectTrigger className="w-[130px]">
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Priority</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={manufacturerFilter} onValueChange={setManufacturerFilter}>
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Manufacturer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Manufacturers</SelectItem>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {manufacturers.map((manufacturer) => (
                          <SelectItem key={manufacturer.id} value={manufacturer.id}>
                            {manufacturer.firstName} {manufacturer.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Filter className="h-4 w-4 mr-2" />
                          More Filters
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[200px]">
                        <DropdownMenuLabel>View Options</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuCheckboxItem
                          checked={viewMode === 'table'}
                          onCheckedChange={(checked) => checked && setViewMode('table')}
                        >
                          Table View
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                          checked={viewMode === 'kanban'}
                          onCheckedChange={(checked) => checked && setViewMode('kanban')}
                        >
                          Kanban Board
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                          checked={viewMode === 'timeline'}
                          onCheckedChange={(checked) => checked && setViewMode('timeline')}
                        >
                          Timeline View
                        </DropdownMenuCheckboxItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Enhanced Management Table */}
                {isLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-medium">No orders found</p>
                    <p className="text-muted-foreground">
                      {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' 
                        ? 'Try adjusting your filters' 
                        : 'No orders are ready for production assignment'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[30px]">
                            <input
                              type="checkbox"
                              checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
                              onChange={(e) => handleSelectAllOrders(e.target.checked)}
                              className="rounded"
                            />
                          </TableHead>
                          <TableHead>Order Details</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Items & Specifications</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Status & Progress</TableHead>
                          <TableHead>Manufacturer</TableHead>
                          <TableHead>Timeline</TableHead>
                          <TableHead>Communications</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOrders.map((order) => (
                          <TableRow key={order.id} className="hover:bg-muted/50">
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={selectedOrders.includes(order.id)}
                                onChange={(e) => handleOrderSelection(order.id, e.target.checked)}
                                className="rounded"
                              />
                            </TableCell>

                            {/* Order Details */}
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-medium">{order.orderNumber}</div>
                                <div className="text-sm text-muted-foreground">
                                  ${parseFloat(order.totalAmount).toFixed(2)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Created {formatDate(order.createdAt)}
                                </div>
                              </div>
                            </TableCell>

                            {/* Customer */}
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-medium">
                                  {order.customer?.company || 'N/A'}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {order.customer?.firstName} {order.customer?.lastName}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {order.customer?.email}
                                </div>
                              </div>
                            </TableCell>

                            {/* Items & Specifications */}
                            <TableCell>
                              <div className="space-y-1">
                                <div className="text-sm font-medium">
                                  {order.orderItems?.length || 0} items
                                </div>
                                {order.orderItems?.slice(0, 2).map((item, idx) => (
                                  <div key={idx} className="text-xs text-muted-foreground">
                                    {item.productName} {item.size && `(${item.size})`}
                                  </div>
                                ))}
                                {(order.orderItems?.length || 0) > 2 && (
                                  <div className="text-xs text-muted-foreground">
                                    +{(order.orderItems?.length || 0) - 2} more
                                  </div>
                                )}
                              </div>
                            </TableCell>

                            {/* Priority */}
                            <TableCell>
                              <Badge className={getPriorityColor(order.priority)}>
                                {order.priority.toUpperCase()}
                              </Badge>
                            </TableCell>

                            {/* Status & Progress */}
                            <TableCell>
                              <div className="space-y-2">
                                <Badge className={getStatusColor(order.status)}>
                                  {getStatusLabel(order.status)}
                                </Badge>
                                <div className="w-full">
                                  <Progress 
                                    value={getOrderProgress(order)} 
                                    className="h-2"
                                  />
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {getOrderProgress(order)}% complete
                                  </div>
                                </div>
                              </div>
                            </TableCell>

                            {/* Manufacturer */}
                            <TableCell>
                              {order.manufacturer ? (
                                <div className="space-y-1">
                                  <div className="text-sm font-medium">
                                    {order.manufacturer.firstName} {order.manufacturer.lastName}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {order.manufacturer.company}
                                  </div>
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Phone className="h-3 w-3" />
                                    {order.manufacturer.phone}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center">
                                  <div className="text-sm text-muted-foreground">Unassigned</div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedOrderId(order.id);
                                      setShowAssignDialog(true);
                                    }}
                                    className="mt-1"
                                  >
                                    <UserCheck className="h-3 w-3 mr-1" />
                                    Assign
                                  </Button>
                                </div>
                              )}
                            </TableCell>

                            {/* Timeline */}
                            <TableCell>
                              <div className="space-y-1">
                                <div className="text-sm">
                                  Due: {order.dueDate ? formatDate(order.dueDate) : 'TBD'}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  ETA: {order.orderItems?.[0]?.catalogItem?.etaDays || '7'} days
                                </div>
                                {order.dueDate && new Date(order.dueDate) < new Date() && (
                                  <Badge variant="destructive" className="text-xs">
                                    Overdue
                                  </Badge>
                                )}
                              </div>
                            </TableCell>

                            {/* Communications */}
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedOrderId(order.id);
                                        setShowMessageDialog(true);
                                      }}
                                    >
                                      <MessageSquare className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Send Message</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedOrderId(order.id);
                                        setShowOrderDetailsDialog(true);
                                      }}
                                    >
                                      <FileText className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>View Details</TooltipContent>
                                </Tooltip>
                              </div>
                            </TableCell>

                            {/* Actions */}
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <ArrowUpDown className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedOrderId(order.id);
                                      setShowOrderDetailsDialog(true);
                                    }}
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedOrderId(order.id);
                                      setProgressData({ ...progressData, orderId: order.id });
                                      setShowProgressDialog(true);
                                    }}
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Update Progress
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedOrderId(order.id);
                                      setShowMessageDialog(true);
                                    }}
                                  >
                                    <MessageSquare className="h-4 w-4 mr-2" />
                                    Send Message
                                  </DropdownMenuItem>
                                  {!order.manufacturerId && (
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedOrderId(order.id);
                                        setShowAssignDialog(true);
                                      }}
                                    >
                                      <UserCheck className="h-4 w-4 mr-2" />
                                      Assign Manufacturer
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
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

          {/* Other tabs content placeholders */}
          <TabsContent value="production-queue">
            <Card>
              <CardHeader>
                <CardTitle>Production Queue Management</CardTitle>
                <CardDescription>Kanban-style production queue with drag-and-drop prioritization</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Production queue view coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manufacturers">
            <Card>
              <CardHeader>
                <CardTitle>Manufacturer Management</CardTitle>
                <CardDescription>Manage manufacturer profiles and workload distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Manufacturer management view coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="communications">
            <Card>
              <CardHeader>
                <CardTitle>Communication Hub</CardTitle>
                <CardDescription>Message threads and file sharing with manufacturers</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Communications hub coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Analytics & Reporting</CardTitle>
                <CardDescription>Production analytics and performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Analytics dashboard coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Enhanced Dialog Components */}

        {/* Assign Manufacturer Dialog */}
        <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Assign Manufacturer</DialogTitle>
              <DialogDescription>
                Select a manufacturer to assign to this order for production
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="manufacturer">Manufacturer</Label>
                <Select value={selectedManufacturerId} onValueChange={setSelectedManufacturerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a manufacturer" />
                  </SelectTrigger>
                  <SelectContent>
                    {manufacturers.map((manufacturer) => (
                      <SelectItem key={manufacturer.id} value={manufacturer.id}>
                        {manufacturer.firstName} {manufacturer.lastName}
                        {manufacturer.company && ` (${manufacturer.company})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowAssignDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssignManufacturer}
                disabled={assignManufacturerMutation.isPending}
              >
                {assignManufacturerMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Assign Manufacturer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Assign Dialog */}
        <Dialog open={showBulkAssignDialog} onOpenChange={setShowBulkAssignDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Bulk Assign Manufacturer</DialogTitle>
              <DialogDescription>
                Assign a manufacturer to {selectedOrders.length} selected orders
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="bulk-manufacturer">Manufacturer</Label>
                <Select value={selectedManufacturerId} onValueChange={setSelectedManufacturerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a manufacturer" />
                  </SelectTrigger>
                  <SelectContent>
                    {manufacturers.map((manufacturer) => (
                      <SelectItem key={manufacturer.id} value={manufacturer.id}>
                        {manufacturer.firstName} {manufacturer.lastName}
                        {manufacturer.company && ` (${manufacturer.company})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowBulkAssignDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleBulkAssignManufacturer}
                disabled={bulkAssignMutation.isPending}
              >
                {bulkAssignMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Assign to {selectedOrders.length} Orders
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Send Message Dialog */}
        <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Send Message</DialogTitle>
              <DialogDescription>
                Send a message related to the selected order
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="message-recipient">Recipient</Label>
                <Select value={messageData.receiverId} onValueChange={(value) => 
                  setMessageData({ ...messageData, receiverId: value })
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Select recipient" />
                  </SelectTrigger>
                  <SelectContent>
                    {manufacturers.map((manufacturer) => (
                      <SelectItem key={manufacturer.id} value={manufacturer.id}>
                        {manufacturer.firstName} {manufacturer.lastName}
                        {manufacturer.company && ` (${manufacturer.company})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message-subject">Subject</Label>
                <Input
                  id="message-subject"
                  value={messageData.subject}
                  onChange={(e) => setMessageData({ ...messageData, subject: e.target.value })}
                  placeholder="Message subject"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message-content">Message</Label>
                <Textarea
                  id="message-content"
                  value={messageData.content}
                  onChange={(e) => setMessageData({ ...messageData, content: e.target.value })}
                  placeholder="Type your message here..."
                  rows={4}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowMessageDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendMessage}
                disabled={sendMessageMutation.isPending}
              >
                {sendMessageMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Send Message
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Manufacturer Dialog */}
        <Dialog open={showAddManufacturerDialog} onOpenChange={setShowAddManufacturerDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Manufacturer</DialogTitle>
              <DialogDescription>
                Create a new manufacturer account in the system
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={newManufacturerData.firstName}
                    onChange={(e) => setNewManufacturerData({ 
                      ...newManufacturerData, 
                      firstName: e.target.value 
                    })}
                    placeholder="First name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={newManufacturerData.lastName}
                    onChange={(e) => setNewManufacturerData({ 
                      ...newManufacturerData, 
                      lastName: e.target.value 
                    })}
                    placeholder="Last name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newManufacturerData.email}
                  onChange={(e) => setNewManufacturerData({ 
                    ...newManufacturerData, 
                    email: e.target.value 
                  })}
                  placeholder="email@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={newManufacturerData.company}
                  onChange={(e) => setNewManufacturerData({ 
                    ...newManufacturerData, 
                    company: e.target.value 
                  })}
                  placeholder="Company name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={newManufacturerData.phone}
                  onChange={(e) => setNewManufacturerData({ 
                    ...newManufacturerData, 
                    phone: e.target.value 
                  })}
                  placeholder="Phone number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialties">Specialties</Label>
                <Textarea
                  id="specialties"
                  value={newManufacturerData.specialties}
                  onChange={(e) => setNewManufacturerData({ 
                    ...newManufacturerData, 
                    specialties: e.target.value 
                  })}
                  placeholder="Manufacturing specialties..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowAddManufacturerDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddManufacturer}
                disabled={addManufacturerMutation.isPending}
              >
                {addManufacturerMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Add Manufacturer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}