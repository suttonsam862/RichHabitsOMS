import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  User, 
  Building2, 
  CheckCircle, 
  ArrowLeft, 
  ArrowRight,
  X,
  Factory,
  DollarSign
} from 'lucide-react';

interface ManufacturerOnboardingFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  website: string;
  specialties: string[];
  equipment: string[];
  maxCapacity: string;
  turnaroundTime: string;
  qualityCertifications: string[];
  hourlyRate: string;
  minimumOrder: string;
  rushOrderSurcharge: string;
  paymentTerms: string;
}

const MANUFACTURING_SPECIALTIES = [
  'Screen Printing', 'Embroidery', 'Heat Transfer', 'Sublimation', 'Direct-to-Garment (DTG)',
  'Vinyl Cutting', 'Leather Work', 'Custom Patches', 'Promotional Products', 'Athletic Wear',
  'Corporate Apparel', 'Uniforms', 'Hats & Caps', 'Bags & Accessories', 'Custom Footwear'
];

const EQUIPMENT_TYPES = [
  'Screen Printing Press', 'Embroidery Machine', 'Heat Press', 'Vinyl Plotter', 'DTG Printer',
  'Sublimation Printer', 'Industrial Sewing Machine', 'Cutting Table', 'Heat Transfer Press',
  'Laser Engraver', 'Automated Cutter', 'Quality Control Station'
];

const QUALITY_CERTIFICATIONS = [
  'ISO 9001', 'OEKO-TEX Standard 100', 'CPSIA Compliant', 'WRAP Certified',
  'Fair Trade Certified', 'Organic Certified', 'Made in USA', 'Custom Standards'
];

const steps = [
  {
    id: 'personal',
    title: 'Personal Information',
    subtitle: 'Tell us about yourself',
    icon: User,
  },
  {
    id: 'business',
    title: 'Business Details',
    subtitle: 'Your company information',
    icon: Building2,
  },
  {
    id: 'capabilities',
    title: 'Manufacturing Capabilities',
    subtitle: 'What can you produce?',
    icon: Factory,
  },
  {
    id: 'pricing',
    title: 'Pricing & Terms',
    subtitle: 'Your rates and payment preferences',
    icon: DollarSign,
  },
];

