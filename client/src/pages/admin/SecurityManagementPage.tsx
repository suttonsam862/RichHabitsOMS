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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  Shield, 
  Key, 
  AlertTriangle,
  Lock,
  Smartphone,
  Clock,
  UserX,
  Eye,
  Settings,
  Plus,
  Trash2,
  CheckCircle,
  XCircle
} from 'lucide-react';

// Form schemas
const mfaSetupSchema = z.object({
  method: z.enum(['totp', 'sms', 'email']),
  deviceName: z.string().min(1, 'Device name is required'),
  phoneNumber: z.string().optional(),
});

const passwordPolicySchema = z.object({
  name: z.string().min(1, 'Policy name is required'),
  minLength: z.number().min(4).max(128),
  requireUppercase: z.boolean(),
  requireLowercase: z.boolean(),
  requireNumbers: z.boolean(),
  requireSpecialChars: z.boolean(),
  preventReuse: z.number().min(0).max(50),
  maxAge: z.number().min(0).max(365),
  lockoutAttempts: z.number().min(1).max(20),
  lockoutDuration: z.number().min(1).max(1440),
});

const permissionTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  description: z.string().optional(),
  permissions: z.object({}).passthrough(),
  category: z.string().optional(),
});

type MfaSetupData = z.infer<typeof mfaSetupSchema>;
type PasswordPolicyData = z.infer<typeof passwordPolicySchema>;
type PermissionTemplateData = z.infer<typeof permissionTemplateSchema>;

