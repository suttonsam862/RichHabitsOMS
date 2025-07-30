
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface AddManufacturerFormProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
}

export default function AddManufacturerForm({ isOpen = false, onClose, onSuccess }: AddManufacturerFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: '',
    company: '',
    specialties: '',
    capacity: ''
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear field error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
    
    // Clear general error when user makes changes
    if (generalError) {
      setGeneralError('');
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    }
    
    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }
    
    if (!formData.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear any previous errors
    setGeneralError('');
    setFormErrors({});
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      console.log('Submitting manufacturer data:', formData);
      
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }

      const response = await axios.post('/api/manufacturing/manufacturers', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Manufacturer created successfully:', response.data);
      
      // Success handling
      queryClient.invalidateQueries({ queryKey: ['/api/manufacturing/manufacturers'] });
      
      toast({
        title: "Success!",
        description: "Manufacturer was added successfully",
      });
      
      resetForm();
      if (onSuccess) onSuccess();
      if (onClose) onClose();
      
    } catch (error: any) {
      console.error('Error adding manufacturer:', error);
      
      let userFriendlyMessage = '';
      let detailedMessage = '';
      
      // Handle different types of errors with better message extraction
      if (error.response) {
        // Server responded with error status
        const statusCode = error.response.status;
        const responseData = error.response.data;
        
        // Extract error message with priority: message > error > statusText
        const serverMessage = responseData?.message || 
                            responseData?.error || 
                            responseData?.details || 
                            error.response.statusText || 
                            'Unknown server error';
        
        // Create user-friendly messages based on status code
        switch (statusCode) {
          case 400:
            userFriendlyMessage = `Invalid data: ${serverMessage}`;
            detailedMessage = 'Please check your input and try again.';
            break;
          case 401:
            userFriendlyMessage = 'Authentication failed. Please log in again.';
            detailedMessage = 'Your session may have expired.';
            break;
          case 403:
            userFriendlyMessage = 'Access denied. You do not have permission to add manufacturers.';
            detailedMessage = 'Contact your administrator if you believe this is an error.';
            break;
          case 409:
            userFriendlyMessage = 'A manufacturer with this email already exists.';
            detailedMessage = 'Please use a different email address.';
            break;
          case 422:
            userFriendlyMessage = `Validation failed: ${serverMessage}`;
            detailedMessage = 'Please correct the highlighted fields and try again.';
            break;
          case 500:
            userFriendlyMessage = `Server error: ${serverMessage}`;
            detailedMessage = 'This appears to be a system issue. Please try again later.';
            break;
          default:
            userFriendlyMessage = `Error (${statusCode}): ${serverMessage}`;
            detailedMessage = 'Please try again or contact support if the problem persists.';
        }
        
        // Log detailed error for debugging
        console.error('API Error Details:', {
          status: statusCode,
          data: responseData,
          message: serverMessage
        });
        
      } else if (error.request) {
        // Network error - no response received
        userFriendlyMessage = 'Network connection failed';
        detailedMessage = 'Please check your internet connection and try again.';
        console.error('Network Error:', error.request);
        
      } else {
        // Request setup error or other error
        userFriendlyMessage = error.message || 'An unexpected error occurred';
        detailedMessage = 'Please refresh the page and try again.';
        console.error('Request Error:', error.message);
      }
      
      // Set the main error message
      setGeneralError(userFriendlyMessage);
      
      // Show toast with both main message and details
      toast({
        title: "Failed to add manufacturer",
        description: `${userFriendlyMessage}${detailedMessage ? ` ${detailedMessage}` : ''}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      country: '',
      company: '',
      specialties: '',
      capacity: ''
    });
    setFormErrors({});
    setGeneralError('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open && onClose) onClose();
    }}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add New Manufacturer</DialogTitle>
          <DialogDescription>
            Fill in the manufacturer details below. All fields marked with an asterisk (*) are required.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* General Error Display */}
            {generalError && (
              <div className="p-4 rounded-lg bg-destructive/15 border-2 border-destructive/30 shadow-sm">
                <div className="flex items-start space-x-2">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-destructive mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-destructive mb-1">Error</h4>
                    <p className="text-sm text-destructive/90 leading-relaxed">{generalError}</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  placeholder="John"
                  required
                  className={formErrors.firstName ? 'border-destructive' : ''}
                />
                {formErrors.firstName && (
                  <p className="text-sm text-destructive">{formErrors.firstName}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  placeholder="Smith"
                  required
                  className={formErrors.lastName ? 'border-destructive' : ''}
                />
                {formErrors.lastName && (
                  <p className="text-sm text-destructive">{formErrors.lastName}</p>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="company">Company Name</Label>
              <Input
                id="company"
                name="company"
                value={formData.company}
                onChange={handleInputChange}
                placeholder="ABC Manufacturing Co."
                className={formErrors.company ? 'border-destructive' : ''}
              />
              {formErrors.company && (
                <p className="text-sm text-destructive">{formErrors.company}</p>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="contact@manufacturer.com"
                  required
                  className={formErrors.email ? 'border-destructive' : ''}
                />
                {formErrors.email && (
                  <p className="text-sm text-destructive">{formErrors.email}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="123 Manufacturing St"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  placeholder="Manufacturing City"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  placeholder="CA"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="zip">Zip/Postal Code</Label>
                <Input
                  id="zip"
                  name="zip"
                  value={formData.zip}
                  onChange={handleInputChange}
                  placeholder="90210"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  placeholder="USA"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="specialties">Specialties</Label>
              <Textarea
                id="specialties"
                name="specialties"
                value={formData.specialties}
                onChange={handleInputChange}
                placeholder="Custom jerseys, sportswear, embroidery..."
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="capacity">Production Capacity</Label>
              <Input
                id="capacity"
                name="capacity"
                value={formData.capacity}
                onChange={handleInputChange}
                placeholder="1000 units/month"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full mr-2" />
              ) : null}
              {isSubmitting ? 'Adding Manufacturer...' : 'Add Manufacturer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
