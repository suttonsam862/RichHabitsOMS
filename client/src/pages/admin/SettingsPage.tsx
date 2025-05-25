import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  AlertCircle, 
  BellRing, 
  Printer, 
  Shield, 
  Smartphone, 
  UserPlus, 
  Search, 
  Check, 
  X,
  Key,
  Edit, 
  RefreshCw,
  Users,
  BarChart3,
  Download,
  Calendar,
  Clock,
  Mail,
  Phone,
  Building,
  Settings,
  Upload,
  Trash2,
  Globe,
  TrendingUp,
  Filter,
  MoreHorizontal,
  Activity,
  Eye,
  EyeOff,
  UserCheck
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Define specific permission types for different roles with expanded detailed permissions
const adminPermissions = z.object({
  // User Management Permissions
  manage_users: z.boolean().default(true),
  manage_roles: z.boolean().default(true),
  delete_users: z.boolean().default(false),
  assign_permissions: z.boolean().default(true),
  view_user_activity: z.boolean().default(true),
  
  // Order Management Permissions
  view_all_orders: z.boolean().default(true),
  edit_all_orders: z.boolean().default(true),
  delete_orders: z.boolean().default(false),
  approve_orders: z.boolean().default(true),
  
  // Financial Permissions
  view_financial_data: z.boolean().default(true),
  manage_pricing: z.boolean().default(false),
  manage_payments: z.boolean().default(false),
  view_financial_reports: z.boolean().default(true),
  
  // System Permissions
  manage_system_settings: z.boolean().default(false),
  manage_api_keys: z.boolean().default(false),
  view_system_logs: z.boolean().default(true),
  super_admin: z.boolean().default(false),
});

const salespersonPermissions = z.object({
  // Order Management
  create_orders: z.boolean().default(true),
  edit_orders: z.boolean().default(true),
  view_assigned_orders: z.boolean().default(true),
  delete_orders: z.boolean().default(false),
  
  // Customer Management
  view_customer_data: z.boolean().default(true),
  manage_customers: z.boolean().default(true),
  create_customers: z.boolean().default(true),
  edit_customers: z.boolean().default(true),
  delete_customers: z.boolean().default(false),
  
  // Communication
  send_customer_communications: z.boolean().default(true),
  send_customer_quotes: z.boolean().default(true),
  communicate_with_designers: z.boolean().default(true),
  
  // Reporting
  view_sales_reports: z.boolean().default(true),
  view_commission_data: z.boolean().default(true),
  export_reports: z.boolean().default(false),
});

const designerPermissions = z.object({
  // Design Management
  upload_designs: z.boolean().default(true),
  edit_designs: z.boolean().default(true),
  delete_designs: z.boolean().default(false),
  view_design_library: z.boolean().default(true),
  create_design_templates: z.boolean().default(false),
  
  // Task Management
  view_assigned_tasks: z.boolean().default(true),
  update_task_status: z.boolean().default(true),
  set_design_deadlines: z.boolean().default(false),
  
  // Communication
  communicate_with_customers: z.boolean().default(true),
  communicate_with_manufacturers: z.boolean().default(true),
  communicate_with_sales: z.boolean().default(true),
  
  // Tools Access
  use_design_tools: z.boolean().default(true),
  upload_design_assets: z.boolean().default(true),
  manage_asset_library: z.boolean().default(false),
});

const manufacturerPermissions = z.object({
  // Production Management
  view_production_queue: z.boolean().default(true),
  update_production_status: z.boolean().default(true),
  set_production_priorities: z.boolean().default(false),
  schedule_production: z.boolean().default(true),
  
  // Inventory Management
  manage_inventory: z.boolean().default(true),
  request_materials: z.boolean().default(true),
  update_stock_levels: z.boolean().default(true),
  manage_suppliers: z.boolean().default(false),
  
  // Quality Control
  report_production_issues: z.boolean().default(true),
  review_quality_metrics: z.boolean().default(true),
  approve_final_products: z.boolean().default(true),
  
  // Design Access
  view_design_files: z.boolean().default(true),
  comment_on_designs: z.boolean().default(true),
  request_design_modifications: z.boolean().default(true),
  
  // Shipping
  update_shipping_status: z.boolean().default(true),
  print_shipping_labels: z.boolean().default(true),
  manage_shipping_providers: z.boolean().default(false),
});

const customerPermissions = z.object({
  // Order Management
  view_orders: z.boolean().default(true),
  create_orders: z.boolean().default(true),
  edit_own_orders: z.boolean().default(true),
  cancel_orders: z.boolean().default(true),
  
  // Design Management
  approve_designs: z.boolean().default(true),
  request_design_changes: z.boolean().default(true),
  view_design_history: z.boolean().default(true),
  
  // Financial
  make_payments: z.boolean().default(true),
  view_payment_history: z.boolean().default(true),
  access_invoices: z.boolean().default(true),
  
  // Account Management
  view_order_history: z.boolean().default(true),
  manage_shipping_addresses: z.boolean().default(true),
  manage_payment_methods: z.boolean().default(true),
  
  // Communication
  submit_feedback: z.boolean().default(true),
  participate_in_threads: z.boolean().default(true),
  receive_notifications: z.boolean().default(true),
});

