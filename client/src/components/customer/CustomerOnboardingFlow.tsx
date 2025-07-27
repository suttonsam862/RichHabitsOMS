import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  Mail
} from 'lucide-react';

// Form validation schemas for each step
const identitySchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
});

const organizationSchema = z.object({
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
});

const contactSchema = z.object({
  phone: z.string().optional(),
  alternatePhone: z.string().optional(),
  preferredContact: z.enum(['email', 'phone', 'both']).default('email'),
});

const addressSchema = z.object({
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().default('United States'),
});

const preferencesSchema = z.object({
  interests: z.array(z.string()).default([]),
  communicationFrequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly']).default('monthly'),
  notes: z.string().optional(),
});

type OnboardingData = z.infer<typeof identitySchema> & 
  z.infer<typeof organizationSchema> & 
  z.infer<typeof contactSchema> & 
  z.infer<typeof addressSchema> & 
  z.infer<typeof preferencesSchema>;

interface CustomerOnboardingFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const steps = [
  {
    id: 'identity',
    title: 'Personal Identity',
    subtitle: 'Let\'s start with the basics',
    icon: User,
    schema: identitySchema,
  },
  {
    id: 'organization',
    title: 'Organization Details',
    subtitle: 'Professional information',
    icon: Building2,
    schema: organizationSchema,
  },
  {
    id: 'contact',
    title: 'Contact Preferences',
    subtitle: 'How to reach out',
    icon: Phone,
    schema: contactSchema,
  },
  {
    id: 'address',
    title: 'Location Information',
    subtitle: 'Physical address details',
    icon: MapPin,
    schema: addressSchema,
  },
  {
    id: 'preferences',
    title: 'Preferences & Goals',
    subtitle: 'Customize the experience',
    icon: Target,
    schema: preferencesSchema,
  },
];

const interestOptions = [
  'Custom Apparel', 'Team Uniforms', 'Corporate Branding',
  'Event Merchandise', 'Athletic Wear', 'Promotional Items',
  'Embroidery', 'Screen Printing', 'Design Services'
];

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 1000 : -1000,
    opacity: 0,
    scale: 0.8,
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 1000 : -1000,
    opacity: 0,
    scale: 0.8,
  }),
};

