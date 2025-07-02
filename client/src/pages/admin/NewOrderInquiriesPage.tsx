import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  RefreshCw,
  MoreHorizontal,
  FileText,
  User,
  CheckCircle,
  Clock,
  XCircle,
  Search,
  ExternalLink,
  Filter,
} from "lucide-react";

export default function NewOrderInquiriesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInquiry, setSelectedInquiry] = useState<any>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [assignmentNotes, setAssignmentNotes] = useState("");

  // Fetch inquiries
  const {
    data: inquiries = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["/api/admin/inquiries"],
    enabled: !!user && (user.role === "admin" || user.role === "salesperson"),
  });

  // Filter inquiries by status and search query
  const filteredInquiries = inquiries.filter((inquiry: any) => {
    const matchesStatus = statusFilter === "all" || inquiry.status === statusFilter;
    const matchesSearch = searchQuery === "" || 
      (inquiry.customer?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       inquiry.customer?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       inquiry.customer?.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       inquiry.product_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       inquiry.description?.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesStatus && matchesSearch;
  });

  // Update inquiry status mutation
  const updateInquiryMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const response = await apiRequest("PATCH", `/api/admin/inquiries/${id}`, {
        status,
        notes,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update inquiry");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Inquiry updated",
        description: "The inquiry status has been updated successfully",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/inquiries"] });
      setIsDetailsDialogOpen(false);
      setSelectedInquiry(null);
      setAssignmentNotes("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update inquiry",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "new":
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200 flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            New
          </Badge>
        );
      case "in_progress":
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-200 flex items-center">
            <RefreshCw className="h-3 w-3 mr-1" />
            In Progress
          </Badge>
        );
      case "converted":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 flex items-center">
            <CheckCircle className="h-3 w-3 mr-1" />
            Converted
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200 flex items-center">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {status}
          </Badge>
        );
    }
  };

  // Handle view details
  const handleViewDetails = (inquiry: any) => {
    setSelectedInquiry(inquiry);
    setIsDetailsDialogOpen(true);
  };

  // Handle status change
  const handleStatusChange = (id: string, status: string) => {
    updateInquiryMutation.mutate({ id, status, notes: assignmentNotes });
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Order Inquiries</h1>
          <p className="text-muted-foreground mt-2">
            Manage and process new order requests from customers
          </p>
        </div>

        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="flex items-center mb-6 space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search inquiries..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={setStatusFilter}
        >
          <SelectTrigger className="w-[180px]">
            <div className="flex items-center">
              <Filter className="h-4 w-4 mr-2" />
              <span>{statusFilter === "all" ? "All Statuses" : `Status: ${statusFilter}`}</span>
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer Order Inquiries</CardTitle>
          <CardDescription>
            Review and process new order requests from customers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="rounded-md bg-destructive/15 p-4 text-destructive flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              <p>Failed to load inquiries. Please try again.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInquiries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No order inquiries found
                    </TableCell>
                  </TableRow>
                ) : (
                  (inquiries as any[])?.map((inquiry: any) => (
                    <TableRow key={inquiry.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium flex items-center">
                            <User className="h-4 w-4 mr-2 text-muted-foreground" />
                            {inquiry.customer?.first_name} {inquiry.customer?.last_name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {inquiry.customer?.email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{inquiry.product_type}</span>
                          <span className="text-xs text-muted-foreground">
                            Qty: {inquiry.quantity}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(inquiry.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(inquiry.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(inquiry)}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Details
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">More options</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleStatusChange(inquiry.id, "in_progress")}>
                                Mark as In Progress
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(inquiry.id, "converted")}>
                                Convert to Order
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(inquiry.id, "rejected")}>
                                Reject Inquiry
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Inquiry Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Order Inquiry Details</DialogTitle>
            <DialogDescription>
              Review detailed information about this order inquiry
            </DialogDescription>
          </DialogHeader>

          {selectedInquiry && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Customer</h3>
                  <p className="font-medium">
                    {selectedInquiry.customer?.first_name} {selectedInquiry.customer?.last_name}
                  </p>
                  <p className="text-sm">{selectedInquiry.customer?.email}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Status</h3>
                  <div>{getStatusBadge(selectedInquiry.status)}</div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Product Information</h3>
                <div className="rounded-md border p-3">
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <span className="text-xs text-muted-foreground">Type</span>
                      <p className="font-medium">{selectedInquiry.product_type}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Quantity</span>
                      <p className="font-medium">{selectedInquiry.quantity}</p>
                    </div>
                  </div>

                  <div className="mb-3">
                    <span className="text-xs text-muted-foreground">Description</span>
                    <p className="text-sm mt-1">{selectedInquiry.description}</p>
                  </div>

                  {selectedInquiry.requirements && (
                    <div className="mb-3">
                      <span className="text-xs text-muted-foreground">Special Requirements</span>
                      <p className="text-sm mt-1">{selectedInquiry.requirements}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    {selectedInquiry.timeline && (
                      <div>
                        <span className="text-xs text-muted-foreground">Timeline</span>
                        <p className="text-sm mt-1">{selectedInquiry.timeline}</p>
                      </div>
                    )}

                    {selectedInquiry.budget && (
                      <div>
                        <span className="text-xs text-muted-foreground">Budget</span>
                        <p className="text-sm mt-1">${selectedInquiry.budget.toFixed(2)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {selectedInquiry.attachments && selectedInquiry.attachments.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Attachments</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedInquiry.attachments.map((attachment: string, index: number) => (
                      <a 
                        key={index}
                        href={attachment}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center rounded-md px-3 py-1 text-sm border hover:bg-muted transition-colors"
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        Attachment {index + 1}
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Assignment Notes</h3>
                <Textarea
                  placeholder="Add notes about this inquiry..."
                  value={assignmentNotes}
                  onChange={(e) => setAssignmentNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <DialogFooter className="flex gap-2">
                <Select 
                  onValueChange={(value) => handleStatusChange(selectedInquiry.id, value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Update Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="converted">Convert to Order</SelectItem>
                    <SelectItem value="rejected">Reject</SelectItem>
                  </SelectContent>
                </Select>

                <Button onClick={() => setIsDetailsDialogOpen(false)}>Close</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}