import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getQueryFn } from '@/lib/queryClient';
import { formatDate } from '@/lib/utils';
import { Search, Users, Mail, Phone, Building, Calendar } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Customer {
  id?: number;
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  createdAt: string;
  metadata: any | null;
}

export default function CustomerList() {
  const [search, setSearch] = useState('');
  
  // Fetch customers
  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ['/api/admin/customers'],
    queryFn: getQueryFn({ on401: 'throw' }),
  });
  
  // Filter customers based on search term
  const filteredCustomers = customers.filter(customer => {
    const searchTerm = search.toLowerCase();
    return (
      searchTerm === '' || 
      `${customer.firstName} ${customer.lastName}`.toLowerCase().includes(searchTerm) ||
      customer.email.toLowerCase().includes(searchTerm) ||
      (customer.company && customer.company.toLowerCase().includes(searchTerm))
    );
  });

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-primary hidden sm:inline-flex" />
            Customer Management
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            View and manage customer accounts
          </p>
        </div>
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Customers</CardTitle>
              <CardDescription>
                {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''} found
              </CardDescription>
            </div>
            
            <div className="w-full sm:w-auto flex gap-2">
              <div className="relative w-full sm:w-[300px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search customers..."
                  className="pl-9 h-10 border-gray-200 focus:border-primary"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="hidden md:table-cell">Phone</TableHead>
                    <TableHead className="hidden md:table-cell">Company</TableHead>
                    <TableHead className="hidden md:table-cell">Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    // Show loading skeleton
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-6 w-[200px]" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-[250px]" /></TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-6 w-[120px]" /></TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-6 w-[150px]" /></TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-6 w-[100px]" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-9 w-[100px] ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-gray-500">
                        {search ? 'No customers match your search' : 'No customers found'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCustomers.map(customer => (
                      <TableRow key={customer.userId}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-gray-500" />
                            {customer.firstName} {customer.lastName}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-gray-500" />
                            {customer.email}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {customer.phone ? (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-gray-500" />
                              {customer.phone}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm italic">Not provided</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {customer.company ? (
                            <div className="flex items-center gap-2">
                              <Building className="h-4 w-4 text-gray-500" />
                              {customer.company}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm italic">Not provided</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-gray-500" />
                                  {formatDate(new Date(customer.createdAt))}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Created on {new Date(customer.createdAt).toLocaleString()}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Handle view customer details
                              // This will be implemented in a future update
                            }}
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}