export default function CustomerOnboardingFlow({ isOpen, onClose, onSuccess }: CustomerOnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [formData, setFormData] = useState<Partial<OnboardingData>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const currentStepData = steps[currentStep];
  
  const form = useForm({
    resolver: zodResolver(currentStepData.schema),
    defaultValues: formData,
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (data: OnboardingData) => {
      const response = await apiRequest('POST', '/api/customers', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Customer Created Successfully',
        description: 'The new customer has been added to your system.',
      });
      queryClient.invalidateQueries({ queryKey: ['admin', 'customers'] });
      onSuccess?.();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Error Creating Customer',
        description: error.message || 'Failed to create customer',
        variant: 'destructive',
      });
    },
  });

  const nextStep = async () => {
    const isValid = await form.trigger();
    if (!isValid) return;

    const stepData = form.getValues();
    setFormData(prev => ({ ...prev, ...stepData }));

    if (currentStep < steps.length - 1) {
      setDirection(1);
      setCurrentStep(prev => prev + 1);
    } else {
      // Final step - create customer
      const finalData = { ...formData, ...stepData } as OnboardingData;
      createCustomerMutation.mutate(finalData);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(prev => prev - 1);
    }
  };

  const toggleInterest = (interest: string) => {
    const currentInterests = form.getValues('interests') || [];
    const newInterests = currentInterests.includes(interest)
      ? currentInterests.filter(i => i !== interest)
      : [...currentInterests, interest];
    form.setValue('interests', newInterests);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-2xl glass-panel rounded-2xl shadow-2xl overflow-hidden border border-glass-border"
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
        <div className="relative h-80 sm:h-96 overflow-hidden">
          <AnimatePresence initial={false} custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: 'spring', stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
                scale: { duration: 0.2 },
              }}
              className="absolute inset-0 p-4 sm:p-6"
            >
              <Card className="h-full border-0 shadow-none bg-transparent">
                <CardContent className="p-0 h-full flex flex-col">
                  {/* Step Content */}
                  <div className="flex-1 space-y-3 sm:space-y-4">
                    {currentStep === 0 && (
                      <div className="space-y-3 sm:space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          <div>
                            <Label htmlFor="firstName" className="text-sm font-medium text-white">
                              First Name *
                            </Label>
                            <Input
                              id="firstName"
                              {...form.register('firstName')}
                              className="mt-1 glass-input text-white placeholder:text-white/50"
                              placeholder="Enter first name"
                            />
                            {form.formState.errors.firstName && (
                              <p className="text-sm text-red-400 mt-1">
                                {form.formState.errors.firstName.message}
                              </p>
                            )}
                          </div>
                          <div>
                            <Label htmlFor="lastName" className="text-sm font-medium text-white">
                              Last Name *
                            </Label>
                            <Input
                              id="lastName"
                              {...form.register('lastName')}
                              className="mt-1 glass-input text-white placeholder:text-white/50"
                              placeholder="Enter last name"
                            />
                            {form.formState.errors.lastName && (
                              <p className="text-sm text-red-400 mt-1">
                                {form.formState.errors.lastName.message}
                              </p>
                            )}
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="email" className="text-sm font-medium text-white">
                            Email Address *
                          </Label>
                          <Input
                            id="email"
                            type="email"
                            {...form.register('email')}
                            className="mt-1 glass-input text-white placeholder:text-white/50"
                            placeholder="Enter email address"
                          />
                          {form.formState.errors.email && (
                            <p className="text-sm text-red-400 mt-1">
                              {form.formState.errors.email.message}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {currentStep === 1 && (
                      <div className="space-y-3 sm:space-y-4">
                        <div>
                          <Label htmlFor="company" className="text-sm font-medium text-white">
                            Company/Organization
                          </Label>
                          <Input
                            id="company"
                            {...form.register('company')}
                            className="mt-1 glass-input text-white placeholder:text-white/50"
                            placeholder="Enter company name"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          <div>
                            <Label htmlFor="jobTitle" className="text-sm font-medium text-white">
                              Job Title
                            </Label>
                            <Input
                              id="jobTitle"
                              {...form.register('jobTitle')}
                              className="mt-1 glass-input text-white placeholder:text-white/50"
                              placeholder="Enter job title"
                            />
                          </div>
                          <div>
                            <Label htmlFor="department" className="text-sm font-medium text-white">
                              Department
                            </Label>
                            <Input
                              id="department"
                              {...form.register('department')}
                              className="mt-1 glass-input text-white placeholder:text-white/50"
                              placeholder="Enter department"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {currentStep === 2 && (
                      <div className="space-y-3 sm:space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          <div>
                            <Label htmlFor="phone" className="text-sm font-medium text-white">
                              Primary Phone
                            </Label>
                            <Input
                              id="phone"
                              {...form.register('phone')}
                              className="mt-1 glass-input text-white placeholder:text-white/50"
                              placeholder="(555) 123-4567"
                            />
                          </div>
                          <div>
                            <Label htmlFor="alternatePhone" className="text-sm font-medium text-white">
                              Alternate Phone
                            </Label>
                            <Input
                              id="alternatePhone"
                              {...form.register('alternatePhone')}
                              className="mt-1 glass-input text-white placeholder:text-white/50"
                              placeholder="(555) 987-6543"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-white">Preferred Contact Method</Label>
                          <div className="flex flex-wrap gap-3 mt-2">
                            {['email', 'phone', 'both'].map((method) => (
                              <label key={method} className="flex items-center space-x-2 cursor-pointer glass-panel p-2 rounded-lg">
                                <input
                                  type="radio"
                                  value={method}
                                  {...form.register('preferredContact')}
                                  className="text-neon-blue focus:ring-neon-blue"
                                />
                                <span className="text-sm capitalize text-white">{method}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {currentStep === 3 && (
                      <div className="space-y-3 sm:space-y-4">
                        <div>
                          <Label htmlFor="address" className="text-sm font-medium text-white">
                            Street Address
                          </Label>
                          <Input
                            id="address"
                            {...form.register('address')}
                            className="mt-1 glass-input text-white placeholder:text-white/50"
                            placeholder="Enter street address"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                          <div>
                            <Label htmlFor="city" className="text-sm font-medium text-white">
                              City
                            </Label>
                            <Input
                              id="city"
                              {...form.register('city')}
                              className="mt-1 glass-input text-white placeholder:text-white/50"
                              placeholder="Enter city"
                            />
                          </div>
                          <div>
                            <Label htmlFor="state" className="text-sm font-medium text-white">
                              State
                            </Label>
                            <Input
                              id="state"
                              {...form.register('state')}
                              className="mt-1 glass-input text-white placeholder:text-white/50"
                              placeholder="Enter state"
                            />
                          </div>
                          <div>
                            <Label htmlFor="zip" className="text-sm font-medium text-white">
                              ZIP Code
                            </Label>
                            <Input
                              id="zip"
                              {...form.register('zip')}
                              className="mt-1 glass-input text-white placeholder:text-white/50"
                              placeholder="12345"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {currentStep === 4 && (
                      <div className="space-y-3 sm:space-y-4">
                        <div>
                          <Label className="text-sm font-medium text-white">Areas of Interest</Label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                            {interestOptions.map((interest) => (
                              <Badge
                                key={interest}
                                variant={
                                  form.watch('interests')?.includes(interest) 
                                    ? 'default' 
                                    : 'outline'
                                }
                                className={`cursor-pointer justify-center py-2 text-xs transition-all duration-200 ${
                                  form.watch('interests')?.includes(interest)
                                    ? 'bg-gradient-to-r from-neon-blue to-neon-green text-black border-transparent'
                                    : 'border-glass-border text-white hover:border-neon-blue/50 hover:bg-white/5'
                                }`}
                                onClick={() => toggleInterest(interest)}
                              >
                                {interest}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="communicationFrequency" className="text-sm font-medium text-white">
                            Communication Frequency
                          </Label>
                          <select
                            {...form.register('communicationFrequency')}
                            className="mt-1 block w-full glass-input text-white"
                          >
                            <option value="monthly" className="bg-black text-white">Monthly</option>
                            <option value="weekly" className="bg-black text-white">Weekly</option>
                            <option value="daily" className="bg-black text-white">Daily</option>
                            <option value="quarterly" className="bg-black text-white">Quarterly</option>
                          </select>
                        </div>
                        <div>
                          <Label htmlFor="notes" className="text-sm font-medium text-white">
                            Additional Notes
                          </Label>
                          <Textarea
                            id="notes"
                            {...form.register('notes')}
                            className="mt-1 glass-input text-white placeholder:text-white/50 resize-none"
                            placeholder="Any additional information..."
                            rows={3}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 bg-black/40 border-t border-glass-border flex flex-col sm:flex-row justify-between items-center gap-3">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 0}
            className="flex items-center space-x-2 glass-button border-glass-border text-white hover:bg-white/10 order-2 sm:order-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Previous</span>
          </Button>

          <div className="text-xs sm:text-sm text-white/70 order-1 sm:order-2">
            Step {currentStep + 1} of {steps.length}
          </div>

          <Button
            onClick={nextStep}
            disabled={createCustomerMutation.isPending}
            className="flex items-center space-x-2 bg-gradient-to-r from-neon-blue to-neon-green text-black hover:opacity-90 border-0 order-3"
          >
            {currentStep === steps.length - 1 ? (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>
                  {createCustomerMutation.isPending ? 'Creating...' : 'Complete'}
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