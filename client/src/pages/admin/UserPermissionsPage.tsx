
import React, { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search, 
  PlusCircle, 
  Edit, 
  Users,
  Shield,
  Settings,
  Eye,
  UserPlus
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  company: string;
  phone: string;
  role: 'admin' | 'salesperson' | 'designer' | 'manufacturer' | 'customer';
  specialties?: string;
  isActive: boolean;
  permissions: Record<string, boolean>;
  created_at: string;
}

const userCreateSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  role: z.enum(['admin', 'salesperson', 'designer', 'manufacturer', 'customer']),
  company: z.string().optional(),
  phone: z.string().optional(),
  specialties: z.string().optional(),
});

type UserCreateForm = z.infer<typeof userCreateSchema>;

const roleColors = {
  admin: 'bg-red-500 text-white',
  salesperson: 'bg-blue-500 text-white',
  designer: 'bg-purple-500 text-white',
  manufacturer: 'bg-green-500 text-white',
  customer: 'bg-gray-500 text-white',
};

const roleDescriptions = {
  admin: 'Full system access and user management',
  salesperson: 'Customer management and order creation',
  designer: 'Design tasks and file management',
  manufacturer: 'Production queue and inventory management',
  customer: 'Order viewing and profile management',
};

export default function UserPermissionsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isViewPermissionsDialogOpen, setIsViewPermissionsDialogOpen] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<UserCreateForm>({
    resolver: zodResolver(userCreateSchema),
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      role: "customer",
      company: "",
      phone: "",
      specialties: "",
    },
  });

  // Fetch all users for overview
  const { data: allUsers = [], isLoading } = useQuery({
    queryKey: ["admin", "all-users"],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error("No authentication token");
      }

      const response = await fetch("/api/users", {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.statusText}`);
      }

      const result = await response.json();
      return result.users || [];
    },
    refetchOnWindowFocus: false,
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: UserCreateForm) => {
      const token = localStorage.getItem('authToken');
      
      const response = await fetch("/api/users/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to create user");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "all-users"] });
      setIsCreateUserDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "User created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UserCreateForm) => {
    createUserMutation.mutate(data);
  };

  // Filter users based on search and role
  const filteredUsers = allUsers.filter((user: User) => {
    const matchesSearch = 
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.company.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = selectedRole === "all" || user.role === selectedRole;

    return matchesSearch && matchesRole;
  });

  // View user permissions
  const handleViewPermissions = (user: User) => {
    setSelectedUser(user);
    setIsViewPermissionsDialogOpen(true);
  };

  // Role statistics
  const roleStats = allUsers.reduce((acc: Record<string, number>, user: User) => {
    acc[user.role] = (acc[user.role] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neon-blue">User Management & Permissions</h1>
          <p className="subtitle text-neon-green text-sm mt-2">
            Manage users, roles, and permissions across the system
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Dialog open={isCreateUserDialogOpen} onOpenChange={setIsCreateUserDialogOpen}>
            <DialogTrigger asChild>
              <Button className="btn-primary">
                <UserPlus className="mr-2 h-4 w-4" />
                Create User
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-rich-black/90 backdrop-blur-md border border-glass-border max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-neon-blue flex items-center">
                  <UserPlus className="mr-2 h-5 w-5" />
                  Create New User
                </DialogTitle>
                <DialogDescription className="subtitle text-neon-green">
                  Create a new user account with specific role and permissions
                </DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="subtitle text-muted-foreground text-xs">First Name</FormLabel>
                          <FormControl>
                            <Input {...field} className="rich-input" placeholder="Enter first name" />
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
                          <FormLabel className="subtitle text-muted-foreground text-xs">Last Name</FormLabel>
                          <FormControl>
                            <Input {...field} className="rich-input" placeholder="Enter last name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="subtitle text-muted-foreground text-xs">Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" className="rich-input" placeholder="Enter email address" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="subtitle text-muted-foreground text-xs">Password</FormLabel>
                        <FormControl>
                          <Input {...field} type="password" className="rich-input" placeholder="Enter password" />
                        </FormControl>
                        <FormDescription className="subtitle text-muted-foreground text-xs">
                          Password must be at least 8 characters long
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="subtitle text-muted-foreground text-xs">Role</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="rich-input">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rich-card">
                            <SelectItem value="customer">Customer - {roleDescriptions.customer}</SelectItem>
                            <SelectItem value="salesperson">Salesperson - {roleDescriptions.salesperson}</SelectItem>
                            <SelectItem value="designer">Designer - {roleDescriptions.designer}</SelectItem>
                            <SelectItem value="manufacturer">Manufacturer - {roleDescriptions.manufacturer}</SelectItem>
                            <SelectItem value="admin">Admin - {roleDescriptions.admin}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="subtitle text-muted-foreground text-xs">Company (Optional)</FormLabel>
                          <FormControl>
                            <Input {...field} className="rich-input" placeholder="Enter company name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="subtitle text-muted-foreground text-xs">Phone (Optional)</FormLabel>
                          <FormControl>
                            <Input {...field} className="rich-input" placeholder="Enter phone number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="specialties"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="subtitle text-muted-foreground text-xs">Specialties (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} className="rich-input" placeholder="Enter specialties or skills" />
                        </FormControl>
                        <FormDescription className="subtitle text-muted-foreground text-xs">
                          For manufacturers: embroidery, screen printing, etc.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-4 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsCreateUserDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      className="btn-primary"
                      disabled={createUserMutation.isPending}
                    >
                      {createUserMutation.isPending ? "Creating..." : "Create User"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Role Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {Object.entries(roleStats).map(([role, count]) => (
          <Card key={role} className="rich-card">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-neon-blue" />
                <Badge className={roleColors[role as keyof typeof roleColors]}>
                  {role}
                </Badge>
              </div>
              <div className="text-2xl font-bold text-neon-green mt-2">{count}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* View Permissions Dialog */}
      <Dialog open={isViewPermissionsDialogOpen} onOpenChange={setIsViewPermissionsDialogOpen}>
        <DialogContent className="bg-rich-black/90 backdrop-blur-md border border-glass-border max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-neon-blue flex items-center">
              <Eye className="mr-2 h-5 w-5" />
              User Permissions: {selectedUser?.firstName} {selectedUser?.lastName}
            </DialogTitle>
            <DialogDescription className="subtitle text-neon-green">
              View permissions for {selectedUser?.role} role
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">User Details</h3>
                  <div className="space-y-1 text-sm">
                    <div>Email: {selectedUser.email}</div>
                    <div>Company: {selectedUser.company || 'N/A'}</div>
                    <div>Phone: {selectedUser.phone || 'N/A'}</div>
                    <div>Status: {selectedUser.isActive ? 'Active' : 'Inactive'}</div>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Role Information</h3>
                  <Badge className={roleColors[selectedUser.role]}>
                    {selectedUser.role}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-2">
                    {roleDescriptions[selectedUser.role]}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Permissions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(selectedUser.permissions || {}).map(([permission, hasAccess]) => (
                    <div key={permission} className="flex items-center justify-between p-2 border border-glass-border rounded">
                      <span className="text-sm text-foreground">
                        {permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                      <Badge variant={hasAccess ? "default" : "secondary"}>
                        {hasAccess ? "Allowed" : "Denied"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setIsViewPermissionsDialogOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Users Table */}
      <Card className="rich-card">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                type="search" 
                placeholder="Search users..." 
                className="rich-input pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="rich-input w-40">
                  <SelectValue placeholder="Role" />
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

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-neon-blue border-t-transparent rounded-full" />
            </div>
          ) : filteredUsers.length > 0 ? (
            <div className="rounded-md border border-glass-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-foreground">User</TableHead>
                    <TableHead className="text-foreground">Email</TableHead>
                    <TableHead className="text-foreground">Role</TableHead>
                    <TableHead className="text-foreground">Company</TableHead>
                    <TableHead className="text-foreground">Status</TableHead>
                    <TableHead className="text-right text-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user: User) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-foreground">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            @{user.username}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground">{user.email}</TableCell>
                      <TableCell>
                        <Badge className={roleColors[user.role]}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-foreground">{user.company || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? "default" : "secondary"}>
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleViewPermissions(user)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center border border-glass-border">
              <Users className="h-10 w-10 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2 text-foreground">No users found</h3>
              <p className="text-muted-foreground max-w-md">
                No users match your current search criteria. Try adjusting your filters.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
