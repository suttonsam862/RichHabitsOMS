import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useGlobalDataSync, CACHE_KEYS, DATA_SYNC_EVENTS, createMutationSuccessHandler } from '@/hooks/useGlobalDataSync';
import { useSmartFetch } from '@/hooks/useSmartFetch';
import ManufacturerCard from '@/components/ManufacturerCard';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Users,
  Loader2,
  RefreshCw,
  Package,
  DollarSign,
  Calendar,
  Hash,
  FileText,
  Upload,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Sparkles,
  User,
  Settings,
  Clock,
  AlertTriangle,
  TrendingUp,
  Target,
  Palette,
  Factory,
  ShoppingCart
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";

interface ManufacturerCapabilities {
  fabrics?: string[];
  max_order_volume?: number;
  sports?: string[];
  equipment?: string[];
  certifications?: string[];
  lead_time_days?: number;
  specialties?: string[];
  min_order_quantity?: number;
  rush_order_available?: boolean;
  rush_lead_time_days?: number;
  quality_grades?: string[];
  size_ranges?: string[];
  color_capabilities?: string[];
  additional_services?: string[];
}

interface MediaFile {
  id: string;
  type: 'logo' | 'branding' | 'document' | 'certificate';
  fileName: string;
  url: string;
  fileSize: number;
  mimeType: string;
  description: string;
  uploadedAt: string;
}

interface Manufacturer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  role: string;
  createdAt: string;
  custom_attributes?: {
    notes?: string;
    preferredCategories?: string[];
    pricingTiers?: Array<{
      category: string;
      basePrice: number;
      markup: number;
    }>;
    capabilities?: ManufacturerCapabilities;
    media?: MediaFile[];
  };
}

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  sport?: string;
}

interface TeamMember {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  role: 'salesperson' | 'designer' | 'manufacturer';
  activeOrders: number;
  pendingTasks: number;
  avgCompletionTime?: number;
}

interface OrderItem {
  id?: string;
  catalogItemId?: string;
  productName: string;
  description: string;
  size: string;
  color: string;
  fabric?: string;
  customization?: string;
  specifications?: Record<string, any>;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  customImageUrl?: string;
  designFileUrl?: string;
  productionNotes?: string;
  status?: 'pending' | 'designing' | 'approved' | 'in_production' | 'completed';
  estimatedCompletionDate?: string;
}

interface Order {
  id?: string;
  orderNumber: string;
  customerId: string;
  salespersonId?: string;
  assignedDesignerId?: string;
  assignedManufacturerId?: string;
  status: 'draft' | 'pending_design' | 'design_in_progress' | 'design_review' | 'design_approved' | 'pending_production' | 'in_production' | 'completed' | 'cancelled';
  priority: 'high' | 'medium' | 'low';
  totalAmount: number;
  tax: number;
  discount: number;
  notes?: string;
  internalNotes?: string;
  customerRequirements?: string;
  deliveryAddress?: string;
  deliveryInstructions?: string;
  rushOrder: boolean;
  estimatedDeliveryDate?: string;
  actualDeliveryDate?: string;
  logoUrl?: string;
  companyName?: string;
  items: OrderItem[];
  createdAt?: string;
  updatedAt?: string;
}

const ONBOARDING_STEPS = [
  {
    id: 'customer',
    title: 'Customer Selection',
    description: 'Choose customer for this order',
    icon: User
  },
  {
    id: 'team',
    title: 'Team Assignment',
    description: 'Assign team members',
    icon: Users
  },
  {
    id: 'details',
    title: 'Order Details',
    description: 'Set order information',
    icon: Settings
  },
  {
    id: 'items',
    title: 'Order Items',
    description: 'Add products to order',
    icon: Package
  },
  {
    id: 'logistics',
    title: 'Delivery & Logistics',
    description: 'Set delivery details',
    icon: Calendar
  },
  {
    id: 'review',
    title: 'Review & Submit',
    description: 'Final review and submission',
    icon: Check
  }
];

const STATUS_COLORS = {
  draft: 'bg-gray-500',
  pending_design: 'bg-yellow-500',
  design_in_progress: 'bg-blue-500',
  design_review: 'bg-purple-500',
  design_approved: 'bg-green-500',
  pending_production: 'bg-orange-500',
  in_production: 'bg-red-500',
  completed: 'bg-emerald-500',
  cancelled: 'bg-gray-400'
};

const PRIORITY_COLORS = {
  high: 'bg-red-500 text-white',
  medium: 'bg-yellow-500 text-black',
  low: 'bg-green-500 text-white'
};

