
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Trophy,
  Briefcase,
  GraduationCap,
  Heart,
  Building2,
  Save,
  X
} from "lucide-react";

interface OrganizationCard {
  id: string;
  name: string;
  sport: string;
  type: 'sports' | 'business' | 'education' | 'nonprofit' | 'government';
  customerCount: number;
  totalOrders: number;
  totalSpent: string;
  primaryContact?: string;
  avatar?: string;
  customers: any[];
}

interface OrganizationEditModalProps {
  organization: OrganizationCard | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const organizationEditSchema = z.object({
  name: z.string().min(2, "Organization name must be at least 2 characters"),
  type: z.enum(['sports', 'business', 'education', 'nonprofit', 'government']),
  sport: z.string().optional(),
  description: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type OrganizationEditForm = z.infer<typeof organizationEditSchema>;

const organizationIcons = {
  sports: Trophy,
  business: Briefcase,
  education: GraduationCap,
  nonprofit: Heart,
  government: Building2
};

const sportsOptions = [
  'Football', 'Basketball', 'Soccer', 'Baseball', 'Hockey', 
  'Tennis', 'Golf', 'Swimming', 'Track & Field', 'Volleyball', 
  'Wrestling', 'General Sports'
];

export default function OrganizationEditModal({
  organization,
  isOpen,
  onClose,
  onUpdate
}: OrganizationEditModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<OrganizationEditForm>({
    resolver: zodResolver(organizationEditSchema),
    defaultValues: {
      name: "",
      type: "business",
      sport: "",
      description: "",
      website: "",
      phone: "",
      address: "",
      notes: "",
    },
  });

  // Reset form when organization changes
  useEffect(() => {
    if (organization) {
      form.reset({
        name: organization.name || "",
        type: organization.type || "business",
        sport: organization.sport || "",
        description: "",
        website: "",
        phone: "",
        address: "",
        notes: "",
      });
    }
  }, [organization, form]);

  const onSubmit = async (data: OrganizationEditForm) => {
    if (!organization) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/organizations/${organization.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || 'dev-admin-token-12345'}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error('Failed to update organization');
      }

      const result = await response.json();

      toast({
        title: "Organization Updated",
        description: `${data.name} has been updated successfully.`,
      });

      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating organization:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update organization. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedType = form.watch("type");
  const IconComponent = organizationIcons[selectedType];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-rich-black/90 backdrop-blur-md border border-glass-border max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-neon-blue flex items-center">
            <IconComponent className="mr-2 h-5 w-5" />
            Edit Organization
          </DialogTitle>
          <DialogDescription className="subtitle text-neon-green">
            Update organization information and settings
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground border-b border-glass-border pb-2">
                Basic Information
              </h3>
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Organization Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter organization name" 
                        className="glass-input" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Organization Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="glass-input">
                          <SelectValue placeholder="Select organization type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="glass-panel border-glass-border">
                        <SelectItem value="sports">
                          <div className="flex items-center">
                            <Trophy className="mr-2 h-4 w-4" />
                            Sports Organization
                          </div>
                        </SelectItem>
                        <SelectItem value="business">
                          <div className="flex items-center">
                            <Briefcase className="mr-2 h-4 w-4" />
                            Business
                          </div>
                        </SelectItem>
                        <SelectItem value="education">
                          <div className="flex items-center">
                            <GraduationCap className="mr-2 h-4 w-4" />
                            Educational Institution
                          </div>
                        </SelectItem>
                        <SelectItem value="nonprofit">
                          <div className="flex items-center">
                            <Heart className="mr-2 h-4 w-4" />
                            Non-Profit
                          </div>
                        </SelectItem>
                        <SelectItem value="government">
                          <div className="flex items-center">
                            <Building2 className="mr-2 h-4 w-4" />
                            Government
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedType === 'sports' && (
                <FormField
                  control={form.control}
                  name="sport"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Sport</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="glass-input">
                            <SelectValue placeholder="Select sport" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="glass-panel border-glass-border">
                          {sportsOptions.map((sport) => (
                            <SelectItem key={sport} value={sport}>
                              {sport}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground border-b border-glass-border pb-2">
                Contact Information
              </h3>
              
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Website</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://example.com" 
                        className="glass-input" 
                        {...field} 
                      />
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
                    <FormLabel className="text-foreground">Phone Number</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="(555) 123-4567" 
                        className="glass-input" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Address</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter full address" 
                        className="glass-input" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Additional Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground border-b border-glass-border pb-2">
                Additional Information
              </h3>
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Brief description of the organization" 
                        className="glass-input" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Internal Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Internal notes (not visible to customer)" 
                        className="glass-input" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-glass-border">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
                className="glass-button"
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-neon-blue hover:bg-neon-blue/80 text-rich-black font-semibold"
              >
                {isLoading ? (
                  <div className="animate-spin w-4 h-4 border-2 border-rich-black border-t-transparent rounded-full mr-2" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
