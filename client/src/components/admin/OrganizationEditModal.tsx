
import React, { useState, useEffect, useRef } from "react";
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
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Trophy,
  Briefcase,
  GraduationCap,
  Heart,
  Building2,
  Save,
  X,
  Upload,
  Image,
  Camera,
  FileImage,
  Trash2
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
  logoFile: z.any().optional(),
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
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      logoFile: undefined,
    },
  });

  // Handle logo file selection
  const handleLogoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File Type",
          description: "Please select an image file (PNG, JPG, GIF, etc.)",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Logo file must be smaller than 5MB",
          variant: "destructive",
        });
        return;
      }

      setLogoFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      console.log('Logo file selected:', file.name);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
        logoFile: undefined,
      });
      // Reset logo upload state
      setLogoFile(null);
      setLogoPreview(null);
    }
  }, [organization, form]);

  const onSubmit = async (data: OrganizationEditForm) => {
    if (!organization) return;

    setIsLoading(true);
    try {
      console.log('🔄 Starting organization update with data:', data);
      
      // Update organization basic information
      const response = await fetch(`/api/organizations/${organization.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Use session-based auth
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update organization');
      }

      const result = await response.json();

      // Upload logo if provided
      if (logoFile) {
        console.log('🔄 Uploading logo file...');
        setIsUploadingLogo(true);
        
        try {
          const formData = new FormData();
          formData.append('file', logoFile);
          formData.append('organizationId', organization.id);
          formData.append('fileType', 'logo');
          formData.append('isPrimary', 'true');

          const logoResponse = await fetch('/api/organization-files/upload', {
            method: 'POST',
            credentials: 'include',
            body: formData
          });

          if (!logoResponse.ok) {
            const logoError = await logoResponse.json().catch(() => ({}));
            console.warn('Logo upload failed:', logoError);
            toast({
              title: "Logo Upload Warning",
              description: "Organization updated successfully, but logo upload failed. You can try uploading it again.",
              variant: "default",
            });
          } else {
            console.log('✅ Logo uploaded successfully');
          }
        } catch (logoError) {
          console.warn('Logo upload error:', logoError);
          toast({
            title: "Logo Upload Warning", 
            description: "Organization updated successfully, but logo upload failed.",
            variant: "default",
          });
        } finally {
          setIsUploadingLogo(false);
        }
      }

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
        description: error instanceof Error ? error.message : "Failed to update organization. Please try again.",
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

            {/* Logo Upload Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground border-b border-glass-border pb-2">
                Logo & Branding
              </h3>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-foreground mb-2 block">Organization Logo</Label>
                  <div className="space-y-3">
                    {/* Logo Preview */}
                    {logoPreview && (
                      <div className="flex items-center space-x-4 p-4 glass-panel border border-glass-border rounded-lg">
                        <div className="relative">
                          <img 
                            src={logoPreview} 
                            alt="Logo preview" 
                            className="w-16 h-16 object-contain rounded-lg border border-glass-border"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-foreground font-medium">
                            {logoFile?.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {logoFile && (logoFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={removeLogo}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    {/* Upload Button */}
                    <div className="flex items-center space-x-3">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoFileChange}
                        className="hidden"
                        id="logo-upload"
                      />
                      <label htmlFor="logo-upload">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex items-center glass-button"
                          asChild
                        >
                          <span>
                            <Upload className="mr-2 h-4 w-4" />
                            {logoFile ? 'Change Logo' : 'Upload Logo'}
                          </span>
                        </Button>
                      </label>
                      <span className="text-xs text-muted-foreground">
                        PNG, JPG, GIF up to 5MB
                      </span>
                    </div>
                  </div>
                </div>
              </div>
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
                disabled={isLoading || isUploadingLogo}
                className="glass-button"
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || isUploadingLogo}
                className="bg-neon-blue hover:bg-neon-blue/80 text-rich-black font-semibold"
              >
                {isUploadingLogo ? (
                  <>
                    <Upload className="mr-2 h-4 w-4 animate-spin" />
                    Uploading Logo...
                  </>
                ) : isLoading ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-rich-black border-t-transparent rounded-full mr-2" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Update Organization
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