export default function EnhancedOrderManagementWithCards() {
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  
  const [orderFormData, setOrderFormData] = useState<Partial<Order>>({
    orderNumber: '',
    customerId: '',
    status: 'draft',
    priority: 'medium',
    totalAmount: 0,
    tax: 0,
    discount: 0,
    rushOrder: false,
    items: []
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user, role } = useAuth();
  const [location, setLocation] = useLocation();
  const globalDataSync = useGlobalDataSync();

  // Fetch orders with comprehensive data using smart fetch
  const { data: orders = [], isLoading: ordersLoading, refetch: refetchOrders, isBlocked, resetErrors } = useSmartFetch({
    endpoint: '/api/orders/enhanced',
    enablePolling: false,
    maxRetries: 0,
    staleTime: 600000 // Cache for 10 minutes
  });

  // Fetch customers using smart fetch
  const { data: customers = [], isLoading: customersLoading } = useSmartFetch({
    endpoint: '/api/customers',
    enablePolling: false,
    maxRetries: 0,
    staleTime: 600000 // Cache for 10 minutes
  });

  // Fetch manufacturers with their capabilities and media
  const { data: manufacturers = [], isLoading: manufacturersLoading } = useSmartFetch({
    endpoint: '/api/manufacturing/manufacturers',
    enablePolling: false,
    maxRetries: 0,
    staleTime: 600000 // Cache for 10 minutes
  });

  // Fetch team members with workload stats using smart fetch
  const { data: teamMembers = [], isLoading: teamLoading } = useSmartFetch({
    endpoint: '/api/team/workload',
    enablePolling: false,
    maxRetries: 0,
    staleTime: 600000 // Cache for 10 minutes
  });

  // Generate order number
  const generateOrderNumber = () => {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ORD-${timestamp}-${random}`;
  };

  // Initialize order form
  useEffect(() => {
    if (isCreatingOrder && !editingOrder && !orderFormData.orderNumber) {
      setOrderFormData(prev => ({
        ...prev,
        orderNumber: generateOrderNumber()
      }));
    }
  }, [isCreatingOrder, editingOrder, orderFormData.orderNumber]);

  const handleStartOrder = () => {
    setEditingOrder(null);
    setCurrentStep(0);
    setOrderFormData({
      orderNumber: generateOrderNumber(),
      customerId: '',
      status: 'draft',
      priority: 'medium',
      totalAmount: 0,
      tax: 0,
      discount: 0,
      rushOrder: false,
      items: []
    });
    setIsCreatingOrder(true);
  };

  const handleNextStep = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleManufacturerSelect = (manufacturer: Manufacturer) => {
    setOrderFormData(prev => ({
      ...prev,
      assignedManufacturerId: manufacturer.id
    }));
    
    toast({
      title: 'Manufacturer Selected',
      description: `${manufacturer.company || `${manufacturer.firstName} ${manufacturer.lastName}`} has been selected for this order.`
    });
  };

  const renderStepContent = () => {
    const step = ONBOARDING_STEPS[currentStep];
    
    switch (step.id) {
      case 'customer':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <User className="mx-auto h-12 w-12 text-neon-blue mb-4" />
              <h3 className="text-lg font-semibold text-foreground">Select Customer</h3>
              <p className="text-muted-foreground">Choose an existing customer or add a new one</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="customer" className="text-foreground">Customer</Label>
                <Select 
                  value={orderFormData.customerId} 
                  onValueChange={(value) => setOrderFormData({ ...orderFormData, customerId: value })}
                >
                  <SelectTrigger className="glass-input">
                    <SelectValue placeholder="Select a customer" />
                  </SelectTrigger>
                  <SelectContent className="glass-panel border-glass-border">
                    {customersLoading ? (
                      <SelectItem value="loading" disabled>Loading customers...</SelectItem>
                    ) : customers.length > 0 ? (
                      customers.map((customer: Customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.firstName} {customer.lastName} - {customer.company || customer.email}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>No customers found</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <Button
                variant="outline"
                onClick={() => setLocation('/customers')}
                className="w-full glass-button"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add New Customer
              </Button>
            </div>
          </div>
        );

      case 'team':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Users className="mx-auto h-12 w-12 text-neon-blue mb-4" />
              <h3 className="text-lg font-semibold text-foreground">Team Assignment</h3>
              <p className="text-muted-foreground">Assign team members to this order</p>
            </div>
            
            <div className="space-y-6">
              {/* Designer Assignment */}
              <div className="space-y-4">
                <Label className="text-foreground flex items-center text-lg">
                  <Palette className="w-5 h-5 mr-2" />
                  Designer Assignment
                </Label>
                <Select 
                  value={orderFormData.assignedDesignerId || ''} 
                  onValueChange={(value) => setOrderFormData({ ...orderFormData, assignedDesignerId: value })}
                >
                  <SelectTrigger className="glass-input">
                    <SelectValue placeholder="Auto-assign designer" />
                  </SelectTrigger>
                  <SelectContent className="glass-panel border-glass-border">
                    <SelectItem value="">Auto-assign (recommended)</SelectItem>
                    {teamMembers.filter((member: TeamMember) => member.role === 'designer').map((designer: TeamMember) => (
                      <SelectItem key={designer.id} value={designer.id}>
                        {designer.firstName} {designer.lastName} ({designer.activeOrders} active orders)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Manufacturer Assignment with Cards */}
              <div className="space-y-4">
                <Label className="text-foreground flex items-center text-lg">
                  <Factory className="w-5 h-5 mr-2" />
                  Manufacturer Assignment
                </Label>
                
                {manufacturersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>Loading manufacturers...</span>
                  </div>
                ) : manufacturers.length > 0 ? (
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground mb-4">
                      Select a manufacturer based on their capabilities and current workload:
                    </div>
                    
                    <ScrollArea className="h-96">
                      <div className="space-y-4 pr-4">
                        {manufacturers.map((manufacturer: Manufacturer) => (
                          <ManufacturerCard
                            key={manufacturer.id}
                            manufacturer={manufacturer}
                            onSelect={handleManufacturerSelect}
                            showSelectButton={true}
                            className={`transition-all ${
                              orderFormData.assignedManufacturerId === manufacturer.id 
                                ? 'ring-2 ring-neon-blue shadow-lg' 
                                : 'hover:shadow-md'
                            }`}
                          />
                        ))}
                      </div>
                    </ScrollArea>
                    
                    {orderFormData.assignedManufacturerId && (
                      <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-700">
                        <div className="flex items-center text-green-700 dark:text-green-300">
                          <Check className="w-4 h-4 mr-2" />
                          <span className="text-sm font-medium">
                            Manufacturer selected: {
                              manufacturers.find(m => m.id === orderFormData.assignedManufacturerId)?.company ||
                              `${manufacturers.find(m => m.id === orderFormData.assignedManufacturerId)?.firstName} ${manufacturers.find(m => m.id === orderFormData.assignedManufacturerId)?.lastName}`
                            }
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Factory className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No manufacturers available</p>
                    <Button
                      variant="outline"
                      onClick={() => setLocation('/admin/manufacturers')}
                      className="mt-4"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Manufacturer
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-8 text-muted-foreground">
            <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Step content for "{step.title}" will be implemented here</p>
          </div>
        );
    }
  };

  if (ordersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-neon-blue" />
        <span className="ml-2 text-foreground">Loading enhanced order management...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Enhanced Order Management</h1>
          <p className="text-muted-foreground">Comprehensive order lifecycle with team coordination</p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={() => refetchOrders()}
            disabled={ordersLoading}
            className="glass-button"
          >
            {ordersLoading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Refresh
          </Button>
          <Button 
            onClick={handleStartOrder}
            className="bg-neon-blue hover:bg-neon-blue/80 text-rich-black font-semibold"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Order
          </Button>
        </div>
      </div>

      {/* Order Creation Modal */}
      {isCreatingOrder && (
        <Dialog open={isCreatingOrder} onOpenChange={setIsCreatingOrder}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rich-card">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-foreground">
                Create New Order
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Complete the steps to create a comprehensive order with manufacturer selection
              </DialogDescription>
            </DialogHeader>

            {/* Progress Steps */}
            <div className="flex items-center justify-between mb-6">
              {ONBOARDING_STEPS.map((step, index) => {
                const StepIcon = step.icon;
                const isActive = index === currentStep;
                const isCompleted = index < currentStep;
                
                return (
                  <div key={step.id} className="flex items-center">
                    <div className={`
                      flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200
                      ${isActive ? 'border-neon-blue bg-neon-blue text-rich-black' :
                        isCompleted ? 'border-neon-green bg-neon-green text-rich-black' :
                        'border-glass-border bg-glass-surface text-muted-foreground'}
                    `}>
                      {isCompleted ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <StepIcon className="w-5 h-5" />
                      )}
                    </div>
                    {index < ONBOARDING_STEPS.length - 1 && (
                      <div className={`
                        h-0.5 w-12 mx-2 transition-all duration-200
                        ${isCompleted ? 'bg-neon-green' : 'bg-glass-border'}
                      `} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Step Content */}
            <div className="min-h-[400px]">
              {renderStepContent()}
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center pt-6 border-t border-glass-border">
              <Button
                variant="outline"
                onClick={handlePreviousStep}
                disabled={currentStep === 0}
                className="glass-button"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              
              <div className="text-sm text-muted-foreground">
                Step {currentStep + 1} of {ONBOARDING_STEPS.length}
              </div>
              
              <Button
                onClick={handleNextStep}
                disabled={currentStep === ONBOARDING_STEPS.length - 1}
                className="bg-neon-blue hover:bg-neon-blue/80 text-rich-black font-semibold"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Orders Table Placeholder */}
      <Card className="rich-card">
        <CardHeader>
          <CardTitle className="text-foreground">Active Orders</CardTitle>
          <CardDescription>
            Order management interface with manufacturer details integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Orders table with manufacturer cards will be displayed here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}