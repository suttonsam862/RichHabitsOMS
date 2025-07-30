
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
    base_price: '',
    category: '',
    type: '',
    fabric_options: '',
    color_options: '',
    size_options: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const addCatalogItemMutation = useMutation({
    mutationFn: async (itemData: typeof formData) => {
      console.log('Submitting catalog item data:', itemData);
      
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }

      const response = await axios.post('/api/catalog-items', {
        ...itemData,
        base_price: parseFloat(itemData.base_price) || 0
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    },
    onSuccess: (data) => {
      console.log('Catalog item created successfully:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/catalog-items'] });
      toast({
        title: "Success!",
        description: "Catalog item was added successfully",
      });
      resetForm();
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    },
    onError: (error: any) => {
      console.error('Error adding catalog item:', error);
      toast({
        title: "Failed to add catalog item",
        description: error?.response?.data?.message || "There was an error creating the catalog item. Please try again.",
        variant: "destructive",
      });
    }
  });

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
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitting catalog item form with data:', formData);
    addCatalogItemMutation.mutate(formData);
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
            <div className="space-y-2">
              <Label htmlFor="name">Item Name *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Custom Jersey"
                required
              />
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
                  value={formData.base_price}
                  onChange={handleInputChange}
                  placeholder="99.99"
                  required
                />
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
              disabled={addCatalogItemMutation.isPending}
            >
              {addCatalogItemMutation.isPending ? (
                <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full mr-2" />
              ) : null}
              Add Catalog Item
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
