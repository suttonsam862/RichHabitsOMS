
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
  Trash2
} from 'lucide-react';

// Enhanced form validation schemas
const organizationTypeSchema = z.object({
  primaryType: z.enum(['sports', 'business']),
  subcategory: z.string().min(1, 'Subcategory is required'),
});

const contactSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  mobilePhone: z.string().optional(),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
  contactType: z.enum(['primary', 'billing', 'shipping', 'technical', 'general']).default('general'),
  isDecisionMaker: z.boolean().default(false),
  canApproveOrders: z.boolean().default(false),
  preferredContactMethod: z.enum(['email', 'phone', 'mobile']).default('email'),
});

const organizationDetailsSchema = z.object({
  organizationName: z.string().min(1, 'Organization name is required'),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  website: z.string().optional(),
  description: z.string().optional(),
});

const fileUploadsSchema = z.object({
  logoFile: z.any().optional(),
  googleDriveLink: z.string().optional(),
  additionalNotes: z.string().optional(),
});

const salespersonAssignmentSchema = z.object({
  salespersonId: z.string().optional(),
  assignmentNotes: z.string().optional(),
});

type OrganizationTypeData = z.infer<typeof organizationTypeSchema>;
type ContactData = z.infer<typeof contactSchema>;
type OrganizationDetailsData = z.infer<typeof organizationDetailsSchema>;
type FileUploadsData = z.infer<typeof fileUploadsSchema>;
type SalespersonAssignmentData = z.infer<typeof salespersonAssignmentSchema>;

interface CustomerOnboardingFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const SPORT_SUBCATEGORIES = [
  'Football', 'Basketball', 'Baseball', 'Soccer', 'Hockey', 'Tennis', 
  'Golf', 'Swimming', 'Track & Field', 'Wrestling', 'Volleyball', 
  'Softball', 'Cross Country', 'Cheerleading', 'Dance', 'Other Sport'
];

const BUSINESS_SUBCATEGORIES = [
  'Corporate', 'Restaurant/Food Service', 'Healthcare', 'Education',
  'Retail', 'Manufacturing', 'Technology', 'Professional Services',
  'Construction', 'Transportation', 'Non-Profit', 'Government', 'Other Business'
];

const CONTACT_TYPES = [
  { value: 'primary', label: 'Primary Contact', icon: User },
  { value: 'billing', label: 'Billing Contact', icon: Mail },
  { value: 'shipping', label: 'Shipping Contact', icon: MapPin },
  { value: 'technical', label: 'Technical Contact', icon: Target },
  { value: 'general', label: 'General Contact', icon: Users },
];

const steps = [
  {
    id: 'type',
    title: 'Organization Type',
    subtitle: 'What type of organization are you?',
    icon: Building2,
    schema: organizationTypeSchema,
  },
  {
    id: 'contacts',
    title: 'Contact Information',
    subtitle: 'Add your organization contacts',
    icon: Users,
    schema: z.object({}), // Dynamic validation
  },
  {
    id: 'details',
    title: 'Organization Details',
    subtitle: 'Tell us about your organization',
    icon: MapPin,
    schema: organizationDetailsSchema,
  },
  {
    id: 'files',
    title: 'Files & Graphics',
    subtitle: 'Upload logos and graphics',
    icon: Upload,
    schema: fileUploadsSchema,
  },
  {
    id: 'salesperson',
    title: 'Salesperson Assignment',
    subtitle: 'Choose your dedicated representative',
    icon: UserCheck,
    schema: salespersonAssignmentSchema,
  },
];

