
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

interface AddCatalogItemFormProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
}

export default function AddCatalogItemForm({ isOpen = false, onClose, onSuccess }: AddCatalogItemFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    basePrice: '',
    category: '',
    sport: '',
    fabric: '',
    status: 'active',
    sku: ''
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate SKU function
  const generateSKU = (name: string, category: string): string => {
    const cleanName = name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 8);
    const cleanCategory = category.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 4);
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 999).toString().padStart(3, '0');
    return `${cleanCategory || 'ITEM'}-${cleanName || 'PRODUCT'}-${timestamp}-${random}`;
  };

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
    
    if (!formData.name.trim()) {
      errors.name = 'Item name is required';
    }
    
    if (!formData.basePrice.trim()) {
      errors.basePrice = 'Base price is required';
    } else {
      const price = parseFloat(formData.basePrice);
      if (isNaN(price) || price < 0) {
        errors.basePrice = 'Please enter a valid price (0 or greater)';
      }
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
      // Generate SKU if not provided
      const skuToUse = formData.sku.trim() || generateSKU(formData.name, formData.category);
      
      const submissionData = {
        ...formData,
        basePrice: parseFloat(formData.basePrice) || 0,
        sku: skuToUse
      };
      
      console.log('Submitting catalog item data:', submissionData);
      
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }

      const response = await axios.post('/api/catalog', submissionData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Catalog item created successfully:', response.data);
      
      // Success handling
      queryClient.invalidateQueries({ queryKey: ['/api/catalog'] });
      
      toast({
        title: "Success!",
        description: "Catalog item was added successfully",
      });
      
      resetForm();
      if (onSuccess) onSuccess();
      if (onClose) onClose();
      
    } catch (error: any) {
      console.error('Error adding catalog item:', error);
      
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
          setGeneralError('You do not have permission to add catalog items.');
        } else if (statusCode === 409) {
          setGeneralError('A catalog item with this name already exists.');
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
        title: "Failed to add catalog item",
        description: error?.response?.data?.message || error.message || "There was an error creating the catalog item.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      base_price: '',
      category: '',
      type: '',
      fabric_options: '',
      color_options: '',
      size_options: ''
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
          <DialogTitle>Add New Catalog Item</DialogTitle>
          <DialogDescription>
            Fill in the catalog item details below. All fields marked with an asterisk (*) are required.
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
            
            <div className="space-y-2">
              <Label htmlFor="name">Item Name *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Custom Jersey"
                required
                className={formErrors.name ? 'border-destructive' : ''}
              />
              {formErrors.name && (
                <p className="text-sm text-destructive">{formErrors.name}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe the item..."
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="base_price">Base Price *</Label>
                <Input
                  id="base_price"
                  name="base_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.base_price}
                  onChange={handleInputChange}
                  placeholder="99.99"
                  required
                  className={formErrors.base_price ? 'border-destructive' : ''}
                />
                {formErrors.base_price && (
                  <p className="text-sm text-destructive">{formErrors.base_price}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  placeholder="Apparel"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="type">Item Type</Label>
              <Input
                id="type"
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                placeholder="Jersey, Shorts, etc."
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="fabric_options">Fabric Options</Label>
              <Input
                id="fabric_options"
                name="fabric_options"
                value={formData.fabric_options}
                onChange={handleInputChange}
                placeholder="Cotton, Polyester, etc."
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="color_options">Color Options</Label>
                <Input
                  id="color_options"
                  name="color_options"
                  value={formData.color_options}
                  onChange={handleInputChange}
                  placeholder="Red, Blue, Green"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="size_options">Size Options</Label>
                <Input
                  id="size_options"
                  name="size_options"
                  value={formData.size_options}
                  onChange={handleInputChange}
                  placeholder="S, M, L, XL"
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
              {isSubmitting ? 'Adding Item...' : 'Add Catalog Item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
