
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Users,
  Plus,
  Edit,
  DollarSign,
  Target,
  TrendingUp,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Award,
  Building2,
  FileText,
  Camera
} from 'lucide-react';

interface Salesperson {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  employee_id: string;
  position_title?: string;
  hire_date?: string;
  employment_status: string;
  base_salary?: number;
  commission_rate?: number;
  sales_quota?: number;
  current_year_sales?: number;
  customer_count?: number;
  performance_rating?: number;
  profile_photo_url?: string;
  is_active: boolean;
}

export default function SalesManagementPage() {
  const [selectedSalesperson, setSelectedSalesperson] = useState<Salesperson | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Salesperson>>({});

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch salespeople
  const { data: salespeople, isLoading } = useQuery({
    queryKey: ['salespeople'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/sales-management');
      const data = await response.json();
      return data.data;
    },
  });

  // Create salesperson mutation
  const createSalespersonMutation = useMutation({
    mutationFn: async (data: Partial<Salesperson>) => {
      const response = await apiRequest('POST', '/api/sales-management', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Salesperson Created',
        description: 'New salesperson has been added successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['salespeople'] });
      setIsCreateModalOpen(false);
      setFormData({});
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create salesperson',
        variant: 'destructive',
      });
    },
  });

  // Update salesperson mutation
  const updateSalespersonMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Salesperson> }) => {
      const response = await apiRequest('PATCH', `/api/sales-management/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Salesperson Updated',
        description: 'Salesperson information has been updated successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['salespeople'] });
      setIsEditModalOpen(false);
      setFormData({});
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update salesperson',
        variant: 'destructive',
      });
    },
  });

  const handleCreate = () => {
    createSalespersonMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (selectedSalesperson) {
      updateSalespersonMutation.mutate({
        id: selectedSalesperson.id,
        data: formData
      });
    }
  };

  const openEditModal = (salesperson: Salesperson) => {
    setSelectedSalesperson(salesperson);
    setFormData(salesperson);
    setIsEditModalOpen(true);
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercentage = (rate?: number) => {
    if (!rate) return '0%';
    return `${(rate * 100).toFixed(1)}%`;
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'inactive':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'terminated':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white">Loading salespeople...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Sales Management</h1>
          <p className="text-white/70">Manage your sales team and performance</p>
        </div>
        
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-neon-blue to-neon-green text-black hover:opacity-90">
              <Plus className="w-4 h-4 mr-2" />
              Add Salesperson
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-panel border-glass-border text-white max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">Add New Salesperson</DialogTitle>
            </DialogHeader>
            <SalespersonForm
              formData={formData}
              setFormData={setFormData}
              onSubmit={handleCreate}
              isLoading={createSalespersonMutation.isPending}
              submitLabel="Create Salesperson"
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-panel border-glass-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/70">Total Salespeople</CardTitle>
            <Users className="h-4 w-4 text-neon-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{salespeople?.length || 0}</div>
          </CardContent>
        </Card>

        <Card className="glass-panel border-glass-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/70">Active Salespeople</CardTitle>
            <TrendingUp className="h-4 w-4 text-neon-green" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {salespeople?.filter((s: Salesperson) => s.employment_status === 'active').length || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel border-glass-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/70">Total Customers</CardTitle>
            <Building2 className="h-4 w-4 text-neon-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {salespeople?.reduce((sum: number, s: Salesperson) => sum + (s.customer_count || 0), 0) || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel border-glass-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/70">Total Sales YTD</CardTitle>
            <DollarSign className="h-4 w-4 text-neon-green" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(salespeople?.reduce((sum: number, s: Salesperson) => sum + (s.current_year_sales || 0), 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Salespeople Table */}
      <Card className="glass-panel border-glass-border">
        <CardHeader>
          <CardTitle className="text-white">Sales Team</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-glass-border hover:bg-white/5">
                  <TableHead className="text-white/70">Salesperson</TableHead>
                  <TableHead className="text-white/70">Employee ID</TableHead>
                  <TableHead className="text-white/70">Status</TableHead>
                  <TableHead className="text-white/70">Customers</TableHead>
                  <TableHead className="text-white/70">YTD Sales</TableHead>
                  <TableHead className="text-white/70">Commission Rate</TableHead>
                  <TableHead className="text-white/70">Performance</TableHead>
                  <TableHead className="text-white/70">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salespeople?.map((salesperson: Salesperson) => (
                  <TableRow key={salesperson.id} className="border-glass-border hover:bg-white/5">
                    <TableCell className="text-white">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-neon-blue to-neon-green flex items-center justify-center text-black font-semibold">
                          {salesperson.first_name[0]}{salesperson.last_name[0]}
                        </div>
                        <div>
                          <div className="font-medium">{salesperson.first_name} {salesperson.last_name}</div>
                          <div className="text-sm text-white/70">{salesperson.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-white">{salesperson.employee_id}</TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeColor(salesperson.employment_status)}>
                        {salesperson.employment_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-white">{salesperson.customer_count || 0}</TableCell>
                    <TableCell className="text-white">{formatCurrency(salesperson.current_year_sales)}</TableCell>
                    <TableCell className="text-white">{formatPercentage(salesperson.commission_rate)}</TableCell>
                    <TableCell className="text-white">
                      {salesperson.performance_rating ? `${salesperson.performance_rating}/5.0` : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(salesperson)}
                        className="text-neon-blue hover:text-neon-blue/80 hover:bg-neon-blue/10"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="glass-panel border-glass-border text-white max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              Edit {selectedSalesperson?.first_name} {selectedSalesperson?.last_name}
            </DialogTitle>
          </DialogHeader>
          <SalespersonForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleUpdate}
            isLoading={updateSalespersonMutation.isPending}
            submitLabel="Update Salesperson"
            isEdit={true}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Reusable form component
interface SalespersonFormProps {
  formData: Partial<Salesperson>;
  setFormData: (data: Partial<Salesperson>) => void;
  onSubmit: () => void;
  isLoading: boolean;
  submitLabel: string;
  isEdit?: boolean;
}

function SalespersonForm({ formData, setFormData, onSubmit, isLoading, submitLabel, isEdit }: SalespersonFormProps) {
  return (
    <Tabs defaultValue="personal" className="w-full">
      <TabsList className="grid w-full grid-cols-4 glass-panel">
        <TabsTrigger value="personal" className="text-white data-[state=active]:bg-neon-blue data-[state=active]:text-black">
          Personal
        </TabsTrigger>
        <TabsTrigger value="employment" className="text-white data-[state=active]:bg-neon-blue data-[state=active]:text-black">
          Employment
        </TabsTrigger>
        <TabsTrigger value="payroll" className="text-white data-[state=active]:bg-neon-blue data-[state=active]:text-black">
          Payroll
        </TabsTrigger>
        <TabsTrigger value="performance" className="text-white data-[state=active]:bg-neon-blue data-[state=active]:text-black">
          Performance
        </TabsTrigger>
      </TabsList>

      <TabsContent value="personal" className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-white">First Name *</Label>
            <Input
              value={formData.first_name || ''}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              className="glass-input"
              placeholder="Enter first name"
            />
          </div>
          <div>
            <Label className="text-white">Last Name *</Label>
            <Input
              value={formData.last_name || ''}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              className="glass-input"
              placeholder="Enter last name"
            />
          </div>
          <div>
            <Label className="text-white">Email *</Label>
            <Input
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="glass-input"
              placeholder="Enter email"
            />
          </div>
          <div>
            <Label className="text-white">Phone</Label>
            <Input
              value={formData.phone || ''}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="glass-input"
              placeholder="Enter phone number"
            />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="employment" className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-white">Employee ID</Label>
            <Input
              value={formData.employee_id || ''}
              onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
              className="glass-input"
              placeholder="Auto-generated if empty"
              disabled={isEdit}
            />
          </div>
          <div>
            <Label className="text-white">Position Title</Label>
            <Input
              value={formData.position_title || ''}
              onChange={(e) => setFormData({ ...formData, position_title: e.target.value })}
              className="glass-input"
              placeholder="e.g., Sales Representative"
            />
          </div>
          <div>
            <Label className="text-white">Hire Date</Label>
            <Input
              type="date"
              value={formData.hire_date || ''}
              onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
              className="glass-input"
            />
          </div>
          <div>
            <Label className="text-white">Employment Status</Label>
            <Select 
              value={formData.employment_status || 'active'} 
              onValueChange={(value) => setFormData({ ...formData, employment_status: value })}
            >
              <SelectTrigger className="glass-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass-panel border-glass-border">
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="payroll" className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-white">Base Salary</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.base_salary || ''}
              onChange={(e) => setFormData({ ...formData, base_salary: parseFloat(e.target.value) })}
              className="glass-input"
              placeholder="Annual base salary"
            />
          </div>
          <div>
            <Label className="text-white">Commission Rate (%)</Label>
            <Input
              type="number"
              step="0.001"
              min="0"
              max="1"
              value={formData.commission_rate ? formData.commission_rate * 100 : ''}
              onChange={(e) => setFormData({ ...formData, commission_rate: parseFloat(e.target.value) / 100 })}
              className="glass-input"
              placeholder="e.g., 5 for 5%"
            />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="performance" className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-white">Sales Quota</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.sales_quota || ''}
              onChange={(e) => setFormData({ ...formData, sales_quota: parseFloat(e.target.value) })}
              className="glass-input"
              placeholder="Annual sales quota"
            />
          </div>
          <div>
            <Label className="text-white">Performance Rating (1-5)</Label>
            <Input
              type="number"
              step="0.1"
              min="1"
              max="5"
              value={formData.performance_rating || ''}
              onChange={(e) => setFormData({ ...formData, performance_rating: parseFloat(e.target.value) })}
              className="glass-input"
              placeholder="1.0 to 5.0"
            />
          </div>
        </div>
      </TabsContent>

      <div className="flex justify-end space-x-2 pt-4">
        <Button
          onClick={onSubmit}
          disabled={isLoading || !formData.first_name || !formData.last_name || !formData.email}
          className="bg-gradient-to-r from-neon-blue to-neon-green text-black hover:opacity-90"
        >
          {isLoading ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </Tabs>
  );
}