export default function CustomerOnboardingFlow({ isOpen, onClose, onSuccess }: CustomerOnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [organizationTypeData, setOrganizationTypeData] = useState<Partial<OrganizationTypeData>>({});
  const [contacts, setContacts] = useState<Partial<ContactData>[]>([{}]);
  const [organizationDetailsData, setOrganizationDetailsData] = useState<Partial<OrganizationDetailsData>>({});
  const [fileUploadsData, setFileUploadsData] = useState<Partial<FileUploadsData>>({});
  const [salespersonData, setSalespersonData] = useState<Partial<SalespersonAssignmentData>>({});
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const currentStepData = steps[currentStep];
  
  const form = useForm({
    resolver: zodResolver(currentStepData.schema),
    defaultValues: {},
  });

  // Fetch available salespeople
  const { data: salespeople } = useQuery({
    queryKey: ['salespeople', 'available'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/sales-management/available');
      const data = await response.json();
      return data.data;
    },
    enabled: currentStep === 4,
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (data: any) => {
      // First create the customer
      const customerResponse = await apiRequest('POST', '/api/customers', {
        firstName: contacts[0]?.firstName,
        lastName: contacts[0]?.lastName,
        email: contacts[0]?.email,
        phone: contacts[0]?.phone,
        company: organizationDetailsData.organizationName,
        sport: organizationTypeData.primaryType === 'sports' ? organizationTypeData.subcategory : null,
        organizationType: organizationTypeData.primaryType,
        address: organizationDetailsData.address,
        city: organizationDetailsData.city,
        state: organizationDetailsData.state,
        zip: organizationDetailsData.zip,
      });

      const customerData = await customerResponse.json();
      const customerId = customerData.data.id;

      // Add additional contacts
      if (contacts.length > 1) {
        for (let i = 1; i < contacts.length; i++) {
          const contact = contacts[i];
          if (contact.firstName && contact.lastName) {
            await apiRequest('POST', '/api/customer-contacts', {
              customerId,
              ...contact,
              isPrimary: false,
            });
          }
        }
      }

      // Upload logo if provided
      if (logoFile) {
        try {
          const formData = new FormData();
          formData.append('file', logoFile);
          formData.append('customerId', customerId);
          formData.append('fileType', 'logo');
          formData.append('isPrimary', 'true');

          await apiRequest('POST', '/api/organization-files/upload', formData);
          console.log('✅ Logo uploaded successfully');
        } catch (logoError) {
          console.warn('Logo upload failed, continuing without logo:', logoError);
          // Don't fail the entire customer creation if logo upload fails
        }
      }

      // Save Google Drive link if provided
      if (fileUploadsData.googleDriveLink) {
        await apiRequest('POST', '/api/organization-files', {
          customerId,
          fileName: 'Google Drive Folder',
          fileType: 'graphics',
          googleDriveLink: fileUploadsData.googleDriveLink,
          description: fileUploadsData.additionalNotes,
        });
      }

      // Assign salesperson if selected
      if (salespersonData.salespersonId) {
        await apiRequest('POST', '/api/sales-management/assign-customer', {
          customerId,
          salespersonId: salespersonData.salespersonId,
          assignmentType: 'primary',
          notes: salespersonData.assignmentNotes,
        });
      }

      return customerData;
    },
    onSuccess: () => {
      toast({
        title: 'Organization Created Successfully',
        description: 'Your organization has been set up and is ready to go!',
      });
      queryClient.invalidateQueries({ queryKey: ['admin', 'customers'] });
      onSuccess?.();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Error Creating Organization',
        description: error.message || 'Failed to create organization',
        variant: 'destructive',
      });
    },
  });

  const nextStep = async () => {
    if (currentStep < steps.length - 1) {
      setDirection(1);
      setCurrentStep(prev => prev + 1);
    } else {
      // Final step - create organization
      createCustomerMutation.mutate({});
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(prev => prev - 1);
    }
  };

  const addContact = () => {
    if (contacts.length < 10) {
      setContacts([...contacts, {}]);
    }
  };

  const removeContact = (index: number) => {
    if (contacts.length > 1) {
      const newContacts = contacts.filter((_, i) => i !== index);
      setContacts(newContacts);
    }
  };

  const updateContact = (index: number, field: keyof ContactData, value: any) => {
    const newContacts = [...contacts];
    newContacts[index] = { ...newContacts[index], [field]: value };
    setContacts(newContacts);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return organizationTypeData.primaryType && organizationTypeData.subcategory;
      case 1:
        return contacts[0]?.firstName && contacts[0]?.lastName && contacts[0]?.email;
      case 2:
        return organizationDetailsData.organizationName;
      case 3:
        return true; // Files are optional
      case 4:
        return true; // Salesperson assignment is optional
      default:
        return false;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-start sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-4xl glass-panel rounded-none sm:rounded-2xl shadow-2xl border-0 sm:border border-glass-border min-h-screen sm:min-h-0 sm:max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="relative bg-black/40 border-b border-glass-border p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <motion.div
                key={currentStep}
                initial={{ rotate: -180, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                className="p-2 rounded-full bg-gradient-to-r from-neon-blue to-neon-green"
              >
                <currentStepData.icon className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
              </motion.div>
              <div>
                <h2 className="text-lg sm:text-2xl font-bold text-white">{currentStepData.title}</h2>
                <p className="text-xs sm:text-sm text-white/70">{currentStepData.subtitle}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/10 h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 sm:mt-6 flex space-x-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className="flex-1 h-1 sm:h-2 bg-white/10 rounded-full overflow-hidden"
              >
                <motion.div
                  className="h-full bg-gradient-to-r from-neon-blue to-neon-green"
                  initial={{ width: '0%' }}
                  animate={{ 
                    width: index <= currentStep ? '100%' : '0%' 
                  }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
          <div className="space-y-4 pb-4">
            {/* Step 0: Organization Type */}
            {currentStep === 0 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-white mb-2">What type of organization are you?</h3>
                  <p className="text-white/70">This helps us customize your experience</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Card 
                    className={`cursor-pointer transition-all duration-200 ${
                      organizationTypeData.primaryType === 'sports' 
                        ? 'bg-gradient-to-r from-neon-blue/20 to-neon-green/20 border-neon-blue' 
                        : 'glass-panel border-glass-border hover:border-neon-blue/50'
                    }`}
                    onClick={() => setOrganizationTypeData({ ...organizationTypeData, primaryType: 'sports', subcategory: '' })}
                  >
                    <CardContent className="flex flex-col items-center p-6">
                      <Trophy className="w-12 h-12 text-neon-blue mb-4" />
                      <h4 className="text-lg font-semibold text-white">Sports Organization</h4>
                      <p className="text-white/70 text-center text-sm">Teams, leagues, athletic programs</p>
                    </CardContent>
                  </Card>

                  <Card 
                    className={`cursor-pointer transition-all duration-200 ${
                      organizationTypeData.primaryType === 'business' 
                        ? 'bg-gradient-to-r from-neon-blue/20 to-neon-green/20 border-neon-blue' 
                        : 'glass-panel border-glass-border hover:border-neon-blue/50'
                    }`}
                    onClick={() => setOrganizationTypeData({ ...organizationTypeData, primaryType: 'business', subcategory: '' })}
                  >
                    <CardContent className="flex flex-col items-center p-6">
                      <Briefcase className="w-12 h-12 text-neon-green mb-4" />
                      <h4 className="text-lg font-semibold text-white">Business Organization</h4>
                      <p className="text-white/70 text-center text-sm">Companies, schools, nonprofits</p>
                    </CardContent>
                  </Card>
                </div>

                {organizationTypeData.primaryType && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <Label className="text-white">Select your specific category:</Label>
                    <Select 
                      value={organizationTypeData.subcategory} 
                      onValueChange={(value) => setOrganizationTypeData({ ...organizationTypeData, subcategory: value })}
                    >
                      <SelectTrigger className="glass-input">
                        <SelectValue placeholder="Choose category" />
                      </SelectTrigger>
                      <SelectContent className="glass-panel border-glass-border">
                        {(organizationTypeData.primaryType === 'sports' ? SPORT_SUBCATEGORIES : BUSINESS_SUBCATEGORIES).map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </motion.div>
                )}
              </div>
            )}

            {/* Step 1: Contacts */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-white mb-2">Contact Information</h3>
                  <p className="text-white/70">Add up to 10 contacts for your organization</p>
                </div>

                {contacts.map((contact, index) => {
                  const isComplete = contact.firstName && contact.lastName && contact.email;
                  const showContact = index === 0 || contacts[index - 1]?.firstName;

                  if (!showContact) return null;

                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass-panel p-4 rounded-lg space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-semibold text-white">
                          Contact {index + 1} {index === 0 && '(Primary)'}
                        </h4>
                        {index > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeContact(index)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-white">First Name *</Label>
                          <Input
                            value={contact.firstName || ''}
                            onChange={(e) => updateContact(index, 'firstName', e.target.value)}
                            className="glass-input"
                            placeholder="Enter first name"
                          />
                        </div>
                        <div>
                          <Label className="text-white">Last Name *</Label>
                          <Input
                            value={contact.lastName || ''}
                            onChange={(e) => updateContact(index, 'lastName', e.target.value)}
                            className="glass-input"
                            placeholder="Enter last name"
                          />
                        </div>
                        <div>
                          <Label className="text-white">Email *</Label>
                          <Input
                            type="email"
                            value={contact.email || ''}
                            onChange={(e) => updateContact(index, 'email', e.target.value)}
                            className="glass-input"
                            placeholder="Enter email"
                          />
                        </div>
                        <div>
                          <Label className="text-white">Phone</Label>
                          <Input
                            value={contact.phone || ''}
                            onChange={(e) => updateContact(index, 'phone', e.target.value)}
                            className="glass-input"
                            placeholder="Enter phone"
                          />
                        </div>
                        <div>
                          <Label className="text-white">Job Title</Label>
                          <Input
                            value={contact.jobTitle || ''}
                            onChange={(e) => updateContact(index, 'jobTitle', e.target.value)}
                            className="glass-input"
                            placeholder="Enter job title"
                          />
                        </div>
                        <div>
                          <Label className="text-white">Contact Type</Label>
                          <Select 
                            value={contact.contactType || 'general'} 
                            onValueChange={(value) => updateContact(index, 'contactType', value)}
                          >
                            <SelectTrigger className="glass-input">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="glass-panel border-glass-border">
                              {CONTACT_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}

                {contacts.length < 10 && contacts[contacts.length - 1]?.firstName && (
                  <Button
                    variant="outline"
                    onClick={addContact}
                    className="w-full glass-button border-glass-border text-white hover:bg-white/10"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Another Contact
                  </Button>
                )}
              </div>
            )}

            {/* Step 2: Organization Details */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div>
                  <Label className="text-white">Organization Name *</Label>
                  <Input
                    value={organizationDetailsData.organizationName || ''}
                    onChange={(e) => setOrganizationDetailsData({ ...organizationDetailsData, organizationName: e.target.value })}
                    className="glass-input"
                    placeholder="Enter organization name"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white">Address</Label>
                    <Input
                      value={organizationDetailsData.address || ''}
                      onChange={(e) => setOrganizationDetailsData({ ...organizationDetailsData, address: e.target.value })}
                      className="glass-input"
                      placeholder="Street address"
                    />
                  </div>
                  <div>
                    <Label className="text-white">City</Label>
                    <Input
                      value={organizationDetailsData.city || ''}
                      onChange={(e) => setOrganizationDetailsData({ ...organizationDetailsData, city: e.target.value })}
                      className="glass-input"
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <Label className="text-white">State</Label>
                    <Input
                      value={organizationDetailsData.state || ''}
                      onChange={(e) => setOrganizationDetailsData({ ...organizationDetailsData, state: e.target.value })}
                      className="glass-input"
                      placeholder="State"
                    />
                  </div>
                  <div>
                    <Label className="text-white">ZIP Code</Label>
                    <Input
                      value={organizationDetailsData.zip || ''}
                      onChange={(e) => setOrganizationDetailsData({ ...organizationDetailsData, zip: e.target.value })}
                      className="glass-input"
                      placeholder="ZIP code"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-white">Website</Label>
                  <Input
                    value={organizationDetailsData.website || ''}
                    onChange={(e) => setOrganizationDetailsData({ ...organizationDetailsData, website: e.target.value })}
                    className="glass-input"
                    placeholder="https://example.com"
                  />
                </div>

                <div>
                  <Label className="text-white">Description</Label>
                  <Textarea
                    value={organizationDetailsData.description || ''}
                    onChange={(e) => setOrganizationDetailsData({ ...organizationDetailsData, description: e.target.value })}
                    className="glass-input resize-none"
                    placeholder="Tell us about your organization..."
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Step 3: File Uploads */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <Label className="text-white">Primary Logo Upload</Label>
                  <div className="mt-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          // Validate file size (5MB limit)
                          if (file.size > 5 * 1024 * 1024) {
                            toast({
                              title: "File too large",
                              description: "Logo file must be smaller than 5MB. Please compress or choose a smaller image.",
                              variant: "destructive",
                            });
                            e.target.value = ''; // Clear the input
                            return;
                          }
                          setLogoFile(file);
                        }
                      }}
                      className="w-full glass-input file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-neon-blue file:text-black hover:file:bg-neon-blue/80"
                    />
                    <p className="text-xs text-gray-300 mt-1">Maximum file size: 5MB</p>
                  </div>
                </div>

                <div>
                  <Label className="text-white">Google Drive Link</Label>
                  <Input
                    value={fileUploadsData.googleDriveLink || ''}
                    onChange={(e) => setFileUploadsData({ ...fileUploadsData, googleDriveLink: e.target.value })}
                    className="glass-input"
                    placeholder="Share link to Google Drive folder with graphics"
                  />
                </div>

                <div>
                  <Label className="text-white">Additional Notes</Label>
                  <Textarea
                    value={fileUploadsData.additionalNotes || ''}
                    onChange={(e) => setFileUploadsData({ ...fileUploadsData, additionalNotes: e.target.value })}
                    className="glass-input resize-none"
                    placeholder="Any additional information about your graphics or brand guidelines..."
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Step 4: Salesperson Assignment */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-white mb-2">Choose Your Sales Representative</h3>
                  <p className="text-white/70">Select a dedicated representative to help with your orders</p>
                </div>

                {salespeople && salespeople.length > 0 && (
                  <div>
                    <Label className="text-white">Sales Representative</Label>
                    <Select 
                      value={salespersonData.salespersonId || ''} 
                      onValueChange={(value) => setSalespersonData({ ...salespersonData, salespersonId: value })}
                    >
                      <SelectTrigger className="glass-input">
                        <SelectValue placeholder="Choose a sales representative" />
                      </SelectTrigger>
                      <SelectContent className="glass-panel border-glass-border">
                        {salespeople.map((salesperson: any) => (
                          <SelectItem key={salesperson.id} value={salesperson.id}>
                            {salesperson.first_name} {salesperson.last_name} - {salesperson.employee_id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label className="text-white">Assignment Notes</Label>
                  <Textarea
                    value={salespersonData.assignmentNotes || ''}
                    onChange={(e) => setSalespersonData({ ...salespersonData, assignmentNotes: e.target.value })}
                    className="glass-input resize-none"
                    placeholder="Any specific notes about your account or preferences..."
                    rows={3}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 bg-black/40 border-t border-glass-border flex flex-col sm:flex-row justify-between items-center gap-3 flex-shrink-0">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 0}
            className="flex items-center space-x-2 glass-button border-glass-border text-white hover:bg-white/10 order-2 sm:order-1 w-full sm:w-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Previous</span>
          </Button>

          <div className="text-xs sm:text-sm text-white/70 order-1 sm:order-2">
            Step {currentStep + 1} of {steps.length}
          </div>

          <Button
            onClick={nextStep}
            disabled={!canProceed() || createCustomerMutation.isPending}
            className="flex items-center space-x-2 bg-gradient-to-r from-neon-blue to-neon-green text-black hover:opacity-90 border-0 order-3 w-full sm:w-auto"
          >
            {currentStep === steps.length - 1 ? (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>
                  {createCustomerMutation.isPending ? 'Creating...' : 'Complete Setup'}
                </span>
              </>
            ) : (
              <>
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