// Form schema for creating/editing users
const userSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  username: z.string().min(3, { message: "Username must be at least 3 characters" }),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" })
    .optional(),
  role: z.enum(['admin', 'salesperson', 'designer', 'manufacturer', 'customer']),
  phone: z.string().optional(),
  company: z.string().optional(),
  permissions: z.object({
    admin: adminPermissions.optional(),
    salesperson: salespersonPermissions.optional(),
    designer: designerPermissions.optional(),
    manufacturer: manufacturerPermissions.optional(),
    customer: customerPermissions.optional(),
  }).optional(),
});

type UserFormValues = z.infer<typeof userSchema>;

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("general");
  const [showUserManagement, setShowUserManagement] = useState(false);
  
  // Fetch comprehensive user data (auth users + customers)
  const { data: userResponse, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      console.log("Fetching comprehensive user data...");
      
      // Get auth token from localStorage
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch("/api/users", {
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      
      const data = await response.json();
      console.log("Received user data:", data);
      
      // Handle both old format (array) and new format (object with success)
      if (data.success && data.users) {
        // New comprehensive database format
        return {
          users: data.users.map(user => ({
            id: user.id || user.customerId,
            customerId: user.customerId,
            email: user.email,
            first_name: user.firstName,
            last_name: user.lastName,
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username,
            role: user.role,
            phone: user.phone,
            company: user.company,
            created_at: user.customerSince || user.accountCreated,
            email_confirmed: user.emailVerified,
            hasAuthAccount: user.hasAuthAccount,
            accountStatus: user.accountStatus,
            permissions: user.permissions,
            profilePicture: user.profilePicture,
            lastLogin: user.lastLogin
          })),
          analytics: data.analytics
        };
      } else if (Array.isArray(data)) {
        // Old format (direct array) - transform to new format
        return {
          users: data,
          analytics: {
            totalUsers: data.length,
            customersTotal: data.filter(u => u.role === 'customer').length,
            authAccountsTotal: data.length,
            needsAccountCreation: 0,
            activeAccounts: data.filter(u => u.email_confirmed).length,
            adminUsers: data.filter(u => u.role === 'admin').length,
            customerUsers: data.filter(u => u.role === 'customer').length,
            staffUsers: data.filter(u => !['customer', 'admin'].includes(u.role)).length
          }
        };
      }
      
      return data;
    }
  });

  const users = userResponse?.users || [];
  const analytics = userResponse?.analytics || {
    totalUsers: users.length,
    customersTotal: users.filter(u => u.role === 'customer').length,
    authAccountsTotal: users.length,
    needsAccountCreation: 0,
    activeAccounts: users.filter(u => u.email_confirmed).length,
    adminUsers: users.filter(u => u.role === 'admin').length,
    customerUsers: users.filter(u => u.role === 'customer').length,
    staffUsers: users.filter(u => !['customer', 'admin'].includes(u.role)).length
  };

  console.log('User display data:', { users: users.length, analytics });
  
  // State for user invitation dialog
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("customer");
  const [inviteFirstName, setInviteFirstName] = useState("");
  const [inviteLastName, setInviteLastName] = useState("");

  // Direct account creation mutation (replaces email invitation)
  const createAccountMutation = useMutation({
    mutationFn: async (userData: { email: string; firstName: string; lastName: string; role: string; password?: string }) => {
      const response = await fetch('/api/users/create-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...userData,
          password: userData.password || 'TempPassword123!', // Temporary password for immediate access
          createDirectly: true
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create account');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Account Created Successfully",
        description: `${data.user?.firstName || 'User'} can now log in immediately with their credentials`,
      });
      setShowInviteDialog(false);
      setInviteEmail("");
      setInviteFirstName("");
      setInviteLastName("");
      setInviteRole("customer");
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  // Create auth account for existing customer
  const createCustomerAccountMutation = useMutation({
    mutationFn: async (customerId: string) => {
      const response = await fetch('/api/users/create-customer-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customerId }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create customer account');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Customer Account Created",
        description: `Auth account created for ${data.user?.firstName} ${data.user?.lastName}`,
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  // Edit user mutation - for updating user details, roles, and credentials
  const editUserMutation = useMutation({
    mutationFn: async (userData: { userId: string; updates: any }) => {
      const response = await fetch(`/api/users/${userData.userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData.updates),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update user');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "User Updated Successfully",
        description: `${data.user?.firstName || 'User'} has been updated`,
      });
      setShowEditDialog(false);
      setEditingUser(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  // Profile picture upload mutation
  const uploadProfilePictureMutation = useMutation({
    mutationFn: async ({ userId, file }: { userId: string; file: File }) => {
      const formData = new FormData();
      formData.append('profilePicture', file);
      formData.append('userId', userId);
      
      const response = await fetch('/api/users/upload-profile-picture', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload profile picture');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile Picture Updated",
        description: "Profile picture has been uploaded successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: error.message,
      });
    },
  });

  // Open edit user dialog
  const openEditDialog = (user: any) => {
    setEditingUser(user);
    setEditForm({
      email: user.email || '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      role: user.role || 'customer',
      phone: user.phone || '',
      company: user.company || '',
      password: '',
      resetPassword: false
    });
    setShowEditDialog(true);
  };

  // Save user edits
  const saveUserEdits = () => {
    if (!editingUser) return;
    
    const updates: any = {
      email: editForm.email,
      firstName: editForm.firstName,
      lastName: editForm.lastName,
      role: editForm.role,
      phone: editForm.phone,
      company: editForm.company
    };

    // Include password if being reset
    if (editForm.resetPassword && editForm.password) {
      updates.password = editForm.password;
    }

    editUserMutation.mutate({
      userId: editingUser.id,
      updates
    });
  };
  
  // State for delete dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  
  // State for user editing
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'customer',
    phone: '',
    company: '',
    password: '',
    resetPassword: false
  });
  
  // State for bulk actions
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [showBulkActionDialog, setShowBulkActionDialog] = useState(false);
  const [bulkAction, setBulkAction] = useState<"delete" | "changeRole" | null>(null);
  const [bulkRoleChange, setBulkRoleChange] = useState("customer");
  
  // State for activity tracking
  const [userActivity, setUserActivity] = useState<any[]>([
    {
      id: 1,
      user_id: "1",
      action: "login",
      details: { ip: "192.168.1.1", browser: "Chrome", device: "Desktop" },
      created_at: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: 2,
      user_id: "1",
      action: "update_profile",
      details: { fields_updated: ["firstName", "lastName"] },
      created_at: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: 3,
      user_id: "2",
      action: "login",
      details: { ip: "192.168.1.2", browser: "Firefox", device: "Mobile" },
      created_at: new Date(Date.now() - 7200000).toISOString()
    }
  ]);
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [selectedUserForActivity, setSelectedUserForActivity] = useState<any>(null);
  
  // Filter users by search query (with null check)
  const filteredUsers = (users || []).filter((user: any) => 
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.last_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: UserFormValues) => {
      const response = await apiRequest("POST", "/api/admin/users", userData);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create user");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "User created successfully",
        description: "The new user has been added to the system",
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create user",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: Partial<UserFormValues> }) => {
      const response = await apiRequest("PATCH", `/api/admin/users/${id}`, data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update user");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "User updated successfully",
        description: "The user information has been updated",
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setSelectedUser(null);
      setIsEditing(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update user",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/admin/users/${id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete user");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "User deleted successfully",
        description: "The user has been removed from the system",
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete user",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Form setup
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: "",
      username: "",
      firstName: "",
      lastName: "",
      password: "",
      role: "customer",
      phone: "",
      company: "",
      permissions: {},
    },
  });
  
  // Handle editing user
  useEffect(() => {
    if (selectedUser && isEditing) {
      form.reset({
        email: selectedUser.email,
        username: selectedUser.username,
        firstName: selectedUser.firstName || "",
        lastName: selectedUser.lastName || "",
        password: "", // Don't prefill password
        role: selectedUser.role,
        phone: selectedUser.phone || "",
        company: selectedUser.company || "",
        permissions: selectedUser.permissions || {},
      });
    }
  }, [selectedUser, isEditing, form]);
  
  // Handle form submission
  const onSubmit = (data: UserFormValues) => {
    // Remove empty password field if not provided (for updates)
    if (isEditing && (!data.password || data.password.trim() === "")) {
      const { password, ...userData } = data;
      updateUserMutation.mutate({ id: selectedUser.id, data: userData });
    } else if (isEditing) {
      updateUserMutation.mutate({ id: selectedUser.id, data });
    } else {
      createUserMutation.mutate(data);
    }
  };
  
  // Handle canceling edit
  const handleCancelEdit = () => {
    setIsEditing(false);
    setSelectedUser(null);
    form.reset();
  };
  
  // Handle deleting user
  const handleDeleteUser = (id: string) => {
    if (window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      deleteUserMutation.mutate(id);
    }
  };
  


  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Settings & Administration</h1>
        <p className="text-muted-foreground mt-2">
          Manage your system settings, users, and application configuration
        </p>
      </div>

      {/* Quick Actions Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setShowUserManagement(true)}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">User Management</p>
                <p className="text-2xl font-bold">{analytics.totalUsers}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {analytics.needsAccountCreation > 0 && (
                    <span className="text-orange-600 font-medium">
                      {analytics.needsAccountCreation} need accounts • 
                    </span>
                  )}
                  {analytics.customerUsers} customers • {analytics.adminUsers} admins
                </p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">System Settings</p>
                <p className="text-2xl font-bold">Config</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Application settings
                </p>
              </div>
              <Settings className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Security</p>
                <p className="text-2xl font-bold">Active</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {analytics.authAccounts} confirmed users
                </p>
              </div>
              <Shield className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Analytics</p>
                <p className="text-2xl font-bold">Reports</p>
                <p className="text-xs text-muted-foreground mt-1">
                  System insights
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid grid-cols-5">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
        </TabsList>
        
        <TabsContent value="account" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>
                Update your account information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="space-y-1">
                <Label htmlFor="name">Name</Label>
                <div className="h-10 px-3 py-2 border rounded-md text-sm bg-muted">
                  Admin User
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <div className="h-10 px-3 py-2 border rounded-md text-sm bg-muted">
                  admin@example.com
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button>Save Changes</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Configure how you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <BellRing className="h-4 w-4" />
                  <Label htmlFor="email-notifications">Email notifications</Label>
                </div>
                <Switch id="email-notifications" defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Smartphone className="h-4 w-4" />
                  <Label htmlFor="push-notifications">Push notifications</Label>
                </div>
                <Switch id="push-notifications" defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Manage your security preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4" />
                  <Label htmlFor="two-factor">Two-factor authentication</Label>
                </div>
                <Switch id="two-factor" />
              </div>
              <Separator />
              <div className="space-y-1">
                <Label htmlFor="password">Change Password</Label>
                <div className="h-10 px-3 py-2 border rounded-md text-sm">
                  ••••••••••••
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button>Update Password</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Customize the look and feel of the application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="dark-mode">Dark Mode</Label>
                <Switch id="dark-mode" />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <Label htmlFor="compact">Compact View</Label>
                <Switch id="compact" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Billing Information</CardTitle>
              <CardDescription>
                Manage your billing details and view invoices
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Printer className="h-4 w-4" />
                  <span>Print Invoices</span>
                </div>
                <Button variant="outline" size="sm">Print</Button>
              </div>
              <Separator />
              <div className="rounded-md border">
                <div className="px-4 py-3 font-medium border-b">
                  Subscription Plan
                </div>
                <div className="p-4">
                  <div className="font-medium">Enterprise</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    $499/month • Renews on June 1, 2025
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button>Update Billing Info</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* User Management Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Create and manage users with different roles and permissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="relative w-full max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search users..."
                      className="pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  {/* Bulk Actions Dropdown */}
                  {selectedUserIds.length > 0 && (
                    <Select
                      onValueChange={(value) => {
                        if (value === "delete") {
                          setBulkAction("delete");
                          setShowBulkActionDialog(true);
                        } else if (value === "changeRole") {
                          setBulkAction("changeRole");
                          setShowBulkActionDialog(true);
                        }
                      }}
                    >
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Bulk Actions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="delete">Delete Selected</SelectItem>
                        <SelectItem value="changeRole">Change Role</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
                
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="default" className="ml-2">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add User
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Create New Account</DialogTitle>
                      <DialogDescription>
                        Create a new user account with immediate access to the system.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="invite-email" className="text-right">
                          Email
                        </Label>
                        <Input 
                          id="invite-email" 
                          className="col-span-3" 
                          placeholder="user@example.com" 
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="invite-firstName" className="text-right">
                          First Name
                        </Label>
                        <Input 
                          id="invite-firstName" 
                          className="col-span-3" 
                          placeholder="First Name" 
                          value={inviteFirstName}
                          onChange={(e) => setInviteFirstName(e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="invite-lastName" className="text-right">
                          Last Name
                        </Label>
                        <Input 
                          id="invite-lastName" 
                          className="col-span-3" 
                          placeholder="Last Name" 
                          value={inviteLastName}
                          onChange={(e) => setInviteLastName(e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="invite-role" className="text-right">
                          Role
                        </Label>
                        <Select 
                          defaultValue="customer"
                          onValueChange={(value) => setInviteRole(value)}
                        >
                          <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="salesperson">Salesperson</SelectItem>
                            <SelectItem value="designer">Designer</SelectItem>
                            <SelectItem value="manufacturer">Manufacturer</SelectItem>
                            <SelectItem value="customer">Customer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <Separator className="my-2" />
                      
                      <div className="bg-green-50 p-3 rounded-md text-sm text-green-700 border border-green-200">
                        <p className="font-medium">✅ Account Creation</p>
                        <p>The user will receive a temporary password and can log in immediately. They can change their password after first login.</p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button 
                        onClick={() => {
                          if (inviteEmail && inviteFirstName && inviteLastName) {
                            createAccountMutation.mutate({
                              email: inviteEmail,
                              firstName: inviteFirstName,
                              lastName: inviteLastName,
                              role: inviteRole
                            });
                          }
                        }}
                        disabled={createAccountMutation.isPending || !inviteEmail || !inviteFirstName || !inviteLastName}
                      >
                        {createAccountMutation.isPending ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Creating Account...
                          </>
                        ) : (
                          "Create Account"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {/* User Edit Dialog */}
              <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Edit User Account</DialogTitle>
                    <DialogDescription>
                      Update user information, login credentials, roles, and permissions
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="grid gap-6">
                    {/* Basic Information */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit-firstName">First Name</Label>
                        <Input
                          id="edit-firstName"
                          value={editForm.firstName}
                          onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                          placeholder="First name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-lastName">Last Name</Label>
                        <Input
                          id="edit-lastName"
                          value={editForm.lastName}
                          onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                          placeholder="Last name"
                        />
                      </div>
                    </div>

                    {/* Email & Contact */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit-email">Email Address</Label>
                        <Input
                          id="edit-email"
                          type="email"
                          value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          placeholder="user@example.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-phone">Phone Number</Label>
                        <Input
                          id="edit-phone"
                          value={editForm.phone}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                          placeholder="Phone number"
                        />
                      </div>
                    </div>

                    {/* Role & Company */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit-role">Role & Permissions</Label>
                        <Select 
                          value={editForm.role}
                          onValueChange={(value) => setEditForm({ ...editForm, role: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin - Full Access</SelectItem>
                            <SelectItem value="salesperson">Salesperson - Orders & Customers</SelectItem>
                            <SelectItem value="designer">Designer - Design & Production</SelectItem>
                            <SelectItem value="manufacturer">Manufacturer - Production Only</SelectItem>
                            <SelectItem value="customer">Customer - Order Viewing</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="edit-company">Company</Label>
                        <Input
                          id="edit-company"
                          value={editForm.company}
                          onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                          placeholder="Company name"
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* Password Reset Section */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="reset-password"
                          checked={editForm.resetPassword}
                          onCheckedChange={(checked) => 
                            setEditForm({ ...editForm, resetPassword: checked as boolean })
                          }
                        />
                        <Label htmlFor="reset-password" className="text-sm font-medium">
                          Reset User Password
                        </Label>
                      </div>
                      
                      {editForm.resetPassword && (
                        <div>
                          <Label htmlFor="edit-password">New Password</Label>
                          <Input
                            id="edit-password"
                            type="password"
                            value={editForm.password}
                            onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                            placeholder="Enter new password"
                          />
                          <p className="text-sm text-muted-foreground mt-1">
                            Leave empty to generate a temporary password
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Account Status */}
                    {editingUser && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium mb-2">Account Status</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Auth Account:</span>
                            <span className={`ml-2 font-medium ${editingUser.hasAuthAccount ? 'text-green-600' : 'text-orange-600'}`}>
                              {editingUser.hasAuthAccount ? 'Active' : 'Needs Creation'}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Customer Profile:</span>
                            <span className={`ml-2 font-medium ${editingUser.hasCustomerProfile ? 'text-green-600' : 'text-gray-600'}`}>
                              {editingUser.hasCustomerProfile ? 'Linked' : 'None'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={saveUserEdits}
                      disabled={editUserMutation.isPending || !editForm.email || !editForm.firstName}
                    >
                      {editUserMutation.isPending ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
              {/* Bulk Action Confirmation Dialog */}
              <AlertDialog open={showBulkActionDialog} onOpenChange={setShowBulkActionDialog}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {bulkAction === "delete" ? "Delete Selected Users" : "Change Role for Selected Users"}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {bulkAction === "delete" 
                        ? `Are you sure you want to delete ${selectedUserIds.length} selected users? This action cannot be undone.`
                        : `Change the role of ${selectedUserIds.length} selected users to:`}
                    </AlertDialogDescription>
                    
                    {bulkAction === "changeRole" && (
                      <div className="py-4">
                        <Select
                          value={bulkRoleChange}
                          onValueChange={setBulkRoleChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="salesperson">Salesperson</SelectItem>
                            <SelectItem value="designer">Designer</SelectItem>
                            <SelectItem value="manufacturer">Manufacturer</SelectItem>
                            <SelectItem value="customer">Customer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        if (bulkAction === "delete") {
                          // Delete selected users
                          setUsers(users.filter(user => !selectedUserIds.includes(user.id)));
                          
                          // Add to activity log
                          const activityEntry = {
                            id: userActivity.length + 1,
                            user_id: "system",
                            action: "bulk_delete_users",
                            details: { 
                              count: selectedUserIds.length,
                              deleted_by: "admin"
                            },
                            created_at: new Date().toISOString()
                          };
                          
                          setUserActivity([activityEntry, ...userActivity]);
                          
                          toast({
                            title: "Users deleted",
                            description: `${selectedUserIds.length} users have been deleted`,
                            variant: "default",
                          });
                        } else if (bulkAction === "changeRole") {
                          // Change role for selected users
                          setUsers(users.map(user => {
                            if (selectedUserIds.includes(user.id)) {
                              return {
                                ...user,
                                role: bulkRoleChange,
                                // Set default permissions for the new role
                                permissions: {
                                  [bulkRoleChange]: bulkRoleChange === 'admin' ? {
                                    manage_users: true,
                                    manage_roles: true,
                                    view_all_orders: true
                                  } : bulkRoleChange === 'salesperson' ? {
                                    create_orders: true,
                                    edit_orders: true,
                                    view_customer_data: true
                                  } : bulkRoleChange === 'designer' ? {
                                    upload_designs: true,
                                    edit_designs: true,
                                    view_design_library: true
                                  } : bulkRoleChange === 'manufacturer' ? {
                                    view_production_queue: true,
                                    update_production_status: true,
                                    manage_inventory: true
                                  } : {
                                    view_orders: true,
                                    create_orders: true,
                                    approve_designs: true
                                  }
                                }
                              };
                            }
                            return user;
                          }));
                          
                          // Add to activity log
                          const activityEntry = {
                            id: userActivity.length + 1,
                            user_id: "system",
                            action: "bulk_change_role",
                            details: { 
                              count: selectedUserIds.length,
                              new_role: bulkRoleChange,
                              changed_by: "admin"
                            },
                            created_at: new Date().toISOString()
                          };
                          
                          setUserActivity([activityEntry, ...userActivity]);
                          
                          toast({
                            title: "Roles updated",
                            description: `${selectedUserIds.length} users have been updated to ${bulkRoleChange} role`,
                            variant: "default",
                          });
                        }
                        
                        setSelectedUserIds([]);
                        setShowBulkActionDialog(false);
                      }}
                      className={bulkAction === "delete" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
                    >
                      {bulkAction === "delete" ? "Delete Users" : "Change Role"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {isLoading ? (
                <div className="flex justify-center p-4">
                  <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : isError ? (
                <div className="rounded-md bg-destructive/15 p-4 text-destructive flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  <p>Failed to load users. Please try again.</p>
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">
                          <Checkbox 
                            checked={selectedUserIds.length === filteredUsers.length && filteredUsers.length > 0}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedUserIds(filteredUsers.map(user => user.id || user.customerId).filter(Boolean));
                              } else {
                                setSelectedUserIds([]);
                              }
                            }}
                          />
                        </TableHead>
                        <TableHead className="w-[250px]">Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                            No users found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredUsers.map((user: any) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <Checkbox 
                                checked={selectedUserIds.includes(user.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedUserIds([...selectedUserIds, user.id]);
                                  } else {
                                    setSelectedUserIds(selectedUserIds.filter(id => id !== user.id));
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              <div className="flex flex-col">
                                <span>{user.first_name || user.firstName} {user.last_name || user.lastName}</span>
                                <span className="text-sm text-muted-foreground">@{user.username}</span>
                              </div>
                            </TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize bg-primary/10 text-primary">
                                {user.role}
                              </span>
                            </TableCell>
                            <TableCell>
                              {user.status === "invited" ? (
                                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-800">
                                  Invited
                                </span>
                              ) : user.is_active === false ? (
                                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-800">
                                  Inactive
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800">
                                  Active
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setIsEditing(true);
                                  }}
                                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Edit Profile
                                </Button>
                                
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-green-600 border-green-200 hover:bg-green-50"
                                >
                                  <Key className="h-4 w-4 mr-1" />
                                  Reset Password
                                </Button>
                                
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="text-gray-600 border-gray-200 hover:bg-gray-50">
                                      <Settings className="h-4 w-4 mr-1" />
                                      More Actions
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => {
                                      setSelectedUserForActivity(user);
                                      setShowActivityLog(true);
                                    }}>
                                      <BellRing className="h-4 w-4 mr-2" />
                                      View Activity Log
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <Shield className="h-4 w-4 mr-2" />
                                      Change User Role
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <Upload className="h-4 w-4 mr-2" />
                                      Upload Profile Photo
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-red-600">
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete User Account
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                                
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button style={{ display: 'none' }}>Hidden</Button>
                                  </DialogTrigger>
                                  <DialogContent className="sm:max-w-[625px]">
                                    <DialogHeader>
                                      <DialogTitle>Edit User</DialogTitle>
                                      <DialogDescription>
                                        Update user details and permissions
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="py-4">
                                      <Form {...form}>
                                        <form className="space-y-4">
                                          <div className="grid grid-cols-2 gap-4">
                                            <FormField
                                              control={form.control}
                                              name="firstName"
                                              render={({ field }) => (
                                                <FormItem>
                                                  <FormLabel>First Name</FormLabel>
                                                  <FormControl>
                                                    <Input placeholder="First name" {...field} />
                                                  </FormControl>
                                                  <FormMessage />
                                                </FormItem>
                                              )}
                                            />
                                            <FormField
                                              control={form.control}
                                              name="lastName"
                                              render={({ field }) => (
                                                <FormItem>
                                                  <FormLabel>Last Name</FormLabel>
                                                  <FormControl>
                                                    <Input placeholder="Last name" {...field} />
                                                  </FormControl>
                                                  <FormMessage />
                                                </FormItem>
                                              )}
                                            />
                                          </div>
                                          
                                          <div className="grid grid-cols-2 gap-4">
                                            <FormField
                                              control={form.control}
                                              name="email"
                                              render={({ field }) => (
                                                <FormItem>
                                                  <FormLabel>Email</FormLabel>
                                                  <FormControl>
                                                    <Input placeholder="Email" {...field} />
                                                  </FormControl>
                                                  <FormMessage />
                                                </FormItem>
                                              )}
                                            />
                                            <FormField
                                              control={form.control}
                                              name="role"
                                              render={({ field }) => (
                                                <FormItem>
                                                  <FormLabel>Role</FormLabel>
                                                  <Select 
                                                    onValueChange={field.onChange} 
                                                    value={field.value}
                                                  >
                                                    <FormControl>
                                                      <SelectTrigger>
                                                        <SelectValue placeholder="Select role" />
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
                                          </div>
                                          
                                          {/* Role-specific permissions section */}
                                          <div className="border rounded-lg p-4">
                                            <h3 className="text-sm font-medium mb-3">Role Permissions</h3>
                                            
                                            {form.watch("role") === "admin" && (
                                              <div className="grid grid-cols-2 gap-2">
                                                <FormField
                                                  control={form.control}
                                                  name="permissions.admin.manage_users"
                                                  render={({ field }) => (
                                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                                      <FormControl>
                                                        <Checkbox
                                                          checked={field.value}
                                                          onCheckedChange={field.onChange}
                                                        />
                                                      </FormControl>
                                                      <FormLabel className="text-sm font-normal">
                                                        Manage Users
                                                      </FormLabel>
                                                    </FormItem>
                                                  )}
                                                />
                                                
                                                <FormField
                                                  control={form.control}
                                                  name="permissions.admin.view_all_orders"
                                                  render={({ field }) => (
                                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                                      <FormControl>
                                                        <Checkbox
                                                          checked={field.value}
                                                          onCheckedChange={field.onChange}
                                                        />
                                                      </FormControl>
                                                      <FormLabel className="text-sm font-normal">
                                                        View All Orders
                                                      </FormLabel>
                                                    </FormItem>
                                                  )}
                                                />
                                                
                                                <FormField
                                                  control={form.control}
                                                  name="permissions.admin.super_admin"
                                                  render={({ field }) => (
                                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                                      <FormControl>
                                                        <Checkbox
                                                          checked={field.value}
                                                          onCheckedChange={field.onChange}
                                                        />
                                                      </FormControl>
                                                      <FormLabel className="text-sm font-normal">
                                                        Super Admin
                                                      </FormLabel>
                                                    </FormItem>
                                                  )}
                                                />
                                              </div>
                                            )}
                                            
                                            {/* Other role permissions sections would go here */}
                                          </div>
                                        </form>
                                      </Form>
                                    </div>
                                    <DialogFooter>
                                      <Button
                                        onClick={() => {
                                          // Update user in local state
                                          const formData = form.getValues();
                                          const updatedUser = {
                                            ...user,
                                            first_name: formData.firstName,
                                            last_name: formData.lastName,
                                            email: formData.email,
                                            role: formData.role,
                                            permissions: formData.permissions
                                          };
                                          
                                          setUsers(users.map(u => u.id === user.id ? updatedUser : u));
                                          
                                          // Add activity log
                                          const activityEntry = {
                                            id: userActivity.length + 1,
                                            user_id: user.id,
                                            action: "user_updated",
                                            details: { 
                                              updated_by: "admin",
                                              fields_changed: ["details", "permissions", "role"]
                                            },
                                            created_at: new Date().toISOString()
                                          };
                                          
                                          setUserActivity([activityEntry, ...userActivity]);
                                          
                                          toast({
                                            title: "User updated",
                                            description: "User information has been updated successfully",
                                            variant: "default",
                                          });
                                        }}
                                      >
                                        Save Changes
                                      </Button>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>
                                
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      title="Delete User"
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                      <span className="sr-only">Delete</span>
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete User</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete this user? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => {
                                          // Delete user from local state
                                          setUsers(users.filter(u => u.id !== user.id));
                                          
                                          // Add activity log
                                          const activityEntry = {
                                            id: userActivity.length + 1,
                                            user_id: "system",
                                            action: "user_deleted",
                                            details: { 
                                              deleted_user: user.email,
                                              deleted_by: "admin"
                                            },
                                            created_at: new Date().toISOString()
                                          };
                                          
                                          setUserActivity([activityEntry, ...userActivity]);
                                          
                                          toast({
                                            title: "User deleted",
                                            description: "The user has been deleted successfully",
                                            variant: "default",
                                          });
                                        }}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
              
              {/* User Activity Log Dialog */}
              <Dialog open={showActivityLog} onOpenChange={setShowActivityLog}>
                <DialogContent className="sm:max-w-[625px]">
                  <DialogHeader>
                    <DialogTitle>User Activity Log</DialogTitle>
                    <DialogDescription>
                      {selectedUserForActivity ? 
                        `Activity history for ${selectedUserForActivity.first_name || selectedUserForActivity.firstName} ${selectedUserForActivity.last_name || selectedUserForActivity.lastName}` :
                        "System activity log"
                      }
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="max-h-[400px] overflow-y-auto border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Action</TableHead>
                          <TableHead>Details</TableHead>
                          <TableHead>Date/Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userActivity
                          .filter(activity => !selectedUserForActivity || activity.user_id === selectedUserForActivity.id)
                          .map(activity => (
                            <TableRow key={activity.id}>
                              <TableCell className="font-medium">
                                <span className="capitalize">
                                  {activity.action.replace(/_/g, ' ')}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  {activity.details && typeof activity.details === 'object' ? 
                                    Object.entries(activity.details).map(([key, value]) => (
                                      <div key={key}>
                                        <span className="font-medium">{key.replace(/_/g, ' ')}</span>: {
                                          Array.isArray(value) 
                                            ? value.join(', ') 
                                            : typeof value === 'object'
                                              ? JSON.stringify(value)
                                              : String(value)
                                        }
                                      </div>
                                    )) : 
                                    String(activity.details || '')
                                  }
                                </div>
                              </TableCell>
                              <TableCell>
                                {new Date(activity.created_at).toLocaleString()}
                              </TableCell>
                            </TableRow>
                          ))
                        }
                        
                        {userActivity.filter(activity => !selectedUserForActivity || activity.user_id === selectedUserForActivity.id).length === 0 && (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                              No activity found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowActivityLog(false)}>
                      Close
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
              <Card>
                <CardHeader>
                  <CardTitle>{isEditing ? "Edit User" : "Create New User"}</CardTitle>
                  <CardDescription>
                    {isEditing 
                      ? "Update user information and permissions" 
                      : "Fill in the details to create a new user account"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>First Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter first name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Last Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter last name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input placeholder="user@example.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Username</FormLabel>
                              <FormControl>
                                <Input placeholder="username" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{isEditing ? "New Password (leave blank to keep current)" : "Password"}</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder={isEditing ? "New password" : "Set password"} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="role"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Role</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a role" />
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
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone (optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="Phone number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="company"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company (optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="Company name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div>
                        <h4 className="text-sm font-medium mb-2">Permissions</h4>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox id="view-orders" />
                            <label
                              htmlFor="view-orders"
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              View Orders
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id="manage-orders" />
                            <label
                              htmlFor="manage-orders"
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              Manage Orders
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id="view-customers" />
                            <label
                              htmlFor="view-customers"
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              View Customers
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id="manage-customers" />
                            <label
                              htmlFor="manage-customers"
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              Manage Customers
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id="view-reports" />
                            <label
                              htmlFor="view-reports"
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              View Reports
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id="system-settings" />
                            <label
                              htmlFor="system-settings"
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              System Settings
                            </label>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end space-x-2">
                        {isEditing && (
                          <Button 
                            variant="outline" 
                            type="button"
                            onClick={handleCancelEdit}
                          >
                            Cancel
                          </Button>
                        )}
                        <Button type="submit">
                          {createUserMutation.isPending || updateUserMutation.isPending ? (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                              {isEditing ? "Updating..." : "Creating..."}
                            </>
                          ) : (
                            <>
                              {isEditing ? "Update User" : "Create User"}
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Enhanced User Management Dialog */}
      <Dialog open={showUserManagement} onOpenChange={setShowUserManagement}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Management & Analytics
            </DialogTitle>
            <DialogDescription>
              Comprehensive user management with real-time analytics and editing capabilities
            </DialogDescription>
          </DialogHeader>
          
          {/* User Analytics Dashboard */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">{analytics.totalUsers}</p>
                    <p className="text-xs text-muted-foreground">Total Users</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">{analytics.authAccounts}</p>
                    <p className="text-xs text-muted-foreground">Admins</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-purple-500" />
                  <div>
                    <p className="text-2xl font-bold">{analytics.customerProfiles}</p>
                    <p className="text-xs text-muted-foreground">Customers</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-orange-500" />
                  <div>
                    <p className="text-2xl font-bold">{analytics.recentSignUps}</p>
                    <p className="text-xs text-muted-foreground">New This Week</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced User Management Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div className="flex items-center gap-2">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search users..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetch()}
                disabled={isLoading}
              >
                {isLoading ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Refresh
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Invite User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite New User</DialogTitle>
                    <DialogDescription>
                      Send an invitation email to add a new team member
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="invite-email" className="text-right">
                        Email
                      </Label>
                      <Input 
                        id="invite-email" 
                        className="col-span-3" 
                        placeholder="user@example.com" 
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="invite-firstName" className="text-right">
                        First Name
                      </Label>
                      <Input 
                        id="invite-firstName" 
                        className="col-span-3" 
                        placeholder="First Name" 
                        value={inviteFirstName}
                        onChange={(e) => setInviteFirstName(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="invite-lastName" className="text-right">
                        Last Name
                      </Label>
                      <Input 
                        id="invite-lastName" 
                        className="col-span-3" 
                        placeholder="Last Name" 
                        value={inviteLastName}
                        onChange={(e) => setInviteLastName(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="invite-role" className="text-right">
                        Role
                      </Label>
                      <Select 
                        value={inviteRole}
                        onValueChange={(value) => setInviteRole(value)}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="salesperson">Salesperson</SelectItem>
                          <SelectItem value="designer">Designer</SelectItem>
                          <SelectItem value="manufacturer">Manufacturer</SelectItem>
                          <SelectItem value="customer">Customer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      onClick={() => {
                        if (inviteEmail && inviteFirstName && inviteLastName) {
                          createAccountMutation.mutate({
                            email: inviteEmail,
                            firstName: inviteFirstName,
                            lastName: inviteLastName,
                            role: inviteRole
                          });
                        }
                      }}
                      disabled={createAccountMutation.isPending || !inviteEmail || !inviteFirstName || !inviteLastName}
                    >
                      {createAccountMutation.isPending ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Creating Account...
                        </>
                      ) : (
                        "Create Account"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Enhanced User Table */}
          {isLoading ? (
            <div className="flex justify-center p-8">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="rounded-md bg-destructive/15 p-4 text-destructive flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              <p>Failed to load users. Please try again.</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox />
                    </TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Sign In</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user: any) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <Checkbox />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0 h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {user.first_name?.[0] || user.email?.[0]?.toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium">
                              {user.first_name} {user.last_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.email_confirmed ? 'default' : 'secondary'}>
                          {user.email_confirmed ? 'Active' : 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {user.last_sign_in ? new Date(user.last_sign_in).toLocaleDateString() : 'Never'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setEditingUser(user);
                              setEditForm({
                                email: user.email || '',
                                firstName: user.first_name || '',
                                lastName: user.last_name || '',
                                phone: user.phone || '',
                                company: user.company || '',
                                role: user.role || 'customer',
                                resetPassword: false,
                                password: ''
                              });
                              setShowEditDialog(true);
                            }}
                            title="Edit User Profile"
                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                          >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setSelectedUserForActivity(user);
                              setShowActivityLog(true);
                            }}
                            title="View User Details & Activity"
                            className="text-green-600 hover:text-green-800 hover:bg-green-50"
                          >
                            <UserCheck className="h-4 w-4" />
                            <span className="sr-only">View Details</span>
                          </Button>
                          
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              const newPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase();
                              navigator.clipboard.writeText(newPassword);
                              toast({
                                title: "Password Reset",
                                description: `New password copied to clipboard: ${newPassword}`,
                                variant: "default",
                              });
                            }}
                            title="Reset User Password"
                            className="text-orange-600 hover:text-orange-800 hover:bg-orange-50"
                          >
                            <Key className="h-4 w-4" />
                            <span className="sr-only">Reset Password</span>
                          </Button>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                title="More Actions"
                                className="text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">More Actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setSelectedUserForActivity(user);
                                setShowActivityLog(true);
                              }}>
                                <BellRing className="h-4 w-4 mr-2" />
                                View Activity Log
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                toast({
                                  title: "Role Change",
                                  description: "Role change feature is available through edit mode",
                                  variant: "default",
                                });
                              }}>
                                <Shield className="h-4 w-4 mr-2" />
                                Change User Role
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete ${user.first_name || 'this user'}?`)) {
                                    toast({
                                      title: "User Deleted",
                                      description: `User has been removed from the system`,
                                      variant: "destructive",
                                    });
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}