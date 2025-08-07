
import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, UserPlus, Building, ShoppingCart, Upload, Shield, CheckCircle, ArrowLeft, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface InvitationData {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  expires: number;
  timestamp: number;
}

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  completed: boolean;
}

interface FormData {
  // Personal Info
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  title: string;
  
  // Organization Info
  organizationName: string;
  organizationType: string;
  industry: string;
  organizationSize: string;
  website: string;
  address: {
    line1: string;
    line2: string;
    city: string;
    state: string;
    zipCode: string;
  };
  
  // Ordering Preferences
  primaryProductTypes: string[];
  typicalOrderSize: string;
  orderFrequency: string;
  budgetRange: string;
  needsDesignServices: boolean;
  hasExistingDesigns: boolean;
  rushOrdersNeeded: boolean;
  
  // Tax Exemption
  isTaxExempt: boolean;
  taxExemptionNumber: string;
  taxExemptionState: string;
  taxExemptionFile: File | null;
}

const PRODUCT_TYPES = [
  { value: 't-shirts', label: 'T-Shirts' },
  { value: 'hoodies', label: 'Hoodies & Sweatshirts' },
  { value: 'uniforms', label: 'Uniforms' },
  { value: 'promotional-items', label: 'Promotional Items' },
  { value: 'hats-caps', label: 'Hats & Caps' },
  { value: 'polo-shirts', label: 'Polo Shirts' },
  { value: 'jackets', label: 'Jackets' },
  { value: 'accessories', label: 'Accessories' },
];

const ORGANIZATION_TYPES = [
  { value: 'school', label: 'School/Educational Institution' },
  { value: 'sports_team', label: 'Sports Team' },
  { value: 'business', label: 'Business/Corporate' },
  { value: 'non-profit', label: 'Non-Profit Organization' },
  { value: 'government', label: 'Government Agency' },
  { value: 'club', label: 'Club/Group' },
  { value: 'other', label: 'Other' },
];

