
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { useToast } from '../hooks/use-toast';
import { apiRequest } from '../lib/queryClient';
import { 
  User, 
  Building, 
  Package, 
  Palette, 
  FileText, 
  Phone, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft,
  Upload,
  Shield
} from 'lucide-react';

interface OnboardingData {
  step_1?: {
    firstName: string;
    lastName: string;
    phone: string;
    jobTitle: string;
  };
  step_2?: {
    organizationName: string;
    organizationType: string;
    industry: string;
    websiteUrl: string;
    employeeCountRange: string;
    annualRevenueRange: string;
  };
  step_3?: {
    businessAddress: {
      line1: string;
      line2: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
    businessPhone: string;
  };
  step_4?: {
    primaryProductTypes: string[];
    typicalOrderQuantityMin: number;
    typicalOrderQuantityMax: number;
    preferredMaterials: string[];
    qualityPreference: string;
    budgetRangePerItem: string;
  };
  step_5?: {
    preferredPrintMethods: string[];
    needsDesignServices: boolean;
    hasExistingArtwork: boolean;
    brandGuidelinesAvailable: boolean;
    preferredDeliveryTimeline: string;
  };
  step_6?: {
    hasTaxExemption: boolean;
    certificateType?: string;
    certificateNumber?: string;
    issuingState?: string;
    expirationDate?: string;
  };
  step_7?: {
    communicationPreferences: {
      emailNotifications: boolean;
      smsNotifications: boolean;
      phoneUpdates: boolean;
      promotionalEmails: boolean;
      communicationFrequency: string;
    };
  };
  step_8?: {
    password: string;
    confirmPassword: string;
    agreeToTerms: boolean;
  };
}

const PRODUCT_TYPES = [
  'T-Shirts', 'Hoodies/Sweatshirts', 'Polo Shirts', 'Button-Down Shirts',
  'Hats/Caps', 'Bags/Totes', 'Jackets', 'Tank Tops', 'Long Sleeve Shirts',
  'Pants/Shorts', 'Accessories', 'Other'
];

const MATERIALS = [
  '100% Cotton', 'Cotton Blend', 'Polyester', 'Tri-Blend', 
  'Performance/Moisture Wicking', 'Organic Cotton', 'Bamboo', 'Other'
];

const PRINT_METHODS = [
  'Screen Printing', 'Embroidery', 'Heat Transfer Vinyl', 'Direct-to-Garment (DTG)',
  'Sublimation', 'Embossing/Debossing', 'Laser Engraving', 'Other'
];

export function ComprehensiveOnboarding() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [invitation, setInvitation] = useState<any>(null);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({});
  const [loading, setLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const token = searchParams.get('token');
  const totalSteps = 8;

  useEffect(() => {
    if (!token) {
      toast({
        title: 'Invalid Link',
        description: 'This invitation link is invalid or expired.',
        variant: 'destructive'
      });
      navigate('/login');
      return;
    }

    fetchInvitationDetails();
  }, [token]);

  const fetchInvitationDetails = async () => {
    try {
      const response = await apiRequest('GET', `/api/invitations/token/${token}`);
      if (response.success) {
        setInvitation(response.data);
        if (response.data.onboarding_progress) {
          setCurrentStep(response.data.onboarding_progress.current_step);
          setOnboardingData(response.data.onboarding_progress.step_data || {});
        }
      } else {
        throw new Error(response.message);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load invitation details',
        variant: 'destructive'
      });
      navigate('/login');
    }
  };