export default function ManufacturerOnboardingFlow({ isOpen, onClose, onSuccess }: ManufacturerOnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    website: '',
    specialties: [],
    equipment: [],
    maxCapacity: '',
    turnaroundTime: '',
    qualityCertifications: [],
    hourlyRate: '',
    minimumOrder: '',
    rushOrderSurcharge: '',
    paymentTerms: 'net_30',
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const currentStepData = steps[currentStep];

  const createManufacturerMutation = useMutation({
    mutationFn: async (manufacturerData: any) => {
      console.log('Creating manufacturer with data:', manufacturerData);
      return apiRequest('POST', '/api/manufacturing/manufacturers', manufacturerData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/manufacturers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/manufacturing/manufacturers'] });
      toast({
        title: 'Success!',
        description: 'Manufacturer has been added successfully',
      });
      onClose();
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      console.error('Error creating manufacturer:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create manufacturer',
        variant: 'destructive',
      });
    },
  });

  const nextStep = () => {
    if (currentStep === steps.length - 1) {
      // Final step - submit all data
      const finalData = {
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: 'manufacturer',
        company: formData.company,
        phone: formData.phone,
        specialties: formData.specialties.join(', '),
      };
      createManufacturerMutation.mutate(finalData);
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: // Personal info
        return formData.firstName && formData.lastName && formData.email;
      case 1: // Business info
        return formData.company;
      case 2: // Capabilities
        return formData.specialties.length > 0;
      case 3: // Pricing
        return true; // Optional fields
      default:
        return false;
    }
  };

  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const renderStepContent = () => {
    switch (currentStepData.id) {
      case 'personal':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  value={formData.firstName}
                  onChange={(e) => updateFormData('firstName', e.target.value)}
                  placeholder="John"
                  className="bg-rich-black/20 border-glass-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  value={formData.lastName}
                  onChange={(e) => updateFormData('lastName', e.target.value)}
                  placeholder="Smith"
                  className="bg-rich-black/20 border-glass-border"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                value={formData.email}
                onChange={(e) => updateFormData('email', e.target.value)}
                type="email"
                placeholder="john@company.com"
                className="bg-rich-black/20 border-glass-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => updateFormData('phone', e.target.value)}
                placeholder="(555) 123-4567"
                className="bg-rich-black/20 border-glass-border"
              />
            </div>
          </div>
        );

      case 'business':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company">Company Name *</Label>
              <Input
                value={formData.company}
                onChange={(e) => updateFormData('company', e.target.value)}
                placeholder="ABC Manufacturing"
                className="bg-rich-black/20 border-glass-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                value={formData.address}
                onChange={(e) => updateFormData('address', e.target.value)}
                placeholder="123 Manufacturing St"
                className="bg-rich-black/20 border-glass-border"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => updateFormData('city', e.target.value)}
                  placeholder="Manufacturing City"
                  className="bg-rich-black/20 border-glass-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  value={formData.state}
                  onChange={(e) => updateFormData('state', e.target.value)}
                  placeholder="CA"
                  className="bg-rich-black/20 border-glass-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip">ZIP Code</Label>
                <Input
                  value={formData.zip}
                  onChange={(e) => updateFormData('zip', e.target.value)}
                  placeholder="12345"
                  className="bg-rich-black/20 border-glass-border"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                value={formData.website}
                onChange={(e) => updateFormData('website', e.target.value)}
                placeholder="https://company.com"
                className="bg-rich-black/20 border-glass-border"
              />
            </div>
          </div>
        );

      case 'capabilities':
        return (
          <div className="space-y-6">
            <div className="space-y-3">
              <Label className="text-base font-medium">Manufacturing Specialties *</Label>
              <p className="text-sm text-muted-foreground">Select all that apply</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {MANUFACTURING_SPECIALTIES.map((specialty) => (
                  <div key={specialty} className="flex items-center space-x-2">
                    <Checkbox
                      id={specialty}
                      checked={formData.specialties.includes(specialty)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          updateFormData('specialties', [...formData.specialties, specialty]);
                        } else {
                          updateFormData('specialties', formData.specialties.filter(s => s !== specialty));
                        }
                      }}
                    />
                    <Label htmlFor={specialty} className="text-sm">{specialty}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-medium">Available Equipment</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {EQUIPMENT_TYPES.map((equipment) => (
                  <div key={equipment} className="flex items-center space-x-2">
                    <Checkbox
                      id={equipment}
                      checked={formData.equipment.includes(equipment)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          updateFormData('equipment', [...formData.equipment, equipment]);
                        } else {
                          updateFormData('equipment', formData.equipment.filter(e => e !== equipment));
                        }
                      }}
                    />
                    <Label htmlFor={equipment} className="text-sm">{equipment}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxCapacity">Maximum Weekly Capacity</Label>
                <Input
                  value={formData.maxCapacity}
                  onChange={(e) => updateFormData('maxCapacity', e.target.value)}
                  placeholder="500 units"
                  className="bg-rich-black/20 border-glass-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="turnaroundTime">Typical Turnaround Time</Label>
                <Input
                  value={formData.turnaroundTime}
                  onChange={(e) => updateFormData('turnaroundTime', e.target.value)}
                  placeholder="5-7 business days"
                  className="bg-rich-black/20 border-glass-border"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-medium">Quality Certifications</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {QUALITY_CERTIFICATIONS.map((cert) => (
                  <div key={cert} className="flex items-center space-x-2">
                    <Checkbox
                      id={cert}
                      checked={formData.qualityCertifications.includes(cert)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          updateFormData('qualityCertifications', [...formData.qualityCertifications, cert]);
                        } else {
                          updateFormData('qualityCertifications', formData.qualityCertifications.filter(c => c !== cert));
                        }
                      }}
                    />
                    <Label htmlFor={cert} className="text-sm">{cert}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'pricing':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
                <Input
                  value={formData.hourlyRate}
                  onChange={(e) => updateFormData('hourlyRate', e.target.value)}
                  placeholder="25.00"
                  className="bg-rich-black/20 border-glass-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minimumOrder">Minimum Order ($)</Label>
                <Input
                  value={formData.minimumOrder}
                  onChange={(e) => updateFormData('minimumOrder', e.target.value)}
                  placeholder="100.00"
                  className="bg-rich-black/20 border-glass-border"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rushOrderSurcharge">Rush Order Surcharge (%)</Label>
              <Input
                value={formData.rushOrderSurcharge}
                onChange={(e) => updateFormData('rushOrderSurcharge', e.target.value)}
                placeholder="25"
                className="bg-rich-black/20 border-glass-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentTerms">Payment Terms</Label>
              <Select value={formData.paymentTerms} onValueChange={(value) => updateFormData('paymentTerms', value)}>
                <SelectTrigger className="bg-rich-black/20 border-glass-border">
                  <SelectValue placeholder="Select payment terms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prepaid">Prepaid</SelectItem>
                  <SelectItem value="cod">Cash on Delivery</SelectItem>
                  <SelectItem value="net_15">Net 15 Days</SelectItem>
                  <SelectItem value="net_30">Net 30 Days</SelectItem>
                  <SelectItem value="net_60">Net 60 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-4xl max-h-[90vh] overflow-hidden"
      >
        <Card className="bg-rich-black/90 backdrop-blur-md border border-glass-border">
          <CardHeader className="border-b border-glass-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-neon-blue/20 border border-neon-blue/30">
                  <Factory className="w-6 h-6 text-neon-blue" />
                </div>
                <div>
                  <CardTitle className="text-neon-blue text-xl">
                    Add New Manufacturer
                  </CardTitle>
                  <p className="text-muted-foreground text-sm">
                    Step {currentStep + 1} of {steps.length}: {currentStepData.title}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-muted-foreground hover:text-white"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Progress Bar */}
            <div className="flex space-x-2 mt-4">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex-1 h-2 rounded-full ${
                    index <= currentStep ? 'bg-neon-blue' : 'bg-glass-border'
                  }`}
                />
              ))}
            </div>
          </CardHeader>

          <CardContent className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            <div className="mb-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-3 rounded-full bg-gradient-to-r from-neon-blue/20 to-neon-green/20 border border-glass-border">
                  <currentStepData.icon className="w-6 h-6 text-neon-blue" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground">
                    {currentStepData.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {currentStepData.subtitle}
                  </p>
                </div>
              </div>
            </div>

            <form className="space-y-6">
              {renderStepContent()}
            </form>
          </CardContent>

          <div className="p-6 border-t border-glass-border">
            <div className="flex justify-between items-center">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 0}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Previous</span>
              </Button>

              <Button
                onClick={nextStep}
                disabled={!canProceed() || createManufacturerMutation.isPending}
                className="flex items-center space-x-2 bg-gradient-to-r from-neon-blue to-neon-green text-black hover:opacity-90 border-0"
              >
                {currentStep === steps.length - 1 ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>
                      {createManufacturerMutation.isPending ? 'Creating...' : 'Complete Setup'}
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
          </div>
        </Card>
      </motion.div>
    </div>
  );
}