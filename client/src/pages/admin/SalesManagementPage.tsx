
import { useState } from 'react';
import { useSalespeople, useCreateSalesperson, useUpdateSalesperson, useDeleteSalesperson } from '@/hooks/useSalespeople';
import { Salesperson } from '@/lib/salespersonApi';
import { useToast } from '@/hooks/use-toast';
import SalespersonForm from '@/components/forms/SalespersonForm';
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



export default function SalesManagementPage() {
  const [selectedSalesperson, setSelectedSalesperson] = useState<Salesperson | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Salesperson>>({});

  const { toast } = useToast();

  // Fetch salespeople using new hook
  const { data: salespeople, isLoading } = useSalespeople();

  // Mutations using new hooks
  const createSalespersonMutation = useCreateSalesperson();
  const updateSalespersonMutation = useUpdateSalesperson();
  const deleteSalespersonMutation = useDeleteSalesperson();

  const handleCreate = () => {
    createSalespersonMutation.mutate(formData, {
      onSuccess: () => {
        setIsCreateModalOpen(false);
        setFormData({});
      }
    });
  };

  const handleUpdate = () => {
    if (selectedSalesperson) {
      updateSalespersonMutation.mutate({
        id: selectedSalesperson.id,
        data: formData
      }, {
        onSuccess: () => {
          setIsEditModalOpen(false);
          setFormData({});
        }
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

// Duplicate SalespersonForm removed - using imported component from @/components/forms/SalespersonForm