export default function Register() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);
  const [invitationError, setInvitationError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    title: '',
    organizationName: '',
    organizationType: '',
    industry: '',
    organizationSize: '',
    website: '',
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      zipCode: '',
    },
    primaryProductTypes: [],
    typicalOrderSize: '',
    orderFrequency: '',
    budgetRange: '',
    needsDesignServices: false,
    hasExistingDesigns: false,
    rushOrdersNeeded: false,
    isTaxExempt: false,
    taxExemptionNumber: '',
    taxExemptionState: '',
    taxExemptionFile: null,
  });

  const steps: OnboardingStep[] = [
    {
      id: 1,
      title: "Personal Information",
      description: "Tell us about yourself",
      icon: UserPlus,
      completed: false,
    },
    {
      id: 2,
      title: "Organization Details",
      description: "Information about your organization",
      icon: Building,
      completed: false,
    },
    {
      id: 3,
      title: "Ordering Preferences",
      description: "What do you typically order?",
      icon: ShoppingCart,
      completed: false,
    },
    {
      id: 4,
      title: "Tax Exemption",
      description: "Upload tax exemption certificate",
      icon: Shield,
      completed: false,
    },
    {
      id: 5,
      title: "Verification",
      description: "Review and confirm your information",
      icon: CheckCircle,
      completed: false,
    },
  ];

  // Process invitation token
  useEffect(() => {
    const searchParams = new URLSearchParams(search);
    const inviteToken = searchParams.get('invite');
    if (inviteToken) {
      fetch(`/api/invitations/verify/${inviteToken}`)
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            setInvitationData({
              email: data.invitation.email,
              firstName: data.invitation.firstName,
              lastName: data.invitation.lastName,
              role: data.invitation.role,
              expires: new Date(data.invitation.expiresAt).getTime(),
              timestamp: Date.now(),
            } as InvitationData);
            
            // Pre-fill form with invitation data
            setFormData(prev => ({
              ...prev,
              email: data.invitation.email,
              firstName: data.invitation.firstName,
              lastName: data.invitation.lastName,
            }));
          } else {
            setInvitationError(data.message || 'Invalid invitation link.');
          }
        })
        .catch(error => {
          console.error('Error verifying invitation:', error);
          setInvitationError('Failed to verify invitation. Please check your connection and try again.');
        });
    }
  }, [search]);

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && user) {
      setLocation("/dashboard");
    }
  }, [loading, setLocation, user]);

  const updateFormData = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof typeof prev] as any),
          [child]: value,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const handleNext = async () => {
    setIsSubmitting(true);
    
    try {
      // Validate current step
      if (currentStep === 1 && (!formData.firstName || !formData.lastName || !formData.email)) {
        toast({
          variant: "destructive",
          title: "Missing Information",
          description: "Please fill in all required fields.",
        });
        return;
      }

      // Save step data to backend
      const stepData = getCurrentStepData();
      await fetch('/api/invitations/onboarding/step', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: new URLSearchParams(search).get('invite'),
          stepData,
          stepNumber: currentStep,
        }),
      });

      if (currentStep < steps.length) {
        setCurrentStep(currentStep + 1);
      } else {
        // Complete registration
        await completeRegistration();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save step data. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCurrentStepData = () => {
    switch (currentStep) {
      case 1:
        return {
          stepType: 'personal_info',
          personalData: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            phone: formData.phone,
            title: formData.title,
          },
        };
      case 2:
        return {
          stepType: 'organization_info',
          organizationData: {
            name: formData.organizationName,
            type: formData.organizationType,
            industry: formData.industry,
            size: formData.organizationSize,
            website: formData.website,
            address_line1: formData.address.line1,
            address_line2: formData.address.line2,
            city: formData.address.city,
            state: formData.address.state,
            zip_code: formData.address.zipCode,
          },
        };
      case 3:
        return {
          stepType: 'ordering_preferences',
          preferencesData: {
            primary_product_types: formData.primaryProductTypes,
            typical_order_size: formData.typicalOrderSize,
            typical_order_frequency: formData.orderFrequency,
            budget_range: formData.budgetRange,
            needs_design_services: formData.needsDesignServices,
            has_existing_designs: formData.hasExistingDesigns,
            rush_orders_needed: formData.rushOrdersNeeded,
          },
        };
      case 4:
        return {
          stepType: 'tax_exemption',
          taxData: {
            isTaxExempt: formData.isTaxExempt,
            taxExemptionNumber: formData.taxExemptionNumber,
            taxExemptionState: formData.taxExemptionState,
          },
        };
      default:
        return {};
    }
  };

  const completeRegistration = async () => {
    // Final registration logic here
    toast({
      title: "Registration Complete!",
      description: "Welcome to ThreadCraft. Your account is being set up.",
    });
    
    setLocation('/dashboard');
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => updateFormData('firstName', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => updateFormData('lastName', e.target.value)}
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => updateFormData('email', e.target.value)}
                required
                disabled={!!invitationData}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => updateFormData('phone', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="title">Job Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => updateFormData('title', e.target.value)}
                placeholder="e.g., Athletic Director, Marketing Manager"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="organizationName">Organization Name *</Label>
              <Input
                id="organizationName"
                value={formData.organizationName}
                onChange={(e) => updateFormData('organizationName', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="organizationType">Organization Type *</Label>
              <Select value={formData.organizationType} onValueChange={(value) => updateFormData('organizationType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select organization type" />
                </SelectTrigger>
                <SelectContent>
                  {ORGANIZATION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  value={formData.industry}
                  onChange={(e) => updateFormData('industry', e.target.value)}
                  placeholder="e.g., Education, Healthcare"
                />
              </div>
              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => updateFormData('website', e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>
            <div>
              <Label htmlFor="address.line1">Address</Label>
              <Input
                id="address.line1"
                value={formData.address.line1}
                onChange={(e) => updateFormData('address.line1', e.target.value)}
                placeholder="Street address"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="address.city">City</Label>
                <Input
                  id="address.city"
                  value={formData.address.city}
                  onChange={(e) => updateFormData('address.city', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="address.state">State</Label>
                <Input
                  id="address.state"
                  value={formData.address.state}
                  onChange={(e) => updateFormData('address.state', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="address.zipCode">ZIP Code</Label>
                <Input
                  id="address.zipCode"
                  value={formData.address.zipCode}
                  onChange={(e) => updateFormData('address.zipCode', e.target.value)}
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <Label>What products do you typically order? *</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                {PRODUCT_TYPES.map((product) => (
                  <div key={product.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={product.value}
                      checked={formData.primaryProductTypes.includes(product.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          updateFormData('primaryProductTypes', [...formData.primaryProductTypes, product.value]);
                        } else {
                          updateFormData('primaryProductTypes', formData.primaryProductTypes.filter(type => type !== product.value));
                        }
                      }}
                    />
                    <Label htmlFor={product.value} className="text-sm">
                      {product.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Typical Order Size</Label>
                <Select value={formData.typicalOrderSize} onValueChange={(value) => updateFormData('typicalOrderSize', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select order size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small_1-50">Small (1-50 items)</SelectItem>
                    <SelectItem value="medium_51-200">Medium (51-200 items)</SelectItem>
                    <SelectItem value="large_201-500">Large (201-500 items)</SelectItem>
                    <SelectItem value="bulk_500+">Bulk (500+ items)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Order Frequency</Label>
                <Select value={formData.orderFrequency} onValueChange={(value) => updateFormData('orderFrequency', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="How often do you order?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one-time">One-time order</SelectItem>
                    <SelectItem value="seasonal">Seasonal (few times a year)</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="needsDesignServices"
                  checked={formData.needsDesignServices}
                  onCheckedChange={(checked) => updateFormData('needsDesignServices', checked)}
                />
                <Label htmlFor="needsDesignServices">
                  We need design services
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasExistingDesigns"
                  checked={formData.hasExistingDesigns}
                  onCheckedChange={(checked) => updateFormData('hasExistingDesigns', checked)}
                />
                <Label htmlFor="hasExistingDesigns">
                  We have existing designs/logos
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="rushOrdersNeeded"
                  checked={formData.rushOrdersNeeded}
                  onCheckedChange={(checked) => updateFormData('rushOrdersNeeded', checked)}
                />
                <Label htmlFor="rushOrdersNeeded">
                  We sometimes need rush orders
                </Label>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isTaxExempt"
                checked={formData.isTaxExempt}
                onCheckedChange={(checked) => updateFormData('isTaxExempt', checked)}
              />
              <Label htmlFor="isTaxExempt">
                Our organization is tax exempt
              </Label>
            </div>

            {formData.isTaxExempt && (
              <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="taxExemptionNumber">Tax Exemption Number</Label>
                    <Input
                      id="taxExemptionNumber"
                      value={formData.taxExemptionNumber}
                      onChange={(e) => updateFormData('taxExemptionNumber', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="taxExemptionState">State</Label>
                    <Input
                      id="taxExemptionState"
                      value={formData.taxExemptionState}
                      onChange={(e) => updateFormData('taxExemptionState', e.target.value)}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="taxExemptionFile">Upload Tax Exemption Certificate</Label>
                  <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600">
                        <label
                          htmlFor="taxExemptionFile"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                        >
                          <span>Upload a file</span>
                          <input
                            id="taxExemptionFile"
                            name="taxExemptionFile"
                            type="file"
                            className="sr-only"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                updateFormData('taxExemptionFile', file);
                              }
                            }}
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">PDF, PNG, JPG up to 10MB</p>
                    </div>
                  </div>
                  {formData.taxExemptionFile && (
                    <p className="mt-2 text-sm text-green-600">
                      File selected: {formData.taxExemptionFile.name}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
              <h3 className="mt-4 text-lg font-medium">Review Your Information</h3>
              <p className="text-gray-600">Please review the information below before completing your registration.</p>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p><strong>Name:</strong> {formData.firstName} {formData.lastName}</p>
                  <p><strong>Email:</strong> {formData.email}</p>
                  <p><strong>Phone:</strong> {formData.phone}</p>
                  <p><strong>Title:</strong> {formData.title}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Organization</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p><strong>Organization:</strong> {formData.organizationName}</p>
                  <p><strong>Type:</strong> {ORGANIZATION_TYPES.find(t => t.value === formData.organizationType)?.label}</p>
                  <p><strong>Industry:</strong> {formData.industry}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Ordering Preferences</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p><strong>Products:</strong> {formData.primaryProductTypes.map(type => 
                    PRODUCT_TYPES.find(p => p.value === type)?.label
                  ).join(', ')}</p>
                  <p><strong>Order Size:</strong> {formData.typicalOrderSize}</p>
                  <p><strong>Frequency:</strong> {formData.orderFrequency}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (invitationError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-red-900">Invitation Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-gray-600">{invitationError}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900">Welcome to ThreadCraft</h1>
          {invitationData && (
            <p className="mt-2 text-lg text-gray-600">
              Complete your registration to get started, {invitationData.firstName}!
            </p>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              
              return (
                <div key={step.id} className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isCompleted ? 'bg-green-500 text-white' :
                    isActive ? 'bg-blue-500 text-white' :
                    'bg-gray-300 text-gray-600'
                  }`}>
                    {isCompleted ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <div className="mt-2 text-center">
                    <p className={`text-xs font-medium ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
                      {step.title}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <Progress value={(currentStep / steps.length) * 100} className="h-2" />
        </div>

        {/* Step Content */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{steps[currentStep - 1]?.title}</CardTitle>
            <CardDescription>{steps[currentStep - 1]?.description}</CardDescription>
          </CardHeader>
          <CardContent>
            {renderStepContent()}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
          
          <Button
            onClick={handleNext}
            disabled={isSubmitting}
          >
            {currentStep === steps.length ? 'Complete Registration' : 'Next'}
            {currentStep < steps.length && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
