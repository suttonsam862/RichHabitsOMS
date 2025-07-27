import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Search, 
  MoreHorizontal, 
  PlusCircle, 
  Filter, 
  RefreshCw, 
  Mail, 
  UserPlus, 
  FileText, 
  Trash2,
  Users,
  Eye
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import AddCustomerForm from "./AddCustomerForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Customer {
  id: number | string;
  name?: string;
  email?: string;
  company?: string;
  orders?: number;
  spent?: string;
  lastOrder?: string | null;
  status?: string;
  firstName?: string;
  lastName?: string;
  userId?: number;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  created_at?: string;
}

export default function CustomerListPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddCustomerDialogOpen, setIsAddCustomerDialogOpen] = useState(false);
  const [isViewCustomerDialogOpen, setIsViewCustomerDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsViewCustomerDialogOpen(true);
  };

  // Fetch real customer data from API
  const { data: customersResponse, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "customers"],
    queryFn: async () => {
      console.log("Fetching real customers from API...");
      const response = await fetch("/api/customers");

      if (!response.ok) {
        throw new Error("Failed to fetch customers");
      }

      const data = await response.json();
      console.log("Received customer data:", data);
      console.log("Data type:", typeof data, "Is array:", Array.isArray(data));
      return data;
    }
  });

  // Extract customers array from API response
  const customers = React.useMemo(() => {
    if (!customersResponse) return [];

    // Handle {success: true, data: [...]} structure
    if (customersResponse.success && Array.isArray(customersResponse.data)) {
      return customersResponse.data;
    }

    // Handle direct array
    if (Array.isArray(customersResponse)) {
      return customersResponse;
    }

    console.error("Unexpected customer data structure:", customersResponse);
    return [];
  }, [customersResponse]);

  // Filter customers based on search term
  const filteredCustomers = React.useMemo(() => {
    // Ensure customers is always an array before filtering
    const customersArray = Array.isArray(customers) ? customers : [];

    return customersArray.filter(customer => {
      const matchesSearch = searchTerm === '' || 
        customer.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.company?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCompany = 'all';

      return matchesSearch && matchesCompany;
    });
  }, [customers, searchTerm]);

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground mt-2">
            Manage your customer relationships and interactions
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Button onClick={() => setIsAddCustomerDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                type="search" 
                placeholder="Search customers..." 
                className="pl-8 max-w-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-9">
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-9" 
                onClick={() => queryClient.invalidateQueries({ queryKey: ["admin", "customers"] })}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full mr-2" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Refresh
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : isError ? (
            <div className="flex justify-center py-8 text-center">
              <div className="max-w-md">
                <h3 className="text-lg font-medium mb-2">Unable to load customers</h3>
                <p className="text-muted-foreground">There was an error fetching customer data. Please try again later.</p>
              </div>
            </div>
          ) : filteredCustomers && filteredCustomers.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer: Customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div className="font-medium">
                          {customer.firstName} {customer.lastName}
                        </div>
                      </TableCell>
                      <TableCell>{customer.email || "-"}</TableCell>
                      <TableCell>{customer.company || "-"}</TableCell>
                      <TableCell>{customer.orders || 0}</TableCell>
                      <TableCell>
                        <Badge variant="default">
                          Active
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleViewCustomer(customer)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Customer
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Mail className="mr-2 h-4 w-4" />
                              Send Email
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <UserPlus className="mr-2 h-4 w-4" />
                              Edit Customer
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <FileText className="mr-2 h-4 w-4" />
                              View Orders
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center border rounded-md">
              <div className="bg-gray-100 p-3 rounded-full mb-4">
                <Users className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium mb-2">No customers found</h3>
              <p className="text-muted-foreground max-w-md mb-6">
                There are no customers in the system yet. Add your first customer to get started.
              </p>
              <Button 
                onClick={() => setIsAddCustomerDialogOpen(true)}
                className="flex items-center"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Customer
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Use our new AddCustomerForm component */}
      <AddCustomerForm 
        isOpen={isAddCustomerDialogOpen} 
        onClose={() => setIsAddCustomerDialogOpen(false)} 
      />

      {/* View Customer Dialog */}
      <Dialog open={isViewCustomerDialogOpen} onOpenChange={setIsViewCustomerDialogOpen}>
        <DialogContent className="bg-rich-black/90 backdrop-blur-md border border-glass-border max-w-2xl" style={{ transform: 'none !important' }}>
          <DialogHeader>
            <DialogTitle className="text-neon-blue flex items-center">
              <Eye className="mr-2 h-5 w-5" />
              Customer Details
            </DialogTitle>
            <DialogDescription className="subtitle text-neon-green">
              Complete customer information and account details
            </DialogDescription>
          </DialogHeader>

          {selectedCustomer && (
            <div className="space-y-6 mt-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground border-b border-glass-border pb-2">
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="subtitle text-muted-foreground text-xs">Full Name</label>
                    <p className="text-foreground font-medium">
                      {selectedCustomer.firstName} {selectedCustomer.lastName}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="subtitle text-muted-foreground text-xs">Email Address</label>
                    <p className="text-foreground">{selectedCustomer.email || "Not provided"}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="subtitle text-muted-foreground text-xs">Company</label>
                    <p className="text-foreground">{selectedCustomer.company || "Not provided"}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="subtitle text-muted-foreground text-xs">Phone</label>
                    <p className="text-foreground">{selectedCustomer.phone || "Not provided"}</p>
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground border-b border-glass-border pb-2">
                  Address Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="subtitle text-muted-foreground text-xs">Street Address</label>
                    <p className="text-foreground">{selectedCustomer.address || "Not provided"}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="subtitle text-muted-foreground text-xs">City</label>
                    <p className="text-foreground">{selectedCustomer.city || "Not provided"}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="subtitle text-muted-foreground text-xs">State</label>
                    <p className="text-foreground">{selectedCustomer.state || "Not provided"}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="subtitle text-muted-foreground text-xs">ZIP Code</label>
                    <p className="text-foreground">{selectedCustomer.zip || "Not provided"}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="subtitle text-muted-foreground text-xs">Country</label>
                    <p className="text-foreground">{selectedCustomer.country || "Not provided"}</p>
                  </div>
                </div>
              </div>

              {/* Account Summary */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground border-b border-glass-border pb-2">
                  Account Summary
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="glass-panel p-4 text-center">
                    <p className="subtitle text-muted-foreground text-xs">Total Orders</p>
                    <p className="text-2xl font-bold text-neon-blue">{selectedCustomer.orders || 0}</p>
                  </div>
                  <div className="glass-panel p-4 text-center">
                    <p className="subtitle text-muted-foreground text-xs">Total Spent</p>
                    <p className="text-2xl font-bold text-neon-green">{selectedCustomer.spent || "$0.00"}</p>
                  </div>
                  <div className="glass-panel p-4 text-center">
                    <p className="subtitle text-muted-foreground text-xs">Status</p>
                    <Badge className="mt-1">{selectedCustomer.status || "Active"}</Badge>
                  </div>
                </div>
              </div>

              {/* Account Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground border-b border-glass-border pb-2">
                  Account Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="subtitle text-muted-foreground text-xs">Customer ID</label>
                    <p className="text-foreground font-mono text-sm">{selectedCustomer.id}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="subtitle text-muted-foreground text-xs">Last Order</label>
                    <p className="text-foreground">{selectedCustomer.lastOrder || "No orders yet"}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="subtitle text-muted-foreground text-xs">Account Created</label>
                    <p className="text-foreground">
                      {selectedCustomer.created_at 
                        ? new Date(selectedCustomer.created_at).toLocaleDateString()
                        : "Unknown"
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}