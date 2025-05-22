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
  AlertCircle, 
  BellRing, 
  Printer, 
  Shield, 
  Smartphone, 
  UserPlus, 
  Search, 
  Check, 
  X, 
  Edit, 
  Trash2, 
  RefreshCw 
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

// Define specific permission types for different roles
const adminPermissions = z.object({
  manage_users: z.boolean().default(true),
  manage_roles: z.boolean().default(true),
  view_all_orders: z.boolean().default(true),
  edit_all_orders: z.boolean().default(true),
  view_financial_data: z.boolean().default(true),
  manage_system_settings: z.boolean().default(false),
  super_admin: z.boolean().default(false),
});

const salespersonPermissions = z.object({
  create_orders: z.boolean().default(true),
  edit_orders: z.boolean().default(true),
  view_customer_data: z.boolean().default(true),
  manage_customers: z.boolean().default(true),
  send_customer_communications: z.boolean().default(true),
  view_sales_reports: z.boolean().default(true),
});

const designerPermissions = z.object({
  upload_designs: z.boolean().default(true),
  edit_designs: z.boolean().default(true),
  view_design_library: z.boolean().default(true),
  communicate_with_customers: z.boolean().default(true),
  communicate_with_manufacturers: z.boolean().default(true),
});

const manufacturerPermissions = z.object({
  view_production_queue: z.boolean().default(true),
  update_production_status: z.boolean().default(true),
  manage_inventory: z.boolean().default(true),
  report_production_issues: z.boolean().default(true),
  view_design_files: z.boolean().default(true),
});

const customerPermissions = z.object({
  view_orders: z.boolean().default(true),
  create_orders: z.boolean().default(true),
  approve_designs: z.boolean().default(true),
  make_payments: z.boolean().default(true),
  view_order_history: z.boolean().default(true),
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
  
  // Example users for testing the UI - in a production app, these would come from the API
  const testUsers = [
    {
      id: '1',
      username: 'admin',
      email: 'admin@example.com',
      first_name: 'Admin',
      last_name: 'User',
      role: 'admin'
    },
    {
      id: '2',
      username: 'designer1',
      email: 'designer@example.com',
      first_name: 'Design',
      last_name: 'Expert',
      role: 'designer'
    },
    {
      id: '3',
      username: 'sales1',
      email: 'sales@example.com',
      first_name: 'Sales',
      last_name: 'Manager',
      role: 'salesperson'
    }
  ];
  
  // For now, we'll use the test data directly while we fix the API
  const [users, setUsers] = useState<any[]>(testUsers);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  
  // State for user invitation dialog
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  
  // Filter users by search query
  const filteredUsers = users.filter((user: any) => 
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.lastName?.toLowerCase().includes(searchQuery.toLowerCase())
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
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account settings and preferences
        </p>
      </div>

      <Tabs defaultValue="account" className="space-y-4">
        <TabsList className="grid grid-cols-6">
          <TabsTrigger value="account">Account</TabsTrigger>
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
                <Button 
                  variant="default" 
                  className="ml-2"
                  onClick={() => {
                    // Add a new user directly to the list
                    const newUser = {
                      id: String(users.length + 1),
                      username: "newuser",
                      email: "newuser@example.com",
                      first_name: "New",
                      last_name: "User",
                      role: "customer"
                    };
                    
                    setUsers([...users, newUser]);
                    
                    toast({
                      title: "User created successfully",
                      description: "A new user was added with default values",
                      variant: "default",
                    });
                  }}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add User
                </Button>
              </div>

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
                        <TableHead className="w-[250px]">Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                            No users found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredUsers.map((user: any) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">
                              <div className="flex flex-col">
                                <span>{user.firstName} {user.lastName}</span>
                                <span className="text-sm text-muted-foreground">@{user.username}</span>
                              </div>
                            </TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize bg-primary/10 text-primary">
                                {user.role}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setIsEditing(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                  <span className="sr-only">Edit</span>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteUser(user.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                  <span className="sr-only">Delete</span>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
              
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
    </div>
  );
}