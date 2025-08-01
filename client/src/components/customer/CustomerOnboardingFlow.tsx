import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Building2, Users, Mail, Phone, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CustomerOnboardingFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CustomerOnboardingFlow: React.FC<CustomerOnboardingFlowProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    organizationName: '',
    contactName: '',
    email: '',
    phone: '',
    address: '',
    description: '',
    logo: null as File | null
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, logo: file }));
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      // Create customer organization
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: formData.contactName.split(' ')[0] || '',
          lastName: formData.contactName.split(' ').slice(1).join(' ') || '',
          email: formData.email,
          phone: formData.phone,
          companyName: formData.organizationName,
          address: formData.address,
          notes: formData.description
        }),
      });

      if (response.ok) {
        toast({
          title: "Organization Created",
          description: "New customer organization has been successfully created.",
        });
        onSuccess();
      } else {
        throw new Error('Failed to create organization');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create organization. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Building2 className="mx-auto h-12 w-12 text-neon-blue mb-4" />
              <h3 className="text-lg font-semibold text-foreground">Organization Details</h3>
              <p className="text-sm text-muted-foreground">Basic information about the customer organization</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="organizationName">Organization Name *</Label>
                <Input
                  id="organizationName"
                  value={formData.organizationName}
                  onChange={(e) => handleInputChange('organizationName', e.target.value)}
                  placeholder="Enter organization name"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="contactName">Primary Contact *</Label>
                <Input
                  id="contactName"
                  value={formData.contactName}
                  onChange={(e) => handleInputChange('contactName', e.target.value)}
                  placeholder="Enter contact person name"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Brief description of the organization"
                  rows={3}
                />
              </div>
            </div>
          </div>
        );
        
      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Mail className="mx-auto h-12 w-12 text-neon-green mb-4" />
              <h3 className="text-lg font-semibold text-foreground">Contact Information</h3>
              <p className="text-sm text-muted-foreground">How we can reach this organization</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="contact@organization.com"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              
              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Full address including city, state, and zip"
                  rows={3}
                />
              </div>
            </div>
          </div>
        );
        
      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Upload className="mx-auto h-12 w-12 text-purple-400 mb-4" />
              <h3 className="text-lg font-semibold text-foreground">Organization Logo</h3>
              <p className="text-sm text-muted-foreground">Upload a logo for this organization (optional)</p>
            </div>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              {formData.logo ? (
                <div>
                  <p className="text-sm text-green-600 mb-2">Logo selected: {formData.logo.name}</p>
                  <Button 
                    variant="outline" 
                    onClick={() => setFormData(prev => ({ ...prev, logo: null }))}
                  >
                    Remove Logo
                  </Button>
                </div>
              ) : (
                <div>
                  <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <label htmlFor="logo-upload" className="cursor-pointer">
                    <span className="text-blue-600 hover:text-blue-500">Upload a logo</span>
                    <input
                      id="logo-upload"
                      type="file"
                      className="sr-only"
                      accept="image/*"
                      onChange={handleLogoUpload}
                    />
                  </label>
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 2MB</p>
                </div>
              )}
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Review & Confirm</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div><strong>Organization:</strong> {formData.organizationName}</div>
                <div><strong>Contact:</strong> {formData.contactName}</div>
                <div><strong>Email:</strong> {formData.email}</div>
                {formData.phone && <div><strong>Phone:</strong> {formData.phone}</div>}
              </CardContent>
            </Card>
          </div>
        );
        
      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.organizationName && formData.contactName;
      case 2:
        return formData.email;
      case 3:
        return true;
      default:
        return false;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-rich-black/90 backdrop-blur-md border border-glass-border max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-neon-blue">New Organization Onboarding</DialogTitle>
          <DialogDescription className="text-neon-green">
            Step {currentStep} of 3 - Set up a new customer organization
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          {renderStep()}
        </div>

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => currentStep > 1 ? setCurrentStep(currentStep - 1) : onClose()}
            disabled={isLoading}
          >
            {currentStep > 1 ? 'Previous' : 'Cancel'}
          </Button>
          
          {currentStep < 3 ? (
            <Button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={!canProceed() || isLoading}
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed() || isLoading}
            >
              {isLoading ? 'Creating...' : 'Create Organization'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerOnboardingFlow;