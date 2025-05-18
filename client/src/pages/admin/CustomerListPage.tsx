import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Search, 
  MoreHorizontal, 
  PlusCircle, 
  Filter, 
  RefreshCw, 
  Mail, 
  UserPlus, 
  FileText, 
  Trash2 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

// Customer interface type
interface Customer {
  id: number;
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
}

export default function CustomerListPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddCustomerDialogOpen, setIsAddCustomerDialogOpen] = useState(false);
  const { toast } = useToast();
  
  // Fetch real customer data from API
  const { data: customers, isLoading, isError } = useQuery({
    queryKey: ["admin", "customers"],
    queryFn: async () => {
      const response = await fetch("/api/admin/customers");
      if (!response.ok) {
        throw new Error("Failed to fetch customers");
      }
      return response.json();
    }
  });

  // Filter customers based on search term
  const filteredCustomers = customers?.filter((customer: Customer) => {
    const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
    const searchLower = searchTerm.toLowerCase();
    
    return (
      (fullName && fullName.toLowerCase().includes(searchLower)) ||
      (customer.email && customer.email.toLowerCase().includes(searchLower)) ||
      (customer.company && customer.company.toLowerCase().includes(searchLower))
    );
  });

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddCustomerDialogOpen(false);
    toast({
      title: "Customer added",
      description: "New customer has been added successfully",
    });
  };

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
          <Dialog open={isAddCustomerDialogOpen} onOpenChange={setIsAddCustomerDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Customer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Customer</DialogTitle>
                <DialogDescription>
                  Fill out the form below to add a new customer to your database.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddCustomer}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      Name
                    </Label>
                    <Input id="name" className="col-span-3" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="email" className="text-right">
                      Email
                    </Label>
                    <Input id="email" type="email" className="col-span-3" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="company" className="text-right">
                      Company
                    </Label>
                    <Input id="company" className="col-span-3" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Add Customer</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Customer Directory</CardTitle>
          <CardDescription>
            View and manage all your customer accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row justify-between mb-4 gap-4">
            <div className="relative max-w-md">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
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
              <Button variant="outline" size="sm" className="h-9">
                <RefreshCw className="mr-2 h-4 w-4" />
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
                        <div>
                          <p className="font-medium">
                            {customer.firstName} {customer.lastName}
                          </p>
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
    </div>
  );
}