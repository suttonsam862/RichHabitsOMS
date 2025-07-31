
import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface AddCatalogItemFormProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
}

export default function AddCatalogItemForm({ isOpen = false, onClose, onSuccess }: AddCatalogItemFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    basePrice: '',
    unitCost: '',
    category: '',
    sport: '',
    fabric_id: '',
    status: 'active',
    sku: ''
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch fabric options
  const { data: fabricsData, isLoading: fabricsLoading, error: fabricsError } = useQuery({
    queryKey: ['fabric-options'],
    queryFn: async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/fabric-options/fabrics', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        return response.data;
      } catch (error) {
        console.error('Failed to fetch fabric options:', error);
        if (axios.isAxiosError(error)) {
          throw new Error(error.response?.data?.message || 'Failed to load fabric options');
        }
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const fabrics = fabricsData?.data?.fabrics || [];

  // Generate SKU function
  const generateSKU = (name: string, category: string): string => {
    const cleanName = name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 8);
    const cleanCategory = category.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 4);
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 999).toString().padStart(3, '0');
    return `${cleanCategory || 'ITEM'}-${cleanName || 'PRODUCT'}-${timestamp}-${random}`;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear field error when user selects
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

  const handleGenerateSKU = () => {
    const newSKU = generateSKU(formData.name, formData.category);
    setFormData(prev => ({
      ...prev,
      sku: newSKU
    }));
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
      if (isNaN(price)) {
        errors.basePrice = 'Please enter a valid number';
      } else if (price < 0) {
        errors.basePrice = 'Base price must be a positive number (0 or greater)';
      }
    }
    
    // Validate unitCost if provided
    if (formData.unitCost.trim()) {
      const cost = parseFloat(formData.unitCost);
      if (isNaN(cost)) {
        errors.unitCost = 'Please enter a valid number';
      } else if (cost < 0) {
        errors.unitCost = 'Unit cost must be a positive number (0 or greater)';
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
      
      // Map camelCase fields to snake_case for backend compatibility
      const submissionData = {
        name: formData.name,
        description: formData.description,
        base_price: parseFloat(formData.basePrice) || 0,
        unit_cost: parseFloat(formData.unitCost) || 0,
        category: formData.category,
        sport: formData.sport,
        fabric_id: formData.fabric_id,
        status: formData.status,
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
      queryClient.invalidateQueries('catalog');
      
      toast({
        title: "Success!",
        description: "Catalog item was added successfully",
      });
      
      resetForm();
      if (onSuccess) onSuccess();
      if (onClose) onClose();
      
      // Redirect to catalog item detail/edit page and scroll to top
      handlePostCreationRedirect(
        response.data,
        'catalogItem',
        navigate,
        '/admin/catalog',
        '/admin/catalog'
      );
      
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
      basePrice: '',
      unitCost: '',
      category: '',
      sport: '',
      fabric_id: '',
      status: 'active',
      sku: ''
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
                <Label htmlFor="basePrice">Base Price *</Label>
                <Input
                  id="basePrice"
                  name="basePrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.basePrice}
                  onChange={handleInputChange}
                  placeholder="99.99"
                  required
                  className={formErrors.basePrice ? 'border-destructive' : ''}
                />
                {formErrors.basePrice && (
                  <p className="text-sm text-destructive">{formErrors.basePrice}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="unitCost">Unit Cost</Label>
                <Input
                  id="unitCost"
                  name="unitCost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.unitCost}
                  onChange={handleInputChange}
                  placeholder="75.00"
                  className={formErrors.unitCost ? 'border-destructive' : ''}
                />
                {formErrors.unitCost && (
                  <p className="text-sm text-destructive">{formErrors.unitCost}</p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
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
              <div className="space-y-2">
                <Label htmlFor="sport">Sport</Label>
                <Input
                  id="sport"
                  name="sport"
                  value={formData.sport}
                  onChange={handleInputChange}
                  placeholder="Basketball, Football, etc."
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fabric">Fabric</Label>
                <Select
                  value={formData.fabric_id}
                  onValueChange={(value) => handleSelectChange('fabric_id', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={fabricsLoading ? "Loading fabrics..." : "Select a fabric"} />
                  </SelectTrigger>
                  <SelectContent>
                    {fabricsLoading ? (
                      <SelectItem value="" disabled>Loading fabrics...</SelectItem>
                    ) : fabricsError ? (
                      <SelectItem value="" disabled>Error loading fabrics</SelectItem>
                    ) : (
                      <>
                        <SelectItem value="">None selected</SelectItem>
                        {fabrics.map((fabric: any) => (
                          <SelectItem key={fabric.id} value={fabric.id}>
                            {fabric.name}
                            {fabric.description && (
                              <span className="text-sm text-muted-foreground ml-2">
                                - {fabric.description}
                              </span>
                            )}
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
                {formErrors.fabric_id && (
                  <p className="text-sm text-destructive">{formErrors.fabric_id}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="discontinued">Discontinued</option>
                </select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <div className="flex gap-2">
                <Input
                  id="sku"
                  name="sku"
                  value={formData.sku}
                  onChange={handleInputChange}
                  placeholder="Auto-generated SKU"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGenerateSKU}
                  className="whitespace-nowrap"
                >
                  Generate SKU
                </Button>
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
