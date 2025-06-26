import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search, 
  MoreHorizontal, 
  PlusCircle, 
  Filter, 
  RefreshCw, 
  Edit, 
  Trash2,
  Package,
  Eye,
  ImageIcon
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface CatalogItem {
  id: string;
  name: string;
  category: string;
  sport: string;
  basePrice: number;
  unitCost: number;
  sku: string;
  status: 'active' | 'inactive' | 'discontinued';
  imageUrl?: string;
  etaDays: string;
  preferredManufacturerId?: string;
  tags?: string[];
  specifications?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

const catalogItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string().min(1, "Category is required"),
  sport: z.string().min(1, "Sport is required"),
  basePrice: z.number().min(0, "Price must be positive"),
  unitCost: z.number().min(0, "Unit cost must be positive"),
  sku: z.string().min(1, "SKU is required"),
  status: z.enum(['active', 'inactive', 'discontinued']).default('active'),
  imageUrl: z.string().url().optional().or(z.literal("")),
  measurementChartUrl: z.string().url().optional().or(z.literal("")),
  hasMeasurements: z.boolean().default(false),
  measurementInstructions: z.string().optional(),
  etaDays: z.string().min(1, "ETA is required"),
  preferredManufacturerId: z.string().optional(),
  tags: z.string().optional(),
  specifications: z.string().optional(),
});

// Image Upload Area Component
interface ImageUploadAreaProps {
  inputId: string;
  onFileSelect: (file: File) => void;
  uploadText?: string;
}

const ImageUploadArea: React.FC<ImageUploadAreaProps> = ({ 
  inputId, 
  onFileSelect, 
  uploadText = "Click to upload an image file" 
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      onFileSelect(file);
      
      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreviewUrl("");
    const fileInput = document.getElementById(inputId) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
      (fileInput as any).selectedFile = null;
      (fileInput as any).selectedMeasurementFile = null;
    }
  };

  return (
    <div className="border-2 border-dashed border-glass-border rounded-lg overflow-hidden hover:border-neon-blue/50 transition-colors">
      {previewUrl ? (
        <div className="relative">
          <img 
            src={previewUrl} 
            alt="Preview" 
            className="w-full h-32 object-cover"
          />
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
            <div className="flex gap-2">
              <label htmlFor={inputId} className="cursor-pointer">
                <Button size="sm" variant="secondary">
                  Change Image
                </Button>
              </label>
              <Button 
                size="sm" 
                variant="destructive" 
                onClick={clearSelection}
              >
                Remove
              </Button>
            </div>
          </div>
          <div className="p-2 bg-rich-black/90">
            <p className="text-xs text-neon-green font-medium truncate">
              {selectedFile?.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {selectedFile && (selectedFile.size / 1024 / 1024).toFixed(2)}MB
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 text-center">
          <label htmlFor={inputId} className="cursor-pointer block">
            <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {uploadText}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PNG, JPG, WebP up to 5MB
            </p>
          </label>
        </div>
      )}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        id={inputId}
        onChange={handleFileChange}
      />
    </div>
  );
};

// Auto-generate unique SKU with improved pattern
const generateSKU = (category: string, name: string): string => {
  // Get category prefix (first 2-3 letters)
  const categoryPrefix = category.replace(/[^A-Za-z]/g, '').substring(0, 3).toUpperCase() || 'GEN';
  
  // Get name prefix (first 2-3 letters)
  const namePrefix = name.replace(/[^A-Za-z]/g, '').substring(0, 3).toUpperCase() || 'ITM';
  
  // Generate sequential number based on timestamp
  const timestamp = Date.now().toString().slice(-6);
  
  // Generate random alphanumeric suffix (shorter for readability)
  const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
  
  return `${categoryPrefix}-${namePrefix}-${timestamp}-${randomSuffix}`;
};

type CatalogItemForm = z.infer<typeof catalogItemSchema>;