export default function SecurityManagementPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isMfaDialogOpen, setIsMfaDialogOpen] = useState(false);
  const [isPolicyDialogOpen, setIsPolicyDialogOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [mfaQrCode, setMfaQrCode] = useState<string | null>(null);
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);

  // Forms
  const mfaForm = useForm<MfaSetupData>({
    resolver: zodResolver(mfaSetupSchema),
    defaultValues: {
      method: 'totp',
      deviceName: '',
    },
  });

  const policyForm = useForm<PasswordPolicyData>({
    resolver: zodResolver(passwordPolicySchema),
    defaultValues: {
      name: '',
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      preventReuse: 5,
      maxAge: 90,
      lockoutAttempts: 5,
      lockoutDuration: 30,
    },
  });

  const templateForm = useForm<PermissionTemplateData>({
    resolver: zodResolver(permissionTemplateSchema),
    defaultValues: {
      name: '',
      description: '',
      permissions: {},
    },
  });

  // Fetch security events
  const { data: securityEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ['security', 'events'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/security/events', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch security events');
      }

      const result = await response.json();
      return result.data;
    },
    retry: false, // Don't retry failed requests
    refetchOnWindowFocus: false,
    staleTime: 600000, // Cache for 10 minutes
    enabled: false // Disable until endpoint is fixed
  });

  // Fetch permission templates
  const { data: permissionTemplates, isLoading: templatesLoading } = useQuery({
    queryKey: ['security', 'permission-templates'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/security/permission-templates', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch permission templates');
      }

      const result = await response.json();
      return result.data;
    },
    retry: false, // Don't retry failed requests  
    refetchOnWindowFocus: false,
    staleTime: 600000, // Cache for 10 minutes
    enabled: false // Disable until endpoint is fixed
  });

  // MFA setup mutation
  const mfaSetupMutation = useMutation({
    mutationFn: async (data: MfaSetupData) => {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/security/mfa/setup', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to set up MFA');
      }

      return response.json();
    },
    onSuccess: (response) => {
      if (response.data.qrCode) {
        setMfaQrCode(response.data.qrCode);
        setMfaSecret(response.data.secret);
      }
      toast({
        title: 'Success',
        description: 'MFA device set up successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Create permission template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (data: PermissionTemplateData) => {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/security/permission-templates', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create template');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Permission template created successfully',
      });
      setIsTemplateDialogOpen(false);
      templateForm.reset();
      queryClient.invalidateQueries({ queryKey: ['security', 'permission-templates'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleMfaSetup = (data: MfaSetupData) => {
    mfaSetupMutation.mutate(data);
  };

  const handleCreateTemplate = (data: PermissionTemplateData) => {
    createTemplateMutation.mutate(data);
  };

  const getSeverityBadge = (severity: string) => {
    const config = {
      low: { variant: 'secondary' as const, className: 'bg-blue-500' },
      medium: { variant: 'default' as const, className: 'bg-yellow-500' },
      high: { variant: 'destructive' as const, className: 'bg-orange-500' },
      critical: { variant: 'destructive' as const, className: 'bg-red-500' },
    };
    
    const severityConfig = config[severity as keyof typeof config] || config.medium;
    
    return (
      <Badge variant={severityConfig.variant} className={`${severityConfig.className} text-white`}>
        {severity.toUpperCase()}
      </Badge>
    );
  };

  const events = securityEvents?.events || [];
  const templates = permissionTemplates?.templates || [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neon-blue">Security Management</h1>
          <p className="text-muted-foreground">
            Manage authentication, permissions, and security policies
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="glass-panel">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="mfa">Multi-Factor Auth</TabsTrigger>
          <TabsTrigger value="policies">Password Policies</TabsTrigger>
          <TabsTrigger value="templates">Permission Templates</TabsTrigger>
          <TabsTrigger value="events">Security Events</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="glass-panel">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Active Sessions
                </CardTitle>
                <Shield className="h-4 w-4 text-neon-blue" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-neon-blue">24</div>
                <p className="text-xs text-muted-foreground">
                  +2 from last hour
                </p>
              </CardContent>
            </Card>

            <Card className="glass-panel">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Failed Logins
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-500">7</div>
                <p className="text-xs text-muted-foreground">
                  Last 24 hours
                </p>
              </CardContent>
            </Card>

            <Card className="glass-panel">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  MFA Enabled Users
                </CardTitle>
                <Lock className="h-4 w-4 text-neon-green" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-neon-green">18</div>
                <p className="text-xs text-muted-foreground">
                  75% of all users
                </p>
              </CardContent>
            </Card>

            <Card className="glass-panel">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Security Incidents
                </CardTitle>
                <Eye className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">3</div>
                <p className="text-xs text-muted-foreground">
                  Requiring attention
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* MFA Tab */}
        <TabsContent value="mfa" className="space-y-6">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-neon-blue">
                <Smartphone className="h-5 w-5" />
                Multi-Factor Authentication Setup
              </CardTitle>
              <CardDescription>
                Set up additional security layers for user accounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={isMfaDialogOpen} onOpenChange={setIsMfaDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="btn-primary">
                    <Plus className="mr-2 h-4 w-4" />
                    Add MFA Device
                  </Button>
                </DialogTrigger>
                <DialogContent className="glass-panel">
                  <DialogHeader>
                    <DialogTitle className="text-neon-blue">Add MFA Device</DialogTitle>
                    <DialogDescription>
                      Configure a new multi-factor authentication device
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...mfaForm}>
                    <form onSubmit={mfaForm.handleSubmit(handleMfaSetup)} className="space-y-4">
                      <FormField
                        control={mfaForm.control}
                        name="method"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Authentication Method</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select method" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="totp">Authenticator App (TOTP)</SelectItem>
                                <SelectItem value="sms">SMS</SelectItem>
                                <SelectItem value="email">Email</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={mfaForm.control}
                        name="deviceName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Device Name</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="My Phone" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {mfaForm.watch('method') === 'sms' && (
                        <FormField
                          control={mfaForm.control}
                          name="phoneNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone Number</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="+1234567890" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      {mfaQrCode && (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            Scan this QR code with your authenticator app:
                          </p>
                          <img src={mfaQrCode} alt="MFA QR Code" className="mx-auto" />
                          {mfaSecret && (
                            <p className="text-xs text-muted-foreground">
                              Manual entry key: {mfaSecret}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="flex justify-end space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsMfaDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          className="btn-primary"
                          disabled={mfaSetupMutation.isPending}
                        >
                          {mfaSetupMutation.isPending ? 'Setting up...' : 'Set up MFA'}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permission Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <Card className="glass-panel">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-neon-blue">
                    <Settings className="h-5 w-5" />
                    Permission Templates
                  </CardTitle>
                  <CardDescription>
                    Create reusable permission sets for quick role setup
                  </CardDescription>
                </div>
                <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="btn-primary">
                      <Plus className="mr-2 h-4 w-4" />
                      New Template
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="glass-panel">
                    <DialogHeader>
                      <DialogTitle className="text-neon-blue">Create Permission Template</DialogTitle>
                      <DialogDescription>
                        Create a reusable set of permissions for role assignment
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...templateForm}>
                      <form onSubmit={templateForm.handleSubmit(handleCreateTemplate)} className="space-y-4">
                        <FormField
                          control={templateForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Template Name</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Sales Manager" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={templateForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea {...field} placeholder="Permissions for sales team managers..." />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={templateForm.control}
                          name="category"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Category</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="sales">Sales</SelectItem>
                                  <SelectItem value="production">Production</SelectItem>
                                  <SelectItem value="admin">Administration</SelectItem>
                                  <SelectItem value="design">Design</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex justify-end space-x-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsTemplateDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            className="btn-primary"
                            disabled={createTemplateMutation.isPending}
                          >
                            {createTemplateMutation.isPending ? 'Creating...' : 'Create Template'}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {templatesLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-blue" />
                </div>
              ) : (
                <div className="space-y-4">
                  {templates.map((template: any) => (
                    <div key={template.id} className="flex items-center justify-between p-4 border border-glass-border rounded-lg">
                      <div>
                        <h4 className="font-medium text-foreground">{template.name}</h4>
                        <p className="text-sm text-muted-foreground">{template.description}</p>
                        {template.category && (
                          <Badge variant="outline" className="mt-1">
                            {template.category}
                          </Badge>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {templates.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No permission templates found. Create your first template to get started.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Events Tab */}
        <TabsContent value="events" className="space-y-6">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-neon-blue">
                <Eye className="h-5 w-5" />
                Security Events
              </CardTitle>
              <CardDescription>
                Monitor and analyze security-related activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-blue" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event: any) => (
                      <TableRow key={event.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{event.event_type.replace('_', ' ')}</div>
                            <div className="text-sm text-muted-foreground">
                              {event.description}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {event.enhanced_user_profiles ? (
                            <div>
                              <div className="font-medium">
                                {event.enhanced_user_profiles.first_name} {event.enhanced_user_profiles.last_name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {event.enhanced_user_profiles.email}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">System</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {getSeverityBadge(event.severity)}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(event.created_at).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(event.created_at).toLocaleTimeString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          {event.resolved ? (
                            <Badge variant="default" className="bg-green-500">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Resolved
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <XCircle className="w-3 h-3 mr-1" />
                              Open
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {!eventsLoading && events.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No security events found.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}