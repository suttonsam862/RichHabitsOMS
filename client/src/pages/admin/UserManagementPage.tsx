import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  UserPlus, 
  Settings, 
  Shield, 
  Activity,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Ban,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';

// Form schemas
const createUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  role: z.string().min(1, "Role is required"),
  password: z.string().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  department: z.string().optional(),
  title: z.string().optional(),
  sendInvitation: z.boolean().default(true),
});

const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  department: z.string().optional(),
  title: z.string().optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
});

type CreateUserData = z.infer<typeof createUserSchema>;
type UpdateUserData = z.infer<typeof updateUserSchema>;

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  lastLogin: string;
  createdAt: string;
  phone?: string;
  company?: string;
  department?: string;
  title?: string;
}

export default function UserManagementPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Create user form
  const createForm = useForm<CreateUserData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      role: '',
      password: '',
      phone: '',
      company: '',
      department: '',
      title: '',
      sendInvitation: true,
    },
  });

  // Update user form
  const updateForm = useForm<UpdateUserData>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      company: '',
      department: '',
      title: '',
      status: 'active',
    },
  });

  // Fetch users
  const { data: usersData, isLoading, error, refetch } = useQuery({
    queryKey: ['user-management', 'users', currentPage, searchQuery, statusFilter, roleFilter],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '50',
        ...(searchQuery && { search: searchQuery }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(roleFilter !== 'all' && { role: roleFilter }),
      });

      const response = await fetch(`/api/user-management/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      return response.json();
    },
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: CreateUserData) => {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/user-management/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create user');
      }

      return response.json();
    },
    onSuccess: (response) => {
      let description = response.message;
      
      // Show temporary password if one was generated and not emailed
      if (response.data?.temporaryPassword) {
        description += `\n\nTemporary Password: ${response.data.temporaryPassword}\n\nPlease provide this password to the user securely.`;
      }
      
      toast({
        title: 'Success',
        description,
      });
      setIsCreateDialogOpen(false);
      createForm.reset();
      queryClient.invalidateQueries({ queryKey: ['user-management', 'users'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateUserData }) => {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/user-management/users/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update user');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'User updated successfully',
      });
      setIsEditDialogOpen(false);
      setSelectedUser(null);
      updateForm.reset();
      queryClient.invalidateQueries({ queryKey: ['user-management', 'users'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/user-management/users/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete user');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'User deactivated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['user-management', 'users'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleCreateUser = (data: CreateUserData) => {
    console.log('🚀 Form submitted with data:', data);
    console.log('📝 Form errors:', createForm.formState.errors);
    console.log('🔄 Form is valid:', createForm.formState.isValid);
    
    createUserMutation.mutate(data);
  };

  const handleUpdateUser = (data: UpdateUserData) => {
    if (selectedUser) {
      updateUserMutation.mutate({ id: selectedUser.id, data });
    }
  };

  const handleDeleteUser = (user: User) => {
    if (confirm(`Are you sure you want to deactivate ${user.firstName} ${user.lastName}?`)) {
      deleteUserMutation.mutate(user.id);
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    updateForm.reset({
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone || '',
      company: user.company || '',
      department: user.department || '',
      title: user.title || '',
      status: user.status as any,
    });
    setIsEditDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { variant: 'default' as const, icon: CheckCircle, className: 'bg-green-500' },
      inactive: { variant: 'secondary' as const, icon: Clock, className: 'bg-yellow-500' },
      suspended: { variant: 'destructive' as const, icon: Ban, className: 'bg-red-500' },
      terminated: { variant: 'destructive' as const, icon: XCircle, className: 'bg-gray-500' },
      pending_activation: { variant: 'outline' as const, icon: Clock, className: 'bg-blue-500' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className={`${config.className} text-white`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const users = usersData?.data?.users || [];
  const analytics = usersData?.data?.analytics || {};
  const pagination = usersData?.data?.pagination || {};

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground">Manage users, roles, and permissions</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-neon-blue hover:bg-neon-blue/80">
              <UserPlus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-rich-black/90 backdrop-blur-md border border-glass-border max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="text-neon-blue">Create New User</DialogTitle>
              <DialogDescription>
                Add a new user to the system with comprehensive permissions and send them an invitation.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto pr-2">
              <Form {...createForm}>
                <form 
                  onSubmit={createForm.handleSubmit(handleCreateUser, (errors) => {
                    console.log('❌ Form validation errors:', errors);
                  })} 
                  className="space-y-6"
                >
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-neon-blue">Basic Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={createForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input {...field} className="rich-input" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={createForm.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input {...field} className="rich-input" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={createForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" className="rich-input" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={createForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone</FormLabel>
                            <FormControl>
                              <Input {...field} className="rich-input" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={createForm.control}
                        name="company"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company</FormLabel>
                            <FormControl>
                              <Input {...field} className="rich-input" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Role and Permissions */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-neon-blue">Role & Permissions</h3>
                    <FormField
                      control={createForm.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primary Role</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="rich-input">
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rich-card">
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="salesperson">Salesperson</SelectItem>
                              <SelectItem value="designer">Designer</SelectItem>
                              <SelectItem value="manufacturer">Manufacturer</SelectItem>
                              <SelectItem value="customer">Customer</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Page Access Permissions */}
                    <div className="space-y-3">
                      <FormLabel className="text-base font-medium">Page Access Permissions</FormLabel>
                      <div className="grid grid-cols-2 gap-3 p-4 border rounded-lg">
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">Admin Pages</h4>
                          <div className="space-y-1">
                            <label className="flex items-center space-x-2 text-sm">
                              <input type="checkbox" className="rounded" />
                              <span>User Management</span>
                            </label>
                            <label className="flex items-center space-x-2 text-sm">
                              <input type="checkbox" className="rounded" />
                              <span>Analytics Dashboard</span>
                            </label>
                            <label className="flex items-center space-x-2 text-sm">
                              <input type="checkbox" className="rounded" />
                              <span>System Settings</span>
                            </label>
                            <label className="flex items-center space-x-2 text-sm">
                              <input type="checkbox" className="rounded" />
                              <span>Security Management</span>
                            </label>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">Business Pages</h4>
                          <div className="space-y-1">
                            <label className="flex items-center space-x-2 text-sm">
                              <input type="checkbox" className="rounded" />
                              <span>Catalog Management</span>
                            </label>
                            <label className="flex items-center space-x-2 text-sm">
                              <input type="checkbox" className="rounded" />
                              <span>Order Management</span>
                            </label>
                            <label className="flex items-center space-x-2 text-sm">
                              <input type="checkbox" className="rounded" />
                              <span>Customer Management</span>
                            </label>
                            <label className="flex items-center space-x-2 text-sm">
                              <input type="checkbox" className="rounded" />
                              <span>Production Queue</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Permissions */}
                    <div className="space-y-3">
                      <FormLabel className="text-base font-medium">Action Permissions</FormLabel>
                      <div className="grid grid-cols-3 gap-3 p-4 border rounded-lg">
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">User Actions</h4>
                          <div className="space-y-1">
                            <label className="flex items-center space-x-2 text-sm">
                              <input type="checkbox" className="rounded" />
                              <span>Create Users</span>
                            </label>
                            <label className="flex items-center space-x-2 text-sm">
                              <input type="checkbox" className="rounded" />
                              <span>Edit Users</span>
                            </label>
                            <label className="flex items-center space-x-2 text-sm">
                              <input type="checkbox" className="rounded" />
                              <span>Delete Users</span>
                            </label>
                            <label className="flex items-center space-x-2 text-sm">
                              <input type="checkbox" className="rounded" />
                              <span>Reset Passwords</span>
                            </label>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">Order Actions</h4>
                          <div className="space-y-1">
                            <label className="flex items-center space-x-2 text-sm">
                              <input type="checkbox" className="rounded" />
                              <span>Create Orders</span>
                            </label>
                            <label className="flex items-center space-x-2 text-sm">
                              <input type="checkbox" className="rounded" />
                              <span>Edit Orders</span>
                            </label>
                            <label className="flex items-center space-x-2 text-sm">
                              <input type="checkbox" className="rounded" />
                              <span>Approve Orders</span>
                            </label>
                            <label className="flex items-center space-x-2 text-sm">
                              <input type="checkbox" className="rounded" />
                              <span>Cancel Orders</span>
                            </label>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">Financial Actions</h4>
                          <div className="space-y-1">
                            <label className="flex items-center space-x-2 text-sm">
                              <input type="checkbox" className="rounded" />
                              <span>Process Payments</span>
                            </label>
                            <label className="flex items-center space-x-2 text-sm">
                              <input type="checkbox" className="rounded" />
                              <span>Issue Refunds</span>
                            </label>
                            <label className="flex items-center space-x-2 text-sm">
                              <input type="checkbox" className="rounded" />
                              <span>View Financial Data</span>
                            </label>
                            <label className="flex items-center space-x-2 text-sm">
                              <input type="checkbox" className="rounded" />
                              <span>Export Reports</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Advanced Permissions */}
                    <div className="space-y-3">
                      <FormLabel className="text-base font-medium">Advanced Permissions</FormLabel>
                      <div className="grid grid-cols-2 gap-3 p-4 border rounded-lg">
                        <div className="space-y-1">
                          <label className="flex items-center space-x-2 text-sm">
                            <input type="checkbox" className="rounded" />
                            <span>System Administration</span>
                          </label>
                          <label className="flex items-center space-x-2 text-sm">
                            <input type="checkbox" className="rounded" />
                            <span>Database Management</span>
                          </label>
                          <label className="flex items-center space-x-2 text-sm">
                            <input type="checkbox" className="rounded" />
                            <span>Audit Log Access</span>
                          </label>
                        </div>
                        <div className="space-y-1">
                          <label className="flex items-center space-x-2 text-sm">
                            <input type="checkbox" className="rounded" />
                            <span>API Access</span>
                          </label>
                          <label className="flex items-center space-x-2 text-sm">
                            <input type="checkbox" className="rounded" />
                            <span>Integration Management</span>
                          </label>
                          <label className="flex items-center space-x-2 text-sm">
                            <input type="checkbox" className="rounded" />
                            <span>Backup & Restore</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Authentication Settings */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-neon-blue">Authentication Settings</h3>
                    
                    <FormField
                      control={createForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="password" 
                              className="rich-input" 
                              placeholder="Leave blank to require user to set password on first login"
                            />
                          </FormControl>
                          <div className="text-sm text-muted-foreground">
                            If left blank, the user will be required to set up their password upon first login.
                            If provided, minimum 6 characters required.
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createForm.control}
                      name="sendInvitation"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Send Email Invitation</FormLabel>
                            <div className="text-sm text-muted-foreground">
                              Send an email invitation to the user with login instructions
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end space-x-2 pt-4 border-t sticky bottom-0 bg-rich-black/90 backdrop-blur-md">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createUserMutation.isPending}
                      className="bg-neon-blue hover:bg-neon-blue/80"
                      onClick={(e) => {
                        console.log('🖱️ Create User button clicked');
                        console.log('📝 Form state:', createForm.formState);
                        console.log('📄 Form values:', createForm.getValues());
                      }}
                    >
                      {createUserMutation.isPending ? 'Creating...' : 'Create User'}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-panel">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-neon-blue">{analytics.totalUsers || 0}</div>
          </CardContent>
        </Card>
        <Card className="glass-panel">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{analytics.activeUsers || 0}</div>
          </CardContent>
        </Card>
        <Card className="glass-panel">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspended</CardTitle>
            <Ban className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{analytics.suspendedUsers || 0}</div>
          </CardContent>
        </Card>
        <Card className="glass-panel">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{analytics.pendingUsers || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="glass-panel">
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 rich-input"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] rich-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rich-card">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="pending_activation">Pending</SelectItem>
                </SelectContent>
              </Select>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[140px] rich-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rich-card">
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="salesperson">Salesperson</SelectItem>
                  <SelectItem value="designer">Designer</SelectItem>
                  <SelectItem value="manufacturer">Manufacturer</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading users...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">Error loading users</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user: User) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.firstName} {user.lastName}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.role}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(user.status)}</TableCell>
                      <TableCell>{user.company || '-'}</TableCell>
                      <TableCell>{user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUser(user)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-rich-black/90 backdrop-blur-md border border-glass-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-neon-blue">Edit User</DialogTitle>
            <DialogDescription>
              Update user information and status.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <Form {...updateForm}>
              <form onSubmit={updateForm.handleSubmit(handleUpdateUser)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={updateForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input {...field} className="rich-input" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={updateForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input {...field} className="rich-input" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={updateForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="rich-input">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rich-card">
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={updateForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input {...field} className="rich-input" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={updateForm.control}
                    name="company"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company</FormLabel>
                        <FormControl>
                          <Input {...field} className="rich-input" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateUserMutation.isPending}
                    className="bg-neon-blue hover:bg-neon-blue/80"
                  >
                    {updateUserMutation.isPending ? 'Updating...' : 'Update User'}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}