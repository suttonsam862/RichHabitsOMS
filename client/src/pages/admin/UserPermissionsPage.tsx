import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Users, Shield, Settings, AlertTriangle, Plus, Edit, Trash2, Search, 
  UserCheck, Clock, Activity, Archive, Download, Upload, Filter,
  UserPlus, UserMinus, RotateCcw, AlertCircle, CheckCircle2
} from 'lucide-react';

// Enhanced role schema with validation
const roleSchema = z.object({
  name: z.string().min(2, "Role name must be at least 2 characters").max(50, "Role name too long"),
  description: z.string().min(10, "Description must be at least 10 characters").max(200, "Description too long"),
  permissions: z.array(z.string()).min(1, "At least one permission must be selected"),
  isActive: z.boolean().default(true),
  maxUsers: z.number().min(1, "Max users must be at least 1").max(1000, "Max users cannot exceed 1000").optional(),
  autoAssignNewUsers: z.boolean().default(false),
  requireApproval: z.boolean().default(false),
  sessionTimeout: z.number().min(15, "Session timeout must be at least 15 minutes").max(1440, "Session timeout cannot exceed 24 hours").default(480)
});

const userAssignmentSchema = z.object({
  userId: z.string().min(1, "User selection is required"),
  roleId: z.string().min(1, "Role selection is required"),
  effectiveDate: z.string().optional(),
  expirationDate: z.string().optional(),
  reason: z.string().min(5, "Reason must be at least 5 characters").max(200, "Reason too long"),
  notifyUser: z.boolean().default(true),
  requirePasswordReset: z.boolean().default(false)
});

// Enhanced permission categories with detailed descriptions
const permissionCategories = {
  'User Management': {
    permissions: [
      { key: 'create_users', name: 'Create Users', description: 'Ability to create new user accounts', risk: 'medium' },
      { key: 'edit_users', name: 'Edit Users', description: 'Modify existing user information', risk: 'medium' },
      { key: 'delete_users', name: 'Delete Users', description: 'Remove users from the system', risk: 'high' },
      { key: 'view_user_details', name: 'View User Details', description: 'Access detailed user information', risk: 'low' },
      { key: 'reset_passwords', name: 'Reset Passwords', description: 'Reset user passwords', risk: 'medium' }
    ]
  },
  'Order Management': {
    permissions: [
      { key: 'create_orders', name: 'Create Orders', description: 'Create new orders in the system', risk: 'low' },
      { key: 'edit_orders', name: 'Edit Orders', description: 'Modify existing orders', risk: 'medium' },
      { key: 'delete_orders', name: 'Delete Orders', description: 'Remove orders from the system', risk: 'high' },
      { key: 'view_all_orders', name: 'View All Orders', description: 'Access to view all orders', risk: 'low' },
      { key: 'approve_orders', name: 'Approve Orders', description: 'Approve orders for processing', risk: 'medium' }
    ]
  },
  'Financial': {
    permissions: [
      { key: 'view_financials', name: 'View Financial Data', description: 'Access financial reports and data', risk: 'medium' },
      { key: 'process_payments', name: 'Process Payments', description: 'Handle payment processing', risk: 'high' },
      { key: 'issue_refunds', name: 'Issue Refunds', description: 'Process customer refunds', risk: 'high' },
      { key: 'view_revenue', name: 'View Revenue', description: 'Access revenue and profit data', risk: 'medium' },
      { key: 'export_financial', name: 'Export Financial Data', description: 'Export financial reports', risk: 'medium' }
    ]
  },
  'System Administration': {
    permissions: [
      { key: 'manage_settings', name: 'Manage Settings', description: 'Configure system settings', risk: 'high' },
      { key: 'view_logs', name: 'View System Logs', description: 'Access system audit logs', risk: 'medium' },
      { key: 'manage_integrations', name: 'Manage Integrations', description: 'Configure third-party integrations', risk: 'high' },
      { key: 'backup_restore', name: 'Backup & Restore', description: 'Perform system backups and restores', risk: 'high' },
      { key: 'system_maintenance', name: 'System Maintenance', description: 'Perform system maintenance tasks', risk: 'high' }
    ]
  }
};

