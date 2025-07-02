import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  RefreshCw,
  Mail,
  Trash2,
  AlertCircle,
  CheckCircle,
  XCircle,
  User,
  Building,
  ClipboardCopy,
} from "lucide-react";

// Form schema for customer invitation
const inviteFormSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email" }),
  firstName: z.string().min(1, { message: "First name is required" }),
  lastName: z.string().min(1, { message: "Last name is required" }),
  company: z.string().optional(),
  message: z.string().optional(),
});

type InviteFormValues = z.infer<typeof inviteFormSchema>;

export default function CustomerInvitesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form setup
  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      company: "",
      message: "",
    },
  });

  // Fetch invites
  const {
    data: invites = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["/api/admin/invites"],
    enabled: !!user && (user.role === "admin" || user.role === "salesperson"),
  });

  // Create invite mutation
  const sendInviteMutation = useMutation({
    mutationFn: async (data: InviteFormValues) => {
      const response = await apiRequest("POST", "/api/admin/invite", data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create invitation");
      }
      return response.json();
    },
    onSuccess: (data) => {
      // Extract the invitation URL from the response to display to the user
      const inviteUrl = data.invite?.inviteUrl;

      toast({
        title: "Invitation created",
        description: "The customer invitation has been created successfully",
        variant: "default",
      });

      // If we have an invite URL, show it in a separate toast that can be clicked to copy
      if (inviteUrl) {
        setTimeout(() => {
          toast({
            title: "Invitation link ready",
            description: "Click to copy the invitation link to share with the customer",
            variant: "default",
            action: (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(inviteUrl);
                  toast({
                    title: "Link copied",
                    description: "Invitation link copied to clipboard",
                    variant: "default",
                  });
                }}
              >
                Copy Link
              </Button>
            ),
          });
        }, 500);
      }

      queryClient.invalidateQueries({ queryKey: ["/api/admin/invites"] });
      form.reset();
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete invite mutation
  const deleteInviteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/admin/invites/${id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete invitation");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Invitation deleted",
        description: "The invitation has been deleted successfully",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/invites"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  const onSubmit = (data: InviteFormValues) => {
    sendInviteMutation.mutate(data);
  };

  // Copy invitation link handler
  const copyInvitationLink = (token: string) => {
    const inviteUrl = `${window.location.origin}/register?invite=${token}`;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      toast({
        title: "Link copied",
        description: "Invitation link copied to clipboard",
        variant: "default",
      });
    });
  };

  // Handle delete invitation
  const handleDeleteInvite = (id: string) => {
    if (window.confirm("Are you sure you want to delete this invitation?")) {
      deleteInviteMutation.mutate(id);
    }
  };

  // Get invitation status badge
  const getStatusBadge = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);

    if (now > expiry) {
      return (
        <Badge variant="destructive" className="flex items-center">
          <XCircle className="h-3 w-3 mr-1" />
          Expired
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="bg-primary/10 text-primary flex items-center">
        <CheckCircle className="h-3 w-3 mr-1" />
        Active
      </Badge>
    );
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customer Invites</h1>
          <p className="text-muted-foreground mt-2">
            Send and manage invitations for new customers
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Invitation
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Invite a new customer</DialogTitle>
                <DialogDescription>
                  Send an invitation email to a potential customer
                </DialogDescription>
              </DialogHeader>

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

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="customer@example.com" {...field} />
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
                        <FormLabel>Company (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Company name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Personal Message (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Add a personal message to the invitation email" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          This message will be included in the invitation email
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button type="submit" disabled={sendInviteMutation.isPending}>
                      {sendInviteMutation.isPending ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="h-4 w-4 mr-2" />
                          Send Invitation
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Invitations</CardTitle>
          <CardDescription>
            Manage all customer invitations sent from your account
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
              <p>Failed to load invitations. Please try again.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No invitations have been sent yet
                    </TableCell>
                  </TableRow>
                ) : (
                  (invites as any[])?.map((invite: any) => (
                    <TableRow key={invite.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium flex items-center">
                            <User className="h-4 w-4 mr-2 text-muted-foreground" />
                            {invite.first_name} {invite.last_name}
                          </span>
                          {invite.company && (
                            <span className="text-sm text-muted-foreground flex items-center">
                              <Building className="h-3 w-3 mr-1" />
                              {invite.company}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{invite.email}</TableCell>
                      <TableCell>
                        {getStatusBadge(invite.expires_at)}
                      </TableCell>
                      <TableCell>
                        {format(new Date(invite.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyInvitationLink(invite.token)}
                          >
                            <ClipboardCopy className="h-4 w-4" />
                            <span className="sr-only">Copy invitation link</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteInvite(invite.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                            <span className="sr-only">Delete invitation</span>
                          </Button>
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

      <div className="mt-8">
        <h2 className="text-lg font-medium mb-4">How Customer Invites Work</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">1. Send Invitation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Enter the customer's details and send them an invitation email with a secure link to register for an account.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">2. Customer Registration</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                The customer clicks the link in their email and completes their registration by creating a password and setting up their profile.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">3. Account Ready</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Once registered, the customer can immediately log in and start placing order requests which will appear in the New Order Inquiries section.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}