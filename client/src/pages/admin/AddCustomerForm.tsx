import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { handlePostCreationRedirect } from '@/utils/navigation';
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
import { useToast } from "@/hooks/use-toast";

interface AddCustomerFormProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
}

export default function AddCustomerForm({ isOpen = false, onClose, onSuccess }: AddCustomerFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    company: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: '',
    sendInvite: true
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    
    if (!formData.first_name.trim()) {
      errors.first_name = 'First name is required';
    }
    
    if (!formData.last_name.trim()) {
      errors.last_name = 'Last name is required';
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
      console.log('Submitting customer data:', formData);
      
      // Get auth token from localStorage
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }

      const response = await axios.post('/api/customers', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Customer created successfully:', response.data);
      
      // Success handling
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      queryClient.invalidateQueries({ queryKey: ["admin", "customers"] });
      
      toast({
        title: "Success!",
        description: "Customer was added successfully",
      });
      
      resetForm();
      if (onSuccess) onSuccess();
      if (onClose) onClose();
      
      // Redirect to customer detail/edit page and scroll to top
      handlePostCreationRedirect(
        response.data,
        'customer',
        navigate,
        '/admin/customers',
        '/admin/customers'
      );
      
    } catch (error: any) {
      console.error('Error adding customer:', error);
      
      // Handle different types of errors
      if (error.response) {
        // Server responded with error status
        const statusCode = error.response.status;
        const errorMessage = error.response.data?.message || error.response.data?.error || 'Unknown server error';
        
        if (statusCode === 400) {
          setGeneralError(`Validation Error: ${errorMessage}`);
        } else if (statusCode === 401) {
          setGeneralError('Authentication failed. Please log in again.');
        } else if (statusCode === 403) {
          setGeneralError('You do not have permission to add customers.');
        } else if (statusCode === 409) {
          setGeneralError('A customer with this email already exists.');
        } else {
          setGeneralError(`Server Error (${statusCode}): ${errorMessage}`);
        }
      } else if (error.request) {
        // Network error
        setGeneralError('Network error. Please check your connection and try again.');
      } else {
        // Other error
        setGeneralError(error.message || 'An unexpected error occurred. Please try again.');
      }
      
      toast({
        title: "Failed to add customer",
        description: error?.response?.data?.message || error.message || "There was an error creating the customer.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      company: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      country: '',
      sendInvite: true
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
          <DialogTitle>Add New Customer</DialogTitle>
          <DialogDescription>
            Fill in the customer details below. All fields marked with an asterisk (*) are required.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* General Error Display */}
            {generalError && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive font-medium">{generalError}</p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  placeholder="John"
                  required
                  className={formErrors.first_name ? 'border-destructive' : ''}
                />
                {formErrors.first_name && (
                  <p className="text-sm text-destructive">{formErrors.first_name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  placeholder="Doe"
                  required
                  className={formErrors.last_name ? 'border-destructive' : ''}
                />
                {formErrors.last_name && (
                  <p className="text-sm text-destructive">{formErrors.last_name}</p>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="john.doe@example.com"
                required
                className={formErrors.email ? 'border-destructive' : ''}
              />
              {formErrors.email && (
                <p className="text-sm text-destructive">{formErrors.email}</p>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  name="company"
                  value={formData.company}
                  onChange={handleInputChange}
                  placeholder="Acme Inc."
                />
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
                placeholder="123 Main St"
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
                  placeholder="New York"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  placeholder="NY"
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
                  placeholder="10001"
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
              {isSubmitting ? 'Adding Customer...' : 'Add Customer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}