  const saveStepData = async (step: number, stepData: any, isComplete: boolean = false) => {
    try {
      setLoading(true);
      await apiRequest('POST', '/api/invitations/onboarding/step', {
        token,
        step,
        stepData,
        isComplete
      });

      setOnboardingData(prev => ({
        ...prev,
        [`step_${step}`]: stepData
      }));

      if (isComplete && step < totalSteps) {
        setCurrentStep(step + 1);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save step data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const updateStepData = (step: number, data: any) => {
    setOnboardingData(prev => ({
      ...prev,
      [`step_${step}`]: data
    }));
  };

  const nextStep = async () => {
    const stepData = onboardingData[`step_${currentStep}` as keyof OnboardingData];
    if (stepData) {
      await saveStepData(currentStep, stepData, true);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeRegistration = async () => {
    try {
      setLoading(true);
      
      const step8Data = onboardingData.step_8;
      if (!step8Data || step8Data.password !== step8Data.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (!step8Data.agreeToTerms) {
        throw new Error('You must agree to the terms and conditions');
      }

      // Save organization profile
      if (onboardingData.step_2) {
        await apiRequest('POST', '/api/invitations/onboarding/organization', {
          token,
          organizationData: {
            organization_name: onboardingData.step_2.organizationName,
            organization_type: onboardingData.step_2.organizationType,
            industry: onboardingData.step_2.industry,
            website_url: onboardingData.step_2.websiteUrl,
            employee_count_range: onboardingData.step_2.employeeCountRange,
            annual_revenue_range: onboardingData.step_2.annualRevenueRange,
            business_phone: onboardingData.step_3?.businessPhone,
            business_address_line1: onboardingData.step_3?.businessAddress.line1,
            business_address_line2: onboardingData.step_3?.businessAddress.line2,
            city: onboardingData.step_3?.businessAddress.city,
            state_province: onboardingData.step_3?.businessAddress.state,
            postal_code: onboardingData.step_3?.businessAddress.postalCode,
            country: onboardingData.step_3?.businessAddress.country || 'United States'
          }
        });
      }

      // Save order preferences
      if (onboardingData.step_4 && onboardingData.step_5) {
        await apiRequest('POST', '/api/invitations/onboarding/preferences', {
          token,
          preferences: {
            primary_product_types: onboardingData.step_4.primaryProductTypes,
            typical_order_quantity_min: onboardingData.step_4.typicalOrderQuantityMin,
            typical_order_quantity_max: onboardingData.step_4.typicalOrderQuantityMax,
            preferred_materials: onboardingData.step_4.preferredMaterials,
            quality_preference: onboardingData.step_4.qualityPreference,
            budget_range_per_item: onboardingData.step_4.budgetRangePerItem,
            preferred_print_methods: onboardingData.step_5.preferredPrintMethods,
            needs_design_services: onboardingData.step_5.needsDesignServices,
            has_existing_artwork: onboardingData.step_5.hasExistingArtwork,
            brand_guidelines_available: onboardingData.step_5.brandGuidelinesAvailable,
            preferred_delivery_timeline: onboardingData.step_5.preferredDeliveryTimeline
          }
        });
      }

      // Upload tax certificate if provided
      if (uploadedFile && onboardingData.step_6) {
        const formData = new FormData();
        formData.append('certificate', uploadedFile);
        formData.append('token', token!);
        formData.append('certificate_type', onboardingData.step_6.certificateType || '');
        formData.append('certificate_number', onboardingData.step_6.certificateNumber || '');
        formData.append('issuing_state', onboardingData.step_6.issuingState || '');
        formData.append('expiration_date', onboardingData.step_6.expirationDate || '');

        await fetch('/api/invitations/onboarding/tax-certificate', {
          method: 'POST',
          body: formData
        });
      }

      // Complete registration
      await apiRequest('POST', '/api/invitations/complete-registration', {
        token,
        password: step8Data.password,
        firstName: onboardingData.step_1?.firstName,
        lastName: onboardingData.step_1?.lastName,
        phone: onboardingData.step_1?.phone,
        communicationPreferences: onboardingData.step_7?.communicationPreferences
      });

      toast({
        title: 'Registration Complete!',
        description: 'Your account has been created successfully. Please log in to continue.',
      });

      navigate('/login');

    } catch (error: any) {
      toast({
        title: 'Registration Failed',
        description: error.message || 'Failed to complete registration',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <User className="mx-auto h-12 w-12 text-blue-500 mb-4" />
              <h2 className="text-2xl font-bold">Personal Information</h2>
              <p className="text-gray-600">Let's start with your basic information</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={onboardingData.step_1?.firstName || ''}
                  onChange={(e) => updateStepData(1, {
                    ...onboardingData.step_1,
                    firstName: e.target.value
                  })}
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={onboardingData.step_1?.lastName || ''}
                  onChange={(e) => updateStepData(1, {
                    ...onboardingData.step_1,
                    lastName: e.target.value
                  })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                value={onboardingData.step_1?.phone || ''}
                onChange={(e) => updateStepData(1, {
                  ...onboardingData.step_1,
                  phone: e.target.value
                })}
              />
            </div>
            <div>
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input
                id="jobTitle"
                value={onboardingData.step_1?.jobTitle || ''}
                onChange={(e) => updateStepData(1, {
                  ...onboardingData.step_1,
                  jobTitle: e.target.value
                })}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Building className="mx-auto h-12 w-12 text-blue-500 mb-4" />
              <h2 className="text-2xl font-bold">Organization Details</h2>
              <p className="text-gray-600">Tell us about your organization</p>
            </div>
            <div>
              <Label htmlFor="orgName">Organization Name *</Label>
              <Input
                id="orgName"
                value={onboardingData.step_2?.organizationName || ''}
                onChange={(e) => updateStepData(2, {
                  ...onboardingData.step_2,
                  organizationName: e.target.value
                })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="orgType">Organization Type *</Label>
                <Select
                  value={onboardingData.step_2?.organizationType || ''}
                  onValueChange={(value) => updateStepData(2, {
                    ...onboardingData.step_2,
                    organizationType: value
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="retail">Retail Business</SelectItem>
                    <SelectItem value="corporate">Corporate</SelectItem>
                    <SelectItem value="nonprofit">Non-Profit</SelectItem>
                    <SelectItem value="government">Government</SelectItem>
                    <SelectItem value="education">Educational Institution</SelectItem>
                    <SelectItem value="sports">Sports Team/Club</SelectItem>
                    <SelectItem value="event">Event/Entertainment</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  value={onboardingData.step_2?.industry || ''}
                  onChange={(e) => updateStepData(2, {
                    ...onboardingData.step_2,
                    industry: e.target.value
                  })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="website">Website URL</Label>
              <Input
                id="website"
                type="url"
                value={onboardingData.step_2?.websiteUrl || ''}
                onChange={(e) => updateStepData(2, {
                  ...onboardingData.step_2,
                  websiteUrl: e.target.value
                })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="employeeCount">Employee Count</Label>
                <Select
                  value={onboardingData.step_2?.employeeCountRange || ''}
                  onValueChange={(value) => updateStepData(2, {
                    ...onboardingData.step_2,
                    employeeCountRange: value
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-10">1-10 employees</SelectItem>
                    <SelectItem value="11-50">11-50 employees</SelectItem>
                    <SelectItem value="51-200">51-200 employees</SelectItem>
                    <SelectItem value="201-500">201-500 employees</SelectItem>
                    <SelectItem value="500+">500+ employees</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="revenue">Annual Revenue (Optional)</Label>
                <Select
                  value={onboardingData.step_2?.annualRevenueRange || ''}
                  onValueChange={(value) => updateStepData(2, {
                    ...onboardingData.step_2,
                    annualRevenueRange: value
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="under-100k">Under $100K</SelectItem>
                    <SelectItem value="100k-500k">$100K - $500K</SelectItem>
                    <SelectItem value="500k-1m">$500K - $1M</SelectItem>
                    <SelectItem value="1m-5m">$1M - $5M</SelectItem>
                    <SelectItem value="5m+">$5M+</SelectItem>
                    <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Phone className="mx-auto h-12 w-12 text-blue-500 mb-4" />
              <h2 className="text-2xl font-bold">Business Contact Information</h2>
              <p className="text-gray-600">Where can we reach your business?</p>
            </div>
            <div>
              <Label htmlFor="businessPhone">Business Phone</Label>
              <Input
                id="businessPhone"
                type="tel"
                value={onboardingData.step_3?.businessPhone || ''}
                onChange={(e) => updateStepData(3, {
                  ...onboardingData.step_3,
                  businessPhone: e.target.value
                })}
              />
            </div>
            <div>
              <Label htmlFor="address1">Business Address Line 1 *</Label>
              <Input
                id="address1"
                value={onboardingData.step_3?.businessAddress?.line1 || ''}
                onChange={(e) => updateStepData(3, {
                  ...onboardingData.step_3,
                  businessAddress: {
                    ...onboardingData.step_3?.businessAddress,
                    line1: e.target.value
                  }
                })}
              />
            </div>
            <div>
              <Label htmlFor="address2">Business Address Line 2</Label>
              <Input
                id="address2"
                value={onboardingData.step_3?.businessAddress?.line2 || ''}
                onChange={(e) => updateStepData(3, {
                  ...onboardingData.step_3,
                  businessAddress: {
                    ...onboardingData.step_3?.businessAddress,
                    line2: e.target.value
                  }
                })}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={onboardingData.step_3?.businessAddress?.city || ''}
                  onChange={(e) => updateStepData(3, {
                    ...onboardingData.step_3,
                    businessAddress: {
                      ...onboardingData.step_3?.businessAddress,
                      city: e.target.value
                    }
                  })}
                />
              </div>
              <div>
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  value={onboardingData.step_3?.businessAddress?.state || ''}
                  onChange={(e) => updateStepData(3, {
                    ...onboardingData.step_3,
                    businessAddress: {
                      ...onboardingData.step_3?.businessAddress,
                      state: e.target.value
                    }
                  })}
                />
              </div>
              <div>
                <Label htmlFor="postal">ZIP Code *</Label>
                <Input
                  id="postal"
                  value={onboardingData.step_3?.businessAddress?.postalCode || ''}
                  onChange={(e) => updateStepData(3, {
                    ...onboardingData.step_3,
                    businessAddress: {
                      ...onboardingData.step_3?.businessAddress,
                      postalCode: e.target.value
                    }
                  })}
                />
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Package className="mx-auto h-12 w-12 text-blue-500 mb-4" />
              <h2 className="text-2xl font-bold">Product Preferences</h2>
              <p className="text-gray-600">What types of products do you typically order?</p>
            </div>
            <div>
              <Label>Primary Product Types *</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {PRODUCT_TYPES.map((type) => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      id={type}
                      checked={onboardingData.step_4?.primaryProductTypes?.includes(type) || false}
                      onCheckedChange={(checked) => {
                        const current = onboardingData.step_4?.primaryProductTypes || [];
                        const updated = checked 
                          ? [...current, type]
                          : current.filter(t => t !== type);
                        updateStepData(4, {
                          ...onboardingData.step_4,
                          primaryProductTypes: updated
                        });
                      }}
                    />
                    <Label htmlFor={type} className="text-sm">{type}</Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="minQuantity">Typical Order Quantity (Min)</Label>
                <Input
                  id="minQuantity"
                  type="number"
                  value={onboardingData.step_4?.typicalOrderQuantityMin || ''}
                  onChange={(e) => updateStepData(4, {
                    ...onboardingData.step_4,
                    typicalOrderQuantityMin: parseInt(e.target.value) || 0
                  })}
                />
              </div>
              <div>
                <Label htmlFor="maxQuantity">Typical Order Quantity (Max)</Label>
                <Input
                  id="maxQuantity"
                  type="number"
                  value={onboardingData.step_4?.typicalOrderQuantityMax || ''}
                  onChange={(e) => updateStepData(4, {
                    ...onboardingData.step_4,
                    typicalOrderQuantityMax: parseInt(e.target.value) || 0
                  })}
                />
              </div>
            </div>
            <div>
              <Label>Preferred Materials</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {MATERIALS.map((material) => (
                  <div key={material} className="flex items-center space-x-2">
                    <Checkbox
                      id={material}
                      checked={onboardingData.step_4?.preferredMaterials?.includes(material) || false}
                      onCheckedChange={(checked) => {
                        const current = onboardingData.step_4?.preferredMaterials || [];
                        const updated = checked 
                          ? [...current, material]
                          : current.filter(m => m !== material);
                        updateStepData(4, {
                          ...onboardingData.step_4,
                          preferredMaterials: updated
                        });
                      }}
                    />
                    <Label htmlFor={material} className="text-sm">{material}</Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quality">Quality Preference</Label>
                <Select
                  value={onboardingData.step_4?.qualityPreference || ''}
                  onValueChange={(value) => updateStepData(4, {
                    ...onboardingData.step_4,
                    qualityPreference: value
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select preference" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="budget">Budget-Friendly</SelectItem>
                    <SelectItem value="standard">Standard Quality</SelectItem>
                    <SelectItem value="premium">Premium Quality</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="budget">Budget Range Per Item</Label>
                <Select
                  value={onboardingData.step_4?.budgetRangePerItem || ''}
                  onValueChange={(value) => updateStepData(4, {
                    ...onboardingData.step_4,
                    budgetRangePerItem: value
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="under-5">Under $5</SelectItem>
                    <SelectItem value="5-10">$5 - $10</SelectItem>
                    <SelectItem value="10-20">$10 - $20</SelectItem>
                    <SelectItem value="20-50">$20 - $50</SelectItem>
                    <SelectItem value="50+">$50+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Palette className="mx-auto h-12 w-12 text-blue-500 mb-4" />
              <h2 className="text-2xl font-bold">Design & Production Preferences</h2>
              <p className="text-gray-600">Let us know about your design and production needs</p>
            </div>
            <div>
              <Label>Preferred Print Methods</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {PRINT_METHODS.map((method) => (
                  <div key={method} className="flex items-center space-x-2">
                    <Checkbox
                      id={method}
                      checked={onboardingData.step_5?.preferredPrintMethods?.includes(method) || false}
                      onCheckedChange={(checked) => {
                        const current = onboardingData.step_5?.preferredPrintMethods || [];
                        const updated = checked 
                          ? [...current, method]
                          : current.filter(m => m !== method);
                        updateStepData(5, {
                          ...onboardingData.step_5,
                          preferredPrintMethods: updated
                        });
                      }}
                    />
                    <Label htmlFor={method} className="text-sm">{method}</Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="needsDesign"
                  checked={onboardingData.step_5?.needsDesignServices || false}
                  onCheckedChange={(checked) => updateStepData(5, {
                    ...onboardingData.step_5,
                    needsDesignServices: checked
                  })}
                />
                <Label htmlFor="needsDesign">I need design services</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasArtwork"
                  checked={onboardingData.step_5?.hasExistingArtwork || false}
                  onCheckedChange={(checked) => updateStepData(5, {
                    ...onboardingData.step_5,
                    hasExistingArtwork: checked
                  })}
                />
                <Label htmlFor="hasArtwork">I have existing artwork/logos</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="brandGuidelines"
                  checked={onboardingData.step_5?.brandGuidelinesAvailable || false}
                  onCheckedChange={(checked) => updateStepData(5, {
                    ...onboardingData.step_5,
                    brandGuidelinesAvailable: checked
                  })}
                />
                <Label htmlFor="brandGuidelines">I have brand guidelines available</Label>
              </div>
            </div>
            <div>
              <Label htmlFor="timeline">Preferred Delivery Timeline</Label>
              <Select
                value={onboardingData.step_5?.preferredDeliveryTimeline || ''}
                onValueChange={(value) => updateStepData(5, {
                  ...onboardingData.step_5,
                  preferredDeliveryTimeline: value
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select timeline" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rush">Rush (1-2 weeks)</SelectItem>
                  <SelectItem value="standard">Standard (2-4 weeks)</SelectItem>
                  <SelectItem value="flexible">Flexible (4+ weeks)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <FileText className="mx-auto h-12 w-12 text-blue-500 mb-4" />
              <h2 className="text-2xl font-bold">Tax Exemption Certificate</h2>
              <p className="text-gray-600">Upload your tax exemption certificate if applicable</p>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasTaxExemption"
                checked={onboardingData.step_6?.hasTaxExemption || false}
                onCheckedChange={(checked) => updateStepData(6, {
                  ...onboardingData.step_6,
                  hasTaxExemption: checked
                })}
              />
              <Label htmlFor="hasTaxExemption">My organization is tax exempt</Label>
            </div>
            
            {onboardingData.step_6?.hasTaxExemption && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="certType">Certificate Type</Label>
                    <Select
                      value={onboardingData.step_6?.certificateType || ''}
                      onValueChange={(value) => updateStepData(6, {
                        ...onboardingData.step_6,
                        certificateType: value
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sales_tax">Sales Tax Exemption</SelectItem>
                        <SelectItem value="use_tax">Use Tax Exemption</SelectItem>
                        <SelectItem value="resale">Resale Certificate</SelectItem>
                        <SelectItem value="nonprofit">Non-Profit Exemption</SelectItem>
                        <SelectItem value="government">Government Exemption</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="certNumber">Certificate Number</Label>
                    <Input
                      id="certNumber"
                      value={onboardingData.step_6?.certificateNumber || ''}
                      onChange={(e) => updateStepData(6, {
                        ...onboardingData.step_6,
                        certificateNumber: e.target.value
                      })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="issuingState">Issuing State</Label>
                    <Input
                      id="issuingState"
                      value={onboardingData.step_6?.issuingState || ''}
                      onChange={(e) => updateStepData(6, {
                        ...onboardingData.step_6,
                        issuingState: e.target.value
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="expiration">Expiration Date</Label>
                    <Input
                      id="expiration"
                      type="date"
                      value={onboardingData.step_6?.expirationDate || ''}
                      onChange={(e) => updateStepData(6, {
                        ...onboardingData.step_6,
                        expirationDate: e.target.value
                      })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="certificateFile">Upload Certificate</Label>
                  <div className="mt-2 flex items-center justify-center w-full">
                    <label htmlFor="certificateFile" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-4 text-gray-500" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">PDF, PNG, JPG or GIF (MAX. 10MB)</p>
                        {uploadedFile && (
                          <p className="text-xs text-green-600 mt-2">File: {uploadedFile.name}</p>
                        )}
                      </div>
                      <input
                        id="certificateFile"
                        type="file"
                        className="hidden"
                        accept=".pdf,.png,.jpg,.jpeg,.gif"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setUploadedFile(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Phone className="mx-auto h-12 w-12 text-blue-500 mb-4" />
              <h2 className="text-2xl font-bold">Communication Preferences</h2>
              <p className="text-gray-600">How would you like us to communicate with you?</p>
            </div>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Notification Preferences</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="emailNotif"
                    checked={onboardingData.step_7?.communicationPreferences?.emailNotifications !== false}
                    onCheckedChange={(checked) => updateStepData(7, {
                      ...onboardingData.step_7,
                      communicationPreferences: {
                        ...onboardingData.step_7?.communicationPreferences,
                        emailNotifications: checked
                      }
                    })}
                  />
                  <Label htmlFor="emailNotif">Email notifications for order updates</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="smsNotif"
                    checked={onboardingData.step_7?.communicationPreferences?.smsNotifications || false}
                    onCheckedChange={(checked) => updateStepData(7, {
                      ...onboardingData.step_7,
                      communicationPreferences: {
                        ...onboardingData.step_7?.communicationPreferences,
                        smsNotifications: checked
                      }
                    })}
                  />
                  <Label htmlFor="smsNotif">SMS notifications for urgent updates</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="phoneUpdates"
                    checked={onboardingData.step_7?.communicationPreferences?.phoneUpdates || false}
                    onCheckedChange={(checked) => updateStepData(7, {
                      ...onboardingData.step_7,
                      communicationPreferences: {
                        ...onboardingData.step_7?.communicationPreferences,
                        phoneUpdates: checked
                      }
                    })}
                  />
                  <Label htmlFor="phoneUpdates">Phone calls for important updates</Label>
                </div>
              </div>
              
              <h3 className="text-lg font-semibold">Marketing Communications</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="promotional"
                    checked={onboardingData.step_7?.communicationPreferences?.promotionalEmails !== false}
                    onCheckedChange={(checked) => updateStepData(7, {
                      ...onboardingData.step_7,
                      communicationPreferences: {
                        ...onboardingData.step_7?.communicationPreferences,
                        promotionalEmails: checked
                      }
                    })}
                  />
                  <Label htmlFor="promotional">Promotional emails and special offers</Label>
                </div>
              </div>
              
              <div>
                <Label htmlFor="frequency">Communication Frequency</Label>
                <Select
                  value={onboardingData.step_7?.communicationPreferences?.communicationFrequency || 'standard'}
                  onValueChange={(value) => updateStepData(7, {
                    ...onboardingData.step_7,
                    communicationPreferences: {
                      ...onboardingData.step_7?.communicationPreferences,
                      communicationFrequency: value
                    }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minimal">Minimal (only essential updates)</SelectItem>
                    <SelectItem value="standard">Standard (regular updates)</SelectItem>
                    <SelectItem value="frequent">Frequent (all updates and news)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      case 8:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Shield className="mx-auto h-12 w-12 text-blue-500 mb-4" />
              <h2 className="text-2xl font-bold">Account Security</h2>
              <p className="text-gray-600">Create your password and complete registration</p>
            </div>
            <div>
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={onboardingData.step_8?.password || ''}
                onChange={(e) => updateStepData(8, {
                  ...onboardingData.step_8,
                  password: e.target.value
                })}
              />
              <p className="text-xs text-gray-500 mt-1">
                Password must be at least 8 characters long
              </p>
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={onboardingData.step_8?.confirmPassword || ''}
                onChange={(e) => updateStepData(8, {
                  ...onboardingData.step_8,
                  confirmPassword: e.target.value
                })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="agreeTerms"
                checked={onboardingData.step_8?.agreeToTerms || false}
                onCheckedChange={(checked) => updateStepData(8, {
                  ...onboardingData.step_8,
                  agreeToTerms: checked
                })}
              />
              <Label htmlFor="agreeTerms" className="text-sm">
                I agree to the Terms of Service and Privacy Policy *
              </Label>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Registration Summary</h3>
              <div className="text-sm text-blue-800 space-y-1">
                <p>Email: {invitation?.email}</p>
                <p>Organization: {onboardingData.step_2?.organizationName}</p>
                <p>Role: {invitation?.role}</p>
                <p>Primary Products: {onboardingData.step_4?.primaryProductTypes?.join(', ') || 'Not specified'}</p>
              </div>
            </div>
          </div>
        );

      default:
        return <div>Invalid step</div>;
    }
  };

  if (!invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading invitation details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome to ThreadCraft</h1>
          <p className="text-gray-600 mt-2">Let's get your account set up in just a few steps</p>
          {invitation.custom_message && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-blue-800">{invitation.custom_message}</p>
            </div>
          )}
        </div>

        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-medium text-gray-700">
              Step {currentStep} of {totalSteps}
            </span>
            <span className="text-sm text-gray-500">
              {Math.round((currentStep / totalSteps) * 100)}% Complete
            </span>
          </div>
          <Progress value={(currentStep / totalSteps) * 100} className="h-2" />
        </div>

        <Card>
          <CardContent className="p-8">
            {renderStep()}
            
            <div className="flex justify-between mt-8">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              
              {currentStep < totalSteps ? (
                <Button onClick={nextStep} disabled={loading}>
                  {loading ? 'Saving...' : 'Next'}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={completeRegistration} disabled={loading}>
                  {loading ? 'Creating Account...' : 'Complete Registration'}
                  <CheckCircle className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
