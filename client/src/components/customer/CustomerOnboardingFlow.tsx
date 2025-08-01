
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  User, 
  Building2, 
  Phone, 
  MapPin, 
  Target, 
  CheckCircle, 
  ArrowLeft, 
  ArrowRight,
  X,
  Sparkles,
  Users,
  Mail,
  Upload,
  FileImage,
  Link,
  UserCheck,
  Trophy,
  Briefcase,
  GraduationCap,
  Heart,
  Plus,
  Trash2,
  Camera
} from 'lucide-react';

// Enhanced form validation schemas
const organizationTypeSchema = z.object({
  primaryType: z.enum(['sports', 'business']),
  subcategory: z.string().min(1, 'Subcategory is required'),
});

const basicInfoSchema = z.object({
  organizationName: z.string().min(2, 'Organization name must be at least 2 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  website: z.string().url().optional().or(z.literal('')),
});

const addressSchema = z.object({
  street: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipCode: z.string().min(5, 'ZIP code is required'),
  country: z.string().min(1, 'Country is required'),
});

const additionalInfoSchema = z.object({
  teamSize: z.string().optional(),
  seasonLength: z.string().optional(),
  budget: z.string().optional(),
  timeline: z.string().optional(),
  specialRequirements: z.string().optional(),
});

interface CustomerOnboardingFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface OrganizationData {
  primaryType: string;
  subcategory: string;
  organizationName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  website?: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  teamSize?: string;
  seasonLength?: string;
  budget?: string;
  timeline?: string;
  specialRequirements?: string;
  logoFile?: File;
}

export default function CustomerOnboardingFlow({ isOpen, onClose, onSuccess }: CustomerOnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [organizationData, setOrganizationData] = useState<Partial<OrganizationData>>({});
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form instances for each step
  const typeForm = useForm({
    resolver: zodResolver(organizationTypeSchema),
    defaultValues: { primaryType: 'sports' as const, subcategory: '' }
  });

  const basicForm = useForm({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      organizationName: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      website: ''
    }
  });

  const addressForm = useForm({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'United States'
    }
  });

  const additionalForm = useForm({
    resolver: zodResolver(additionalInfoSchema),
    defaultValues: {
      teamSize: '',
      seasonLength: '',
      budget: '',
      timeline: '',
      specialRequirements: ''
    }
  });

  // Subcategory options
  const subcategoryOptions = {
    sports: [
      'Football', 'Basketball', 'Soccer', 'Baseball', 'Hockey',
      'Tennis', 'Golf', 'Swimming', 'Track & Field', 'Volleyball',
      'Wrestling', 'Cross Country', 'Softball', 'Lacrosse', 'Rugby'
    ],
    business: [
      'Technology', 'Healthcare', 'Finance', 'Manufacturing', 'Retail',
      'Education', 'Hospitality', 'Construction', 'Real Estate', 'Consulting'
    ]
  };

  // Handle logo file selection with proper error handling
  const handleLogoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File Type",
        description: "Please select an image file (PNG, JPG, GIF, etc.)",
        variant: "destructive",
      });
      event.target.value = '';
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Logo file must be smaller than 5MB",
        variant: "destructive",
      });
      event.target.value = '';
      return;
    }

    setLogoFile(file);
    
    // Create preview URL with cleanup
    if (logoPreview) {
      URL.revokeObjectURL(logoPreview);
    }
    const newPreviewUrl = URL.createObjectURL(file);
    setLogoPreview(newPreviewUrl);

    console.log('Logo file selected:', file.name, 'Size:', (file.size / 1024 / 1024).toFixed(2), 'MB');
  };

  const removeLogo = () => {
    if (logoPreview) {
      URL.revokeObjectURL(logoPreview);
    }
    setLogoFile(null);
    setLogoPreview(null);
    
    // Clear file input
    const fileInput = document.getElementById('logo-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  // Navigation handlers
  const nextStep = async () => {
    let isValid = false;
    let data: any = {};

    switch (currentStep) {
      case 1:
        isValid = await typeForm.trigger();
        if (isValid) {
          data = typeForm.getValues();
          setOrganizationData(prev => ({ ...prev, ...data }));
        }
        break;
      case 2:
        isValid = await basicForm.trigger();
        if (isValid) {
          data = basicForm.getValues();
          setOrganizationData(prev => ({ ...prev, ...data }));
        }
        break;
      case 3:
        isValid = await addressForm.trigger();
        if (isValid) {
          data = addressForm.getValues();
          setOrganizationData(prev => ({ ...prev, ...data }));
        }
        break;
      case 4:
        isValid = await additionalForm.trigger();
        if (isValid) {
          data = additionalForm.getValues();
          setOrganizationData(prev => ({ ...prev, ...data }));
        }
        break;
      case 5:
        // Logo upload step - always valid since it's optional
        isValid = true;
        break;
    }

    if (isValid && currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Create customer with all collected data
  const createCustomer = async () => {
    try {
      setIsCreating(true);
      
      // Combine all form data
      const finalData = {
        ...organizationData,
        ...additionalForm.getValues()
      };

      console.log('🔄 Creating customer with data:', finalData);

      // Create the customer first
      const customerResponse = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          firstName: finalData.firstName,
          lastName: finalData.lastName,
          email: finalData.email,
          company: finalData.organizationName,
          phone: finalData.phone,
          sport: finalData.subcategory,
          organizationType: finalData.primaryType,
          website: finalData.website || '',
          address: `${finalData.street}, ${finalData.city}, ${finalData.state} ${finalData.zipCode}`,
          country: finalData.country,
          teamSize: finalData.teamSize,
          seasonLength: finalData.seasonLength,
          budget: finalData.budget,
          timeline: finalData.timeline,
          specialRequirements: finalData.specialRequirements
        })
      });

      if (!customerResponse.ok) {
        const errorData = await customerResponse.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create customer');
      }

      const customerResult = await customerResponse.json();
      const customerId = customerResult.customer?.id;

      if (!customerId) {
        throw new Error('Customer created but no ID returned');
      }

      console.log('✅ Customer created successfully:', customerId);

      // Upload logo if provided
      if (logoFile) {
        console.log('🔄 Uploading logo file...');
        
        try {
          const formData = new FormData();
          formData.append('logo', logoFile);

          const logoResponse = await fetch(`/api/customers/${customerId}/logo`, {
            method: 'POST',
            credentials: 'include',
            body: formData
          });

          if (!logoResponse.ok) {
            const logoError = await logoResponse.json().catch(() => ({}));
            console.warn('Logo upload failed:', logoError);
            toast({
              title: "Logo Upload Warning",
              description: "Customer created successfully, but logo upload failed. You can upload it later.",
              variant: "default",
            });
          } else {
            console.log('✅ Logo uploaded successfully');
            toast({
              title: "Logo uploaded",
              description: "Organization logo has been uploaded successfully!",
            });
          }
        } catch (logoError: any) {
          console.error('❌ Logo upload failed:', logoError);
          toast({
            title: "Logo upload failed",
            description: logoError.message || "Could not upload logo, but organization was created successfully",
            variant: "destructive",
          });
        }
      }

      // Show success message
      toast({
        title: "Organization Created!",
        description: `${finalData.organizationName} has been successfully added to your system.`,
      });

      // Invalidate customers cache to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });

      // Call success callback and close modal
      onSuccess();
      onClose();

    } catch (error: any) {
      console.error('❌ Error creating customer:', error);
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create organization. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Close handler with cleanup
  const handleClose = () => {
    if (logoPreview) {
      URL.revokeObjectURL(logoPreview);
    }
    setCurrentStep(1);
    setOrganizationData({});
    setLogoFile(null);
    setLogoPreview(null);
    typeForm.reset();
    basicForm.reset();
    addressForm.reset();
    additionalForm.reset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-rich-black/90 backdrop-blur-md border border-glass-border rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-glass-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Building2 className="h-6 w-6 text-neon-blue" />
              <div>
                <h2 className="text-xl font-bold text-foreground">New Organization</h2>
                <p className="text-sm text-muted-foreground">Step {currentStep} of 5</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex space-x-2">
              {[1, 2, 3, 4, 5].map((step) => (
                <div
                  key={step}
                  className={`h-2 flex-1 rounded-full ${
                    step <= currentStep ? 'bg-neon-blue' : 'bg-glass-border'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {/* Step 1: Organization Type */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Organization Type</h3>
                  <p className="text-muted-foreground mb-6">Tell us about your organization</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-foreground">Primary Type</Label>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <Card
                        className={`cursor-pointer transition-all ${
                          typeForm.watch('primaryType') === 'sports'
                            ? 'ring-2 ring-neon-blue bg-neon-blue/10'
                            : 'hover:bg-glass-border/50'
                        }`}
                        onClick={() => {
                          typeForm.setValue('primaryType', 'sports');
                          typeForm.setValue('subcategory', '');
                        }}
                      >
                        <CardContent className="p-4 text-center">
                          <Trophy className="h-8 w-8 mx-auto mb-2 text-neon-blue" />
                          <p className="font-medium text-foreground">Sports</p>
                          <p className="text-xs text-muted-foreground">Teams, clubs, leagues</p>
                        </CardContent>
                      </Card>

                      <Card
                        className={`cursor-pointer transition-all ${
                          typeForm.watch('primaryType') === 'business'
                            ? 'ring-2 ring-neon-blue bg-neon-blue/10'
                            : 'hover:bg-glass-border/50'
                        }`}
                        onClick={() => {
                          typeForm.setValue('primaryType', 'business');
                          typeForm.setValue('subcategory', '');
                        }}
                      >
                        <CardContent className="p-4 text-center">
                          <Briefcase className="h-8 w-8 mx-auto mb-2 text-neon-green" />
                          <p className="font-medium text-foreground">Business</p>
                          <p className="text-xs text-muted-foreground">Companies, corporations</p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {typeForm.watch('primaryType') && (
                    <div>
                      <Label className="text-foreground">Category</Label>
                      <Select
                        value={typeForm.watch('subcategory')}
                        onValueChange={(value) => typeForm.setValue('subcategory', value)}
                      >
                        <SelectTrigger className="glass-input mt-2">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent className="glass-panel border-glass-border">
                          {subcategoryOptions[typeForm.watch('primaryType') as keyof typeof subcategoryOptions]?.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {typeForm.formState.errors.subcategory && (
                        <p className="text-destructive text-sm mt-1">
                          {typeForm.formState.errors.subcategory.message}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 2: Basic Information */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Basic Information</h3>
                  <p className="text-muted-foreground mb-6">Organization and contact details</p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label className="text-foreground">Organization Name</Label>
                    <Input
                      {...basicForm.register('organizationName')}
                      placeholder="Enter organization name"
                      className="glass-input mt-2"
                    />
                    {basicForm.formState.errors.organizationName && (
                      <p className="text-destructive text-sm mt-1">
                        {basicForm.formState.errors.organizationName.message}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-foreground">First Name</Label>
                      <Input
                        {...basicForm.register('firstName')}
                        placeholder="First name"
                        className="glass-input mt-2"
                      />
                      {basicForm.formState.errors.firstName && (
                        <p className="text-destructive text-sm mt-1">
                          {basicForm.formState.errors.firstName.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label className="text-foreground">Last Name</Label>
                      <Input
                        {...basicForm.register('lastName')}
                        placeholder="Last name"
                        className="glass-input mt-2"
                      />
                      {basicForm.formState.errors.lastName && (
                        <p className="text-destructive text-sm mt-1">
                          {basicForm.formState.errors.lastName.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label className="text-foreground">Email Address</Label>
                    <Input
                      {...basicForm.register('email')}
                      type="email"
                      placeholder="email@example.com"
                      className="glass-input mt-2"
                    />
                    {basicForm.formState.errors.email && (
                      <p className="text-destructive text-sm mt-1">
                        {basicForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-foreground">Phone Number</Label>
                      <Input
                        {...basicForm.register('phone')}
                        placeholder="(555) 123-4567"
                        className="glass-input mt-2"
                      />
                      {basicForm.formState.errors.phone && (
                        <p className="text-destructive text-sm mt-1">
                          {basicForm.formState.errors.phone.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label className="text-foreground">Website (Optional)</Label>
                      <Input
                        {...basicForm.register('website')}
                        placeholder="https://example.com"
                        className="glass-input mt-2"
                      />
                      {basicForm.formState.errors.website && (
                        <p className="text-destructive text-sm mt-1">
                          {basicForm.formState.errors.website.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Address Information */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Address Information</h3>
                  <p className="text-muted-foreground mb-6">Where is your organization located?</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-foreground">Street Address</Label>
                    <Input
                      {...addressForm.register('street')}
                      placeholder="123 Main Street"
                      className="glass-input mt-2"
                    />
                    {addressForm.formState.errors.street && (
                      <p className="text-destructive text-sm mt-1">
                        {addressForm.formState.errors.street.message}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-foreground">City</Label>
                      <Input
                        {...addressForm.register('city')}
                        placeholder="City"
                        className="glass-input mt-2"
                      />
                      {addressForm.formState.errors.city && (
                        <p className="text-destructive text-sm mt-1">
                          {addressForm.formState.errors.city.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label className="text-foreground">State</Label>
                      <Input
                        {...addressForm.register('state')}
                        placeholder="State"
                        className="glass-input mt-2"
                      />
                      {addressForm.formState.errors.state && (
                        <p className="text-destructive text-sm mt-1">
                          {addressForm.formState.errors.state.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-foreground">ZIP Code</Label>
                      <Input
                        {...addressForm.register('zipCode')}
                        placeholder="12345"
                        className="glass-input mt-2"
                      />
                      {addressForm.formState.errors.zipCode && (
                        <p className="text-destructive text-sm mt-1">
                          {addressForm.formState.errors.zipCode.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label className="text-foreground">Country</Label>
                      <Select
                        value={addressForm.watch('country')}
                        onValueChange={(value) => addressForm.setValue('country', value)}
                      >
                        <SelectTrigger className="glass-input mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="glass-panel border-glass-border">
                          <SelectItem value="United States">United States</SelectItem>
                          <SelectItem value="Canada">Canada</SelectItem>
                          <SelectItem value="Mexico">Mexico</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 4: Additional Information */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Additional Details</h3>
                  <p className="text-muted-foreground mb-6">Help us serve you better (optional)</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-foreground">Team Size</Label>
                    <Select
                      value={additionalForm.watch('teamSize')}
                      onValueChange={(value) => additionalForm.setValue('teamSize', value)}
                    >
                      <SelectTrigger className="glass-input mt-2">
                        <SelectValue placeholder="Select team size" />
                      </SelectTrigger>
                      <SelectContent className="glass-panel border-glass-border">
                        <SelectItem value="1-10">1-10 members</SelectItem>
                        <SelectItem value="11-25">11-25 members</SelectItem>
                        <SelectItem value="26-50">26-50 members</SelectItem>
                        <SelectItem value="51-100">51-100 members</SelectItem>
                        <SelectItem value="100+">100+ members</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-foreground">Season Length</Label>
                    <Select
                      value={additionalForm.watch('seasonLength')}
                      onValueChange={(value) => additionalForm.setValue('seasonLength', value)}
                    >
                      <SelectTrigger className="glass-input mt-2">
                        <SelectValue placeholder="Select season length" />
                      </SelectTrigger>
                      <SelectContent className="glass-panel border-glass-border">
                        <SelectItem value="year-round">Year Round</SelectItem>
                        <SelectItem value="fall">Fall</SelectItem>
                        <SelectItem value="winter">Winter</SelectItem>
                        <SelectItem value="spring">Spring</SelectItem>
                        <SelectItem value="summer">Summer</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-foreground">Budget Range</Label>
                    <Select
                      value={additionalForm.watch('budget')}
                      onValueChange={(value) => additionalForm.setValue('budget', value)}
                    >
                      <SelectTrigger className="glass-input mt-2">
                        <SelectValue placeholder="Select budget range" />
                      </SelectTrigger>
                      <SelectContent className="glass-panel border-glass-border">
                        <SelectItem value="under-1000">Under $1,000</SelectItem>
                        <SelectItem value="1000-5000">$1,000 - $5,000</SelectItem>
                        <SelectItem value="5000-10000">$5,000 - $10,000</SelectItem>
                        <SelectItem value="10000-25000">$10,000 - $25,000</SelectItem>
                        <SelectItem value="25000+">$25,000+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-foreground">Timeline</Label>
                    <Select
                      value={additionalForm.watch('timeline')}
                      onValueChange={(value) => additionalForm.setValue('timeline', value)}
                    >
                      <SelectTrigger className="glass-input mt-2">
                        <SelectValue placeholder="Select timeline" />
                      </SelectTrigger>
                      <SelectContent className="glass-panel border-glass-border">
                        <SelectItem value="urgent">ASAP (Rush)</SelectItem>
                        <SelectItem value="1-2-weeks">1-2 weeks</SelectItem>
                        <SelectItem value="3-4-weeks">3-4 weeks</SelectItem>
                        <SelectItem value="1-2-months">1-2 months</SelectItem>
                        <SelectItem value="flexible">Flexible</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-foreground">Special Requirements</Label>
                  <Textarea
                    {...additionalForm.register('specialRequirements')}
                    placeholder="Any special requirements, preferences, or notes..."
                    className="glass-input mt-2"
                    rows={3}
                  />
                </div>
              </motion.div>
            )}

            {/* Step 5: Logo Upload */}
            {currentStep === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Organization Logo</h3>
                  <p className="text-muted-foreground mb-6">Upload your organization's logo (optional)</p>
                </div>

                <div className="space-y-4">
                  {logoPreview ? (
                    <div className="flex items-center space-x-4 p-4 glass-panel border border-glass-border rounded-lg">
                      <div className="relative">
                        <img 
                          src={logoPreview} 
                          alt="Logo preview" 
                          className="w-16 h-16 object-contain rounded-lg border border-glass-border bg-white/5"
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
                  ) : (
                    <div className="border-2 border-dashed border-glass-border rounded-lg p-8 text-center">
                      <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-foreground font-medium mb-2">Upload Organization Logo</p>
                      <p className="text-muted-foreground text-sm mb-4">
                        PNG, JPG, GIF up to 5MB
                      </p>
                      <div className="flex items-center justify-center">
                        <input
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
                              Choose Logo File
                            </span>
                          </Button>
                        </label>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground text-center">
                    This step is optional. You can upload a logo later if needed.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-glass-border flex justify-between">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
            className="glass-button"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>

          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={handleClose}
              className="glass-button"
            >
              Cancel
            </Button>

            {currentStep < 5 ? (
              <Button
                onClick={nextStep}
                className="bg-neon-blue hover:bg-neon-blue/80 text-rich-black font-semibold"
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={createCustomer}
                disabled={isCreating}
                className="bg-neon-green hover:bg-neon-green/80 text-rich-black font-semibold"
              >
                {isCreating ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-rich-black border-t-transparent rounded-full mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Create Organization
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