const initialCategories = [
  "T-Shirts",
  "Hoodies", 
  "Polo Shirts",
  "Jackets",
  "Pants",
  "Shorts",
  "Accessories",
  "Custom",
];

const initialSports = [
  "All Around Item",
  "Basketball",
  "Football",
  "Soccer", 
  "Baseball",
  "Tennis",
  "Golf",
  "Swimming",
  "Running",
  "Cycling",
  "Volleyball",
  "Hockey",
];

export default function CatalogPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [categories, setCategories] = useState(initialCategories);
  const [sports, setSports] = useState(initialSports);
  const [newCategory, setNewCategory] = useState("");
  const [newSport, setNewSport] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddSport, setShowAddSport] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CatalogItemForm>({
    resolver: zodResolver(catalogItemSchema),
    defaultValues: {
      name: "",
      category: "",
      sport: "All Around Item",
      basePrice: 0,
      unitCost: 0,
      sku: "",
      status: "active",
      imageUrl: "",
      measurementChartUrl: "",
      hasMeasurements: false,
      measurementInstructions: "",
      etaDays: "7",
      preferredManufacturerId: "",
      tags: "",
      specifications: "",
    },
  });

  // Watch name and category for manual SKU generation
  const watchedName = form.watch("name");
  const watchedCategory = form.watch("category");

  // Function to manually regenerate SKU
  const regenerateSKU = () => {
    const name = form.getValues("name");
    const category = form.getValues("category");
    if (name && category) {
      const newSKU = generateSKU(category, name);
      form.setValue("sku", newSKU);
    }
  };

  // Fetch catalog items
  const { data: catalogItems, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "catalog"],
    queryFn: async () => {
      const response = await fetch("/api/catalog");
      if (!response.ok) {
        throw new Error("Failed to fetch catalog items");
      }
      return response.json();
    }
  });

  // Fetch manufacturers
  const { data: manufacturersData, isError: manufacturersError } = useQuery({
    queryKey: ["admin", "manufacturers"],
    queryFn: async () => {
      const response = await fetch("/api/users?role=manufacturer");
      if (!response.ok) {
        throw new Error("Failed to fetch manufacturers");
      }
      const result = await response.json();
      return result;
    },
    retry: 1,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  // Safe fallback for manufacturers data
  const manufacturers = React.useMemo(() => {
    if (manufacturersError || !manufacturersData) {
      console.warn('Manufacturers data not available:', manufacturersError);
      return [];
    }
    
    // Handle both array response and object with users property
    if (Array.isArray(manufacturersData)) {
      return manufacturersData;
    }
    
    if (manufacturersData.users && Array.isArray(manufacturersData.users)) {
      return manufacturersData.users;
    }
    
    return [];
  }, [manufacturersData, manufacturersError]);

  // Fetch categories from database
  const { data: dbCategories = [], refetch: refetchCategories } = useQuery({
    queryKey: ["admin", "catalog-categories"],
    queryFn: async () => {
      const response = await fetch("/api/catalog-options/categories");
      if (!response.ok) {
        throw new Error("Failed to fetch categories");
      }
      const result = await response.json();
      return result.categories || [];
    }
  });

  // Fetch sports from database
  const { data: dbSports = [], refetch: refetchSports } = useQuery({
    queryKey: ["admin", "catalog-sports"],
    queryFn: async () => {
      const response = await fetch("/api/catalog-options/sports");
      if (!response.ok) {
        throw new Error("Failed to fetch sports");
      }
      const result = await response.json();
      return result.sports || [];
    }
  });

  // Add item mutation
  const addItemMutation = useMutation({
    mutationFn: async (data: CatalogItemForm & { _uploadFile?: File; _uploadMeasurementFile?: File }) => {
      const { _uploadFile, _uploadMeasurementFile, ...itemData } = data;
      
      const payload = {
        ...itemData,
        tags: itemData.tags ? itemData.tags.split(",").map(tag => tag.trim()) : [],
        specifications: itemData.specifications ? JSON.parse(itemData.specifications) : {},
      };
      
      // Create the catalog item first
      const response = await fetch("/api/catalog", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        throw new Error("Failed to add catalog item");
      }
      
      const result = await response.json();
      
      // Upload product image if provided
      if (_uploadFile && result.item?.id) {
        const formData = new FormData();
        formData.append('image', _uploadFile);
        
        const uploadResponse = await fetch(`/api/images/catalog/${result.item.id}`, {
          method: "POST",
          body: formData,
        });
        
        if (!uploadResponse.ok) {
          console.warn("Product image upload failed, but item was created successfully");
        }
      }
      
      // Upload measurement chart if provided
      if (_uploadMeasurementFile && result.item?.id) {
        const formData = new FormData();
        formData.append('image', _uploadMeasurementFile);
        
        const uploadResponse = await fetch(`/api/images/catalog/${result.item.id}/measurement`, {
          method: "POST",
          body: formData,
        });
        
        if (!uploadResponse.ok) {
          console.warn("Measurement chart upload failed, but item was created successfully");
        }
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "catalog"] });
      setIsAddItemDialogOpen(false);
      form.reset();
      // Clear the file inputs
      const fileInput = document.getElementById('catalog-image-upload') as HTMLInputElement;
      const measurementInput = document.getElementById('measurement-chart-upload') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
        (fileInput as any).selectedFile = null;
      }
      if (measurementInput) {
        measurementInput.value = '';
        (measurementInput as any).selectedMeasurementFile = null;
      }
      toast({
        title: "Success",
        description: "Catalog item added successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add catalog item",
        variant: "destructive",
      });
    },
  });

  // Combine database categories with local state as fallback
  const allCategories = dbCategories.length > 0 ? dbCategories.map(cat => cat.name) : categories;
  
  // Combine database sports with local state as fallback
  const allSports = dbSports.length > 0 ? dbSports.map(sport => sport.name) : sports;

  // Add new category handler with database persistence
  const addNewCategory = async () => {
    if (!newCategory.trim()) return;
    
    try {
      const response = await fetch("/api/catalog-options/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newCategory.trim() }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to add category");
      }

      // Refresh categories from database
      await refetchCategories();
      
      form.setValue("category", newCategory.trim());
      setNewCategory("");
      setShowAddCategory(false);
      toast({
        title: "Success",
        description: `Category "${newCategory.trim()}" added successfully`,
      });
    } catch (error) {
      console.error("Error adding category:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add category",
        variant: "destructive",
      });
    }
  };

  // Add new sport handler with database persistence
  const addNewSport = async () => {
    if (!newSport.trim()) return;
    
    try {
      const response = await fetch("/api/catalog-options/sports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newSport.trim() }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to add sport");
      }

      // Refresh sports from database
      await refetchSports();
      
      form.setValue("sport", newSport.trim());
      setNewSport("");
      setShowAddSport(false);
      toast({
        title: "Success",
        description: `Sport "${newSport.trim()}" added successfully`,
      });
    } catch (error) {
      console.error("Error adding sport:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add sport",
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (data: CatalogItemForm) => {
    // Check if files were selected
    const fileInput = document.getElementById('catalog-image-upload') as HTMLInputElement;
    const measurementInput = document.getElementById('measurement-chart-upload') as HTMLInputElement;
    const selectedFile = (fileInput as any)?.selectedFile;
    const selectedMeasurementFile = (measurementInput as any)?.selectedMeasurementFile;

    // Convert 'none' back to empty string for manufacturer preference
    const processedData = {
      ...data,
      preferredManufacturerId: data.preferredManufacturerId === 'none' ? '' : data.preferredManufacturerId
    };

    if (selectedFile || selectedMeasurementFile) {
      // Create item first, then upload files
      addItemMutation.mutate({
        ...processedData,
        imageUrl: selectedFile ? "" : processedData.imageUrl, // Clear URL if uploading file
        measurementChartUrl: selectedMeasurementFile ? "" : processedData.measurementChartUrl,
        _uploadFile: selectedFile,
        _uploadMeasurementFile: selectedMeasurementFile
      });
    } else {
      // Normal submission with URLs
      addItemMutation.mutate(processedData);
    }
  };

  // Filter items
  const items = catalogItems || [];
  const filteredItems = items.filter((item: CatalogItem) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neon-blue">Product Catalog</h1>
          <p className="subtitle text-neon-green text-sm mt-2">
            Manage product catalog and inventory items
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
            <DialogTrigger asChild>
              <Button className="btn-primary">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-rich-black/90 backdrop-blur-md border border-glass-border max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-[90vw] md:w-[80vw] lg:w-[70vw]">
              <DialogHeader>
                <DialogTitle className="text-neon-blue flex items-center">
                  <Package className="mr-2 h-5 w-5" />
                  Add Catalog Item
                </DialogTitle>
                <DialogDescription className="subtitle text-neon-green">
                  Add a new item to the product catalog
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="subtitle text-muted-foreground text-xs">Product Name</FormLabel>
                          <FormControl>
                            <Input {...field} className="rich-input" placeholder="Enter product name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="sku"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="subtitle text-muted-foreground text-xs">
                            SKU
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                {...field} 
                                className="rich-input pr-16" 
                                placeholder="Enter SKU or use auto-generate"
                              />
                              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 hover:bg-neon-blue/20"
                                  onClick={regenerateSKU}
                                  disabled={!watchedName || !watchedCategory}
                                  title="Auto-generate SKU"
                                >
                                  <RefreshCw className="h-3 w-3 text-neon-blue" />
                                </Button>
                                <Package className="h-4 w-4 text-neon-green" />
                              </div>
                            </div>
                          </FormControl>
                          <FormDescription className="subtitle text-muted-foreground text-xs">
                            Enter your own SKU or click the refresh button to auto-generate
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Sport Selection with Add Button */}
                  <FormField
                    control={form.control}
                    name="sport"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="subtitle text-muted-foreground text-xs">Sport</FormLabel>
                        <div className="flex gap-2">
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="rich-input flex-1">
                                <SelectValue placeholder="Select sport" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {allSports.map((sport) => (
                                <SelectItem key={sport} value={sport}>
                                  {sport}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAddSport(true)}
                            className="px-3 whitespace-nowrap"
                          >
                            + Add Sport
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Unit Cost Field */}
                  <FormField
                    control={form.control}
                    name="unitCost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="subtitle text-muted-foreground text-xs">Unit Cost</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              {...field} 
                              type="number"
                              step="0.01"
                              className="rich-input pl-8" 
                              placeholder="0.00"
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                            <div className="absolute left-2 top-1/2 transform -translate-y-1/2">
                              <span className="text-neon-green text-sm">$</span>
                            </div>
                          </div>
                        </FormControl>
                        <FormDescription className="subtitle text-muted-foreground text-xs">
                          Cost for profit/loss calculations
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* ETA Field */}
                  <FormField
                    control={form.control}
                    name="etaDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="subtitle text-muted-foreground text-xs">ETA (Days)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              {...field} 
                              type="number"
                              className="rich-input pr-12" 
                              placeholder="7"
                            />
                            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                              <span className="text-muted-foreground text-xs">days</span>
                            </div>
                          </div>
                        </FormControl>
                        <FormDescription className="subtitle text-muted-foreground text-xs">
                          Expected production time
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Preferred Manufacturer */}
                  <FormField
                    control={form.control}
                    name="preferredManufacturerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="subtitle text-muted-foreground text-xs">Preferred Manufacturer</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="rich-input">
                              <SelectValue placeholder="Select manufacturer (optional)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">No preference</SelectItem>
                            {manufacturers.map((manufacturer: any) => (
                              <SelectItem key={manufacturer.id} value={manufacturer.id}>
                                {manufacturer.firstName} {manufacturer.lastName} - {manufacturer.company || 'No Company'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="subtitle text-muted-foreground text-xs">Category</FormLabel>
                          <Select value={field.value} onValueChange={(value) => {
                            if (value === "add-new-category") {
                              setShowAddCategory(true);
                            } else {
                              field.onChange(value);
                            }
                          }}>
                            <FormControl>
                              <SelectTrigger className="rich-input">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rich-card">
                              {allCategories.map((category) => (
                                <SelectItem key={category} value={category}>{category}</SelectItem>
                              ))}
                              <SelectItem value="add-new-category" className="text-neon-blue font-medium">
                                + Add Category
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="basePrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="subtitle text-muted-foreground text-xs">Base Price ($)</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number" 
                              step="0.01"
                              className="rich-input" 
                              placeholder="0.00"
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="subtitle text-muted-foreground text-xs">Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="rich-input">
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rich-card">
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                              <SelectItem value="discontinued">Discontinued</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="imageUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="subtitle text-muted-foreground text-xs">Product Image</FormLabel>
                          <FormControl>
                            <div className="space-y-3">
                              <Input {...field} className="rich-input" placeholder="Image URL (optional)" />
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>OR</span>
                              </div>
                              <ImageUploadArea
                                inputId="catalog-image-upload"
                                onFileSelect={(file) => {
                                  field.onChange("");
                                  const fileInput = document.getElementById('catalog-image-upload') as HTMLInputElement;
                                  if (fileInput) {
                                    (fileInput as any).selectedFile = file;
                                  }
                                }}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="subtitle text-muted-foreground text-xs">Tags</FormLabel>
                        <FormControl>
                          <Input {...field} className="rich-input" placeholder="tag1, tag2, tag3" />
                        </FormControl>
                        <FormDescription className="subtitle text-muted-foreground text-xs">
                          Separate tags with commas
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="specifications"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="subtitle text-muted-foreground text-xs">Specifications (JSON)</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            className="rich-input" 
                            placeholder='{"material": "Cotton", "weight": "200g"}'
                          />
                        </FormControl>
                        <FormDescription className="subtitle text-muted-foreground text-xs">
                          Enter specifications in JSON format
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Measurement Section */}
                  <div className="space-y-4 border-t border-glass-border pt-4">
                    <h3 className="text-lg font-medium text-neon-blue">Measurement Settings</h3>
                    
                    <FormField
                      control={form.control}
                      name="hasMeasurements"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border border-glass-border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Requires Measurements</FormLabel>
                            <FormDescription>
                              Check this if the item requires custom measurements from customers
                            </FormDescription>
                          </div>
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="accent-neon-blue"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {form.watch("hasMeasurements") && (
                      <>
                        <FormField
                          control={form.control}
                          name="measurementChartUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="subtitle text-muted-foreground text-xs">Measurement Chart</FormLabel>
                              <FormControl>
                                <div className="space-y-3">
                                  <Input {...field} className="rich-input" placeholder="Measurement chart URL (optional)" />
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>OR</span>
                                  </div>
                                  <ImageUploadArea
                                    inputId="measurement-chart-upload"
                                    onFileSelect={(file) => {
                                      field.onChange("");
                                      const fileInput = document.getElementById('measurement-chart-upload') as HTMLInputElement;
                                      if (fileInput) {
                                        (fileInput as any).selectedMeasurementFile = file;
                                      }
                                    }}
                                    uploadText="Upload measurement chart/template"
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="measurementInstructions"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="subtitle text-muted-foreground text-xs">Measurement Instructions</FormLabel>
                              <FormControl>
                                <Textarea 
                                  {...field} 
                                  className="rich-input"
                                  rows={4}
                                  placeholder="Enter detailed instructions for taking measurements..."
                                />
                              </FormControl>
                              <FormDescription className="subtitle text-muted-foreground text-xs">
                                Provide clear instructions for customers on how to take measurements
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-4 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsAddItemDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      className="btn-primary"
                      disabled={addItemMutation.isPending}
                    >
                      {addItemMutation.isPending ? "Adding..." : "Add Item"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Add Category Dialog */}
      <Dialog open={showAddCategory} onOpenChange={setShowAddCategory}>
        <DialogContent className="bg-rich-black/90 backdrop-blur-md border border-glass-border">
          <DialogHeader>
            <DialogTitle className="text-neon-blue">Add New Category</DialogTitle>
            <DialogDescription className="subtitle text-neon-green">
              Create a new product category
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Enter category name"
              className="rich-input"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addNewCategory();
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddCategory(false);
                  setNewCategory("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={addNewCategory}
                disabled={!newCategory.trim()}
                className="btn-primary"
              >
                Add Category
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Sport Dialog */}
      <Dialog open={showAddSport} onOpenChange={setShowAddSport}>
        <DialogContent className="bg-rich-black/90 backdrop-blur-md border border-glass-border">
          <DialogHeader>
            <DialogTitle className="text-neon-blue">Add New Sport</DialogTitle>
            <DialogDescription className="subtitle text-neon-green">
              Create a new sport category
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={newSport}
              onChange={(e) => setNewSport(e.target.value)}
              placeholder="Enter sport name"
              className="rich-input"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addNewSport();
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddSport(false);
                  setNewSport("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={addNewSport}
                disabled={!newSport.trim()}
                className="btn-primary"
              >
                Add Sport
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <Card className="rich-card">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                type="search" 
                placeholder="Search catalog..." 
                className="rich-input pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="rich-input w-40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="rich-card">
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                size="sm" 
                className="btn-secondary h-9" 
                onClick={() => queryClient.invalidateQueries({ queryKey: ["admin", "catalog"] })}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="animate-spin w-4 h-4 border-2 border-neon-blue border-t-transparent rounded-full mr-2" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Refresh
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-neon-blue border-t-transparent rounded-full" />
            </div>
          ) : isError ? (
            <div className="flex justify-center py-8 text-center">
              <div className="max-w-md">
                <h3 className="text-lg font-medium mb-2 text-foreground">Unable to load catalog</h3>
                <p className="text-muted-foreground">There was an error fetching catalog data. Please try again later.</p>
              </div>
            </div>
          ) : filteredItems && filteredItems.length > 0 ? (
            <div className="rounded-md border border-glass-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-foreground">Product</TableHead>
                    <TableHead className="text-foreground">SKU</TableHead>
                    <TableHead className="text-foreground">Category</TableHead>
                    <TableHead className="text-foreground">Base Price</TableHead>
                    <TableHead className="text-foreground">Status</TableHead>
                    <TableHead className="text-right text-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item: CatalogItem) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          {item.imageUrl ? (
                            <img 
                              src={item.imageUrl} 
                              alt={item.name}
                              className="w-10 h-10 object-cover border border-glass-border"
                            />
                          ) : (
                            <div className="w-10 h-10 glass-panel flex items-center justify-center">
                              <ImageIcon className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-foreground">{item.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {item.sport} • ETA: {item.etaDays} days
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground font-mono text-sm">{item.sku}</TableCell>
                      <TableCell className="text-foreground">{item.category}</TableCell>
                      <TableCell className="text-foreground">${item.basePrice.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={item.status === 'active' ? 'default' : 'secondary'}
                          className={
                            item.status === 'active' ? 'bg-neon-green text-rich-black' :
                            item.status === 'inactive' ? 'bg-yellow-500 text-rich-black' :
                            'bg-red-500 text-white'
                          }
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rich-card">
                            <DropdownMenuLabel className="text-foreground">Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-foreground hover:glass-panel">
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-foreground hover:glass-panel">
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Item
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center border border-glass-border">
              <div className="glass-panel p-3 mb-4">
                <Package className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2 text-foreground">No catalog items found</h3>
              <p className="text-muted-foreground max-w-md mb-6">
                There are no items in the catalog yet. Add your first product to get started.
              </p>
              <Button 
                onClick={() => setIsAddItemDialogOpen(true)}
                className="btn-primary"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add First Item
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}