function UserPermissionsPageContent() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('roles');
  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);
  const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false);
  const [roleValidationErrors, setRoleValidationErrors] = useState<string[]>([]);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const roleForm = useForm({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: '',
      description: '',
      permissions: [],
      isActive: true,
      maxUsers: undefined,
      autoAssignNewUsers: false,
      requireApproval: false,
      sessionTimeout: 480
    }
  });

  const assignmentForm = useForm({
    resolver: zodResolver(userAssignmentSchema),
    defaultValues: {
      userId: '',
      roleId: '',
      effectiveDate: '',
      expirationDate: '',
      reason: '',
      notifyUser: true,
      requirePasswordReset: false
    }
  });

  // Fetch all users with enhanced filtering
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin', 'users', 'permissions'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/admin/users/all', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    }
  });

  // Fetch role usage statistics
  const { data: roleStats } = useQuery({
    queryKey: ['admin', 'role-statistics'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/admin/roles/statistics', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch role statistics');
      return response.json();
    }
  });

  // Create role mutation with enhanced validation
  const createRoleMutation = useMutation({
    mutationFn: async (data: z.infer<typeof roleSchema>) => {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create role');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'role-statistics'] });
      setIsCreateRoleOpen(false);
      roleForm.reset();
      toast({
        title: 'Success',
        description: 'Role created successfully with security validation',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to create role: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  // Bulk role assignment mutation
  const bulkAssignMutation = useMutation({
    mutationFn: async (data: { userIds: string[], roleId: string, options: any }) => {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/admin/roles/bulk-assign', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to assign roles');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setIsBulkAssignOpen(false);
      setSelectedUsers([]);
      toast({
        title: 'Success',
        description: `Roles assigned to ${data.successCount} users successfully`,
      });
    }
  });

  // Enhanced permission validation
  const validatePermissions = (permissions: string[]) => {
    const errors: string[] = [];
    const highRiskPermissions = [];

    for (const permission of permissions) {
      for (const category of Object.values(permissionCategories)) {
        const perm = category.permissions.find(p => p.key === permission);
         if (perm && perm.risk === 'high') {
          highRiskPermissions.push(perm.name);
        }
      }
    }

    if (highRiskPermissions.length > 3) {
      errors.push(`Too many high-risk permissions selected: ${highRiskPermissions.join(', ')}`);
    }

    if (permissions.includes('delete_users') && permissions.includes('manage_settings')) {
      errors.push('Combining user deletion and settings management is not recommended');
    }

    setRoleValidationErrors(errors);
    return errors.length === 0;
  };

  const onRoleSubmit = (data: z.infer<typeof roleSchema>) => {
    if (!validatePermissions(data.permissions)) {
      return;
    }
    createRoleMutation.mutate(data);
  };

  const users = usersData?.users || [];
  const filteredUsers = users.filter((user: any) => {
    const matchesSearch = user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = selectedRole === 'all' || user.role === selectedRole;

    return matchesSearch && matchesRole;
  });

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-neon-blue">User Permissions & Role Management</h1>
          <p className="subtitle text-neon-green text-sm mt-2">
            Advanced user role management with security validation and audit trails
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCreateRoleOpen} onOpenChange={setIsCreateRoleOpen}>
            <DialogTrigger asChild>
              <Button className="btn-primary">
                <Plus className="mr-2 h-4 w-4" />
                Create Role
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Role with Security Validation</DialogTitle>
                <DialogDescription>
                  Define a new role with carefully selected permissions and security constraints
                </DialogDescription>
              </DialogHeader>
              <Form {...roleForm}>
                <form onSubmit={roleForm.handleSubmit(onRoleSubmit)} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={roleForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Role Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Senior Designer" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={roleForm.control}
                      name="maxUsers"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Maximum Users (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number" 
                              placeholder="Leave empty for unlimited"
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={roleForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Detailed description of role responsibilities" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-4">
                    <FormLabel>Permissions (Security Validated)</FormLabel>
                    {roleValidationErrors.length > 0 && (
                      <div className="p-3 border border-red-500 rounded-lg bg-red-50">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="h-4 w-4 text-red-500" />
                          <span className="text-sm font-medium text-red-700">Security Warnings:</span>
                        </div>
                        {roleValidationErrors.map((error, index) => (
                          <p key={index} className="text-sm text-red-600">• {error}</p>
                        ))}
                      </div>
                    )}

                    {Object.entries(permissionCategories).map(([categoryName, category]) => (
                      <div key={categoryName} className="border rounded-lg p-4">
                        <h4 className="font-medium mb-3">{categoryName}</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {category.permissions.map((permission) => (
                            <FormField
                              key={permission.key}
                              control={roleForm.control}
                              name="permissions"
                              render={({ field }) => (
                                <FormItem className="flex items-start space-x-2 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(permission.key)}
                                      onCheckedChange={(checked) => {
                                        const updatedPermissions = checked
                                          ? [...(field.value || []), permission.key]
                                          : (field.value || []).filter((p) => p !== permission.key);
                                        field.onChange(updatedPermissions);
                                        validatePermissions(updatedPermissions);
                                      }}
                                    />
                                  </FormControl>
                                  <div className="flex-1">
                                    <FormLabel className="text-sm flex items-center gap-2">
                                      {permission.name}
                                      <Badge 
                                        variant={permission.risk === 'high' ? 'destructive' : permission.risk === 'medium' ? 'default' : 'secondary'}
                                        className="text-xs"
                                      >
                                        {permission.risk}
                                      </Badge>
                                    </FormLabel>
                                    <FormDescription className="text-xs">
                                      {permission.description}
                                    </FormDescription>
                                  </div>
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={roleForm.control}
                      name="sessionTimeout"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Session Timeout (minutes)</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number"
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={roleForm.control}
                      name="requireApproval"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Require Approval for Assignment</FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={roleForm.control}
                      name="autoAssignNewUsers"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Auto-assign to New Users</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsCreateRoleOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createRoleMutation.isPending || roleValidationErrors.length > 0}>
                      Create Role
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Button 
            variant="outline" 
            onClick={() => setIsBulkAssignOpen(true)}
            disabled={selectedUsers.length === 0}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Bulk Assign ({selectedUsers.length})
          </Button>
        </div>
      </div>

      {/* Role Statistics Dashboard */}
      {roleStats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Roles</p>
                  <p className="text-2xl font-bold">{roleStats.totalRoles}</p>
                </div>
                <Shield className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Users</p>
                  <p className="text-2xl font-bold">{roleStats.activeUsers}</p>
                </div>
                <UserCheck className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Approvals</p>
                  <p className="text-2xl font-bold">{roleStats.pendingApprovals}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">High-Risk Roles</p>
                  <p className="text-2xl font-bold">{roleStats.highRiskRoles}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="roles">Role Management</TabsTrigger>
          <TabsTrigger value="users">User Assignment</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          <TabsTrigger value="security">Security Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="mr-2 h-5 w-5" />
                Role Definitions & Permissions
              </CardTitle>
              <CardDescription>
                Configure roles with granular permissions and security validation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>Role management interface with permission matrix will be displayed here</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  className="pl-8 w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
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

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedUsers(filteredUsers.map((user: any) => user.id));
                          } else {
                            setSelectedUsers([]);
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Current Role</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Risk Level</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user: any) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedUsers.includes(user.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedUsers([...selectedUsers, user.id]);
                            } else {
                              setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.firstName} {user.lastName}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? 'default' : 'secondary'}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            user.riskLevel === 'high' ? 'destructive' : 
                            user.riskLevel === 'medium' ? 'default' : 'secondary'
                          }
                        >
                          {user.riskLevel || 'low'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="mr-2 h-5 w-5" />
                Role Assignment Audit Trail
              </CardTitle>
              <CardDescription>
                Track all role changes and permission modifications with timestamps
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>Audit trail functionality will be implemented here</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="mr-2 h-5 w-5" />
                Security Analysis & Risk Assessment
              </CardTitle>
              <CardDescription>
                Analyze role configurations for security vulnerabilities and compliance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>Security analysis dashboard will be implemented here</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bulk Assignment Dialog */}
      <Dialog open={isBulkAssignOpen} onOpenChange={setIsBulkAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Role Assignment</DialogTitle>
            <DialogDescription>
              Assign roles to {selectedUsers.length} selected users with audit trail
            </DialogDescription>
          </DialogHeader>
          <Form {...assignmentForm}>
            <form className="space-y-4">
              <FormField
                control={assignmentForm.control}
                name="roleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role to assign" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
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

              <FormField
                control={assignmentForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for Assignment</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Required for audit trail" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={assignmentForm.control}
                  name="notifyUser"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel>Notify Users via Email</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={assignmentForm.control}
                  name="requirePasswordReset"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel>Require Password Reset</FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsBulkAssignOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  onClick={() => {
                    const formData = assignmentForm.getValues();
                    bulkAssignMutation.mutate({
                      userIds: selectedUsers,
                      roleId: formData.roleId,
                      options: formData
                    });
                  }}
                  disabled={bulkAssignMutation.isPending}
                >
                  Assign Roles
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function UserPermissionsPage() {
  return (
    <ErrorBoundary
      fallback={({ error, resetError }) => (
        <div className="container mx-auto py-8">
          <Card className="mx-auto max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                User Permissions Error
              </CardTitle>
              <CardDescription>
                Failed to load user permissions management.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Error: {error?.message || 'Unknown error occurred'}
              </p>
              <div className="flex gap-2">
                <Button onClick={resetError} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button onClick={() => window.location.reload()} size="sm">
                  Reload Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    >
      <UserPermissionsPageContent />
    </ErrorBoundary>
  );
}