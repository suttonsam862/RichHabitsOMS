import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Edit, Trash2, Package, DollarSign, Tag, Users, AlertCircle, RefreshCw, Image as ImageIcon, PlusCircle, MoreHorizontal, Eye, Search, Trophy, Shirt, Zap, Mountain, Car, Waves, Dumbbell, Target, TreePine, Gamepad2, Shield, Activity } from 'lucide-react';
import { ErrorBoundary } from '@/components/ui/error-boundary';

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
  measurementChartUrl?: string;
  hasMeasurements?: boolean;
  measurementInstructions?: string;
  etaDays: string;
  preferredManufacturerId?: string;
  tags?: string[];
  specifications?: Record<string, any>;
  buildInstructions?: string;
  created_at?: string;
  updated_at?: string;
}

const catalogItemSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name too long"),
  category: z.string().min(1, "Category is required").max(100, "Category name too long"),
  sport: z.string().min(1, "Sport is required").max(100, "Sport name too long"),
  basePrice: z.number().min(0.01, "Price must be greater than $0.00").max(999999.99, "Price too high"),
  unitCost: z.number().min(0, "Unit cost cannot be negative").max(999999.99, "Unit cost too high"),
  sku: z.string().min(3, "SKU must be at least 3 characters").max(100, "SKU too long").regex(/^[A-Z0-9\-_]+$/i, "SKU can only contain letters, numbers, hyphens, and underscores"),
  status: z.enum(['active', 'inactive', 'discontinued']).default('active'),
  imageUrl: z.string().url("Invalid URL format").optional().or(z.literal("")),
  measurementChartUrl: z.string().url("Invalid URL format").optional().or(z.literal("")),
  hasMeasurements: z.boolean().default(false),
  measurementInstructions: z.string().max(1000, "Instructions too long").optional(),
  etaDays: z.string().min(1, "ETA is required").regex(/^\d+$/, "ETA must be a number"),
  preferredManufacturerId: z.string().optional(),
  tags: z.string().max(500, "Tags too long").optional(),
  specifications: z.string().refine((val) => {
    if (!val || val.trim() === '') return true;
    try {
      JSON.parse(val);
      return true;
    } catch {
      return false;
    }
  }, "Specifications must be valid JSON").optional(),
  buildInstructions: z.string().max(10000, "Build instructions too long (max 10,000 characters)").optional(),
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
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
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

// Sport icon mapping
const getSportIcon = (sport: string) => {
  const sportLower = sport.toLowerCase();
  if (sportLower.includes('basketball')) return Trophy;
  if (sportLower.includes('football')) return Shield;
  if (sportLower.includes('soccer')) return Target;
  if (sportLower.includes('baseball')) return Activity;
  if (sportLower.includes('tennis')) return Gamepad2;
  if (sportLower.includes('golf')) return TreePine;
  if (sportLower.includes('swimming')) return Waves;
  if (sportLower.includes('running') || sportLower.includes('track')) return Mountain;
  if (sportLower.includes('cycling')) return Car;
  if (sportLower.includes('volleyball')) return Dumbbell;
  if (sportLower.includes('hockey')) return Zap;
  if (sportLower.includes('wrestling')) return Shield;
  return Package; // Default icon for "All Around Item" and others
};

// Category icon mapping
const getCategoryIcon = (category: string) => {
  const categoryLower = category.toLowerCase();
  if (categoryLower.includes('shirt') || categoryLower.includes('jersey')) return Shirt;
  if (categoryLower.includes('hoodie') || categoryLower.includes('jacket')) return Package;
  if (categoryLower.includes('polo')) return Shirt;
  if (categoryLower.includes('pants') || categoryLower.includes('shorts')) return Package;
  if (categoryLower.includes('accessories') || categoryLower.includes('hat')) return Tag;
  if (categoryLower.includes('custom')) return Users;
  return Package; // Default icon
};

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

function CatalogPageContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [categories, setCategories] = useState<string[]>([]);
  const [sports, setSports] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [isViewDetailsDialogOpen, setIsViewDetailsDialogOpen] = useState(false);
  const [isEditItemDialogOpen, setIsEditItemDialogOpen] = useState(false);

  // Fetch categories and sports from API
  useEffect(() => {
    const fetchCatalogOptions = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const [categoriesRes, sportsRes] = await Promise.all([
          fetch('/api/catalog-options/categories', {
            headers: { 'Authorization': `Bearer ${token}` },
            credentials: 'include'
          }),
          fetch('/api/catalog-options/sports', {
            headers: { 'Authorization': `Bearer ${token}` },
            credentials: 'include'
          })
        ]);

        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json();
          setCategories(categoriesData.data.categories.map((cat: any) => cat.name));
        }

        if (sportsRes.ok) {
          const sportsData = await sportsRes.json();
          setSports(sportsData.data.sports.map((sport: any) => sport.name));
        }
      } catch (error) {
        console.error('Error fetching catalog options:', error);
      }
    };

    fetchCatalogOptions();
  }, []);
  const [newCategory, setNewCategory] = useState("");
  const [newSport, setNewSport] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddSport, setShowAddSport] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const authToken = localStorage.getItem('authToken');

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
      buildInstructions: "",
    },
    mode: "onChange", // Enable real-time validation
  });

  // Form validation helper
  const validateFormState = () => {
    const formData = form.getValues();
    const errors = [];

    if (!formData.name?.trim()) errors.push("Product name is required");
    if (!formData.category?.trim()) errors.push("Category is required");
    if (!formData.sport?.trim()) errors.push("Sport is required");
    if (!formData.sku?.trim()) errors.push("SKU is required");
    if (formData.basePrice <= 0) errors.push("Base price must be greater than $0");
    if (formData.unitCost < 0) errors.push("Unit cost cannot be negative");
    if (!formData.etaDays?.trim()) errors.push("ETA is required");

    return errors;
  };

  // Watch name and category for manual SKU generation
  const watchedName = form.watch("name");
  const watchedCategory = form.watch("category");

  // Function to manually regenerate SKU with improved uniqueness check
  const regenerateSKU = async () => {
    const name = form.getValues("name");
    const category = form.getValues("category");
    if (!name || !category) {
      toast({
        title: "Missing Information",
        description: "Please enter product name and select category first",
        variant: "destructive",
      });
      return;
    }

    try {
      let attempts = 0;
      const maxAttempts = 15;
      const token = localStorage.getItem('authToken');

      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please log in again to generate SKU",
          variant: "destructive",
        });
        return;
      }

      // Generate SKUs with increasing randomness until unique
      while (attempts < maxAttempts) {
        // Add more randomness for subsequent attempts
        const extraRandomness = attempts > 0 ? Math.random().toString(36).substring(2, 5).toUpperCase() : '';
        const newSKU = generateSKU(category, name) + extraRandomness;

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          const response = await fetch(`/api/catalog/check-sku?sku=${encodeURIComponent(newSKU)}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (response.status === 401) {
            // Token expired, clear auth and reload
            localStorage.removeItem('authToken');
            localStorage.removeItem('tokenExpires');
            window.location.reload();
            throw new Error("Authentication expired. Please log in again.");
          }

          if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
          }

          const result = await response.json();
          if (!result.exists) {
            form.setValue("sku", newSKU);
            toast({
              title: "SKU Generated",
              description: `Generated unique SKU: ${newSKU}`,
            });
            return;
          }
        } catch (error: unknown) {
          if ((error as Error).name === 'AbortError') {
            console.warn('SKU check timed out, attempt:', attempts + 1);
          } else {
            console.warn('SKU check failed:', error);
          }
        }

        attempts++;
        // Exponential backoff for retries
        await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(2, attempts), 5000)));
      }

      // Final fallback with timestamp for uniqueness
      const fallbackSKU = generateSKU(category, name) + '-' + Date.now().toString().slice(-8);
      form.setValue("sku", fallbackSKU);
      toast({
        title: "SKU Generated",
        description: `Generated SKU: ${fallbackSKU} (uniqueness not verified due to server issues)`,
        variant: "default",
      });
    } catch (error) {
      console.error('Error generating SKU:', error);
      const errorSKU = generateSKU(category, name) + '-ERR' + Math.random().toString(36).substring(2, 6).toUpperCase();
      form.setValue("sku", errorSKU);
      toast({
        title: "SKU Generated with Errors",
        description: `Generated fallback SKU: ${errorSKU}. Please verify uniqueness manually.`,
        variant: "destructive",
      });
    }
  };

  // Fetch catalog items with optimized query
  const { data: catalogItems, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "catalog"],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.error('❌ No authentication token found');
        throw new Error("No authentication token");
      }

      console.log('🔍 Fetching catalog items...');
      console.log('🔑 Using token:', token.substring(0, 20) + '...');

      // Add timestamp to prevent caching issues
      const timestamp = Date.now();
      const response = await fetch(`/api/catalog?_t=${timestamp}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('tokenExpires');
          window.location.href = '/login';
          throw new Error("Authentication failed");
        }
        throw new Error(`Failed to fetch catalog items: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📊 Raw catalog data received:', data);
      console.log('📊 Response status:', response.status);
      console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!Array.isArray(data)) {
        console.warn('⚠️ Expected array but got:', typeof data, data);
        if (data && data.message) {
          console.error('🚨 API Error Message:', data.message);
        }
        return [];
      }

      // Transform the data to match the CatalogItem type
      const transformedItems = data.map((item: any) => {
        // Safely parse basePrice with fallback
        let basePrice = 0;
        try {
          const rawBasePrice = item.basePrice ?? item.base_price;
          if (rawBasePrice != null) {
            const parsed = parseFloat(String(rawBasePrice));
            basePrice = isNaN(parsed) ? 0 : parsed;
          }
        } catch (error) {
          console.warn('Error parsing basePrice for item:', item.id, error);
          basePrice = 0;
        }

        // Safely parse unitCost with fallback
        let unitCost = 0;
        try {
          const rawUnitCost = item.unitCost ?? item.unit_cost;
          if (rawUnitCost != null) {
            const parsed = parseFloat(String(rawUnitCost));
            unitCost = isNaN(parsed) ? 0 : parsed;
          }
        } catch (error) {
          console.warn('Error parsing unitCost for item:', item.id, error);
          unitCost = 0;
        }

        return {
          id: item.id,
          name: item.name,
          category: item.category,
          sport: item.sport,
          basePrice,
          unitCost,
          sku: item.sku,
          status: item.status,
          imageUrl: item.imageUrl || item.image_url,
          measurementChartUrl: item.measurementChartUrl || item.measurement_chart_url,
          hasMeasurements: item.hasMeasurements || item.has_measurements,
          measurementInstructions: item.measurementInstructions || item.measurement_instructions,
          etaDays: item.etaDays || item.eta_days,
          preferredManufacturerId: item.preferredManufacturerId || item.preferred_manufacturer_id,
          tags: item.tags || [],
          specifications: item.specifications || {},
          buildInstructions: item.buildInstructions || item.build_instructions,
          created_at: item.created_at,
          updated_at: item.updated_at,
        };
      });

      return transformedItems;
    },
    staleTime: 0, // Always refetch for real-time updates
    gcTime: 30 * 1000, // 30 seconds cache time
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: (failureCount, error) => {
      if (error?.message?.includes('Authentication failed')) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // Fetch manufacturers only
  const { data: manufacturersData, isError: manufacturersError, isLoading: manufacturersLoading } = useQuery({
    queryKey: ["admin", "manufacturers"],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error("No authentication token");
      }

      const response = await fetch("/api/users/manufacturers", {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Authentication failed");
        }
        throw new Error(`Failed to fetch manufacturers: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    },
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false
  });

  // Safe fallback for manufacturers data - only manufacturer role users
  const manufacturers = React.useMemo(() => {
    if (manufacturersError) {
      console.warn('Manufacturers data error:', manufacturersError);
      return [];
    }

    if (!manufacturersData) {
      return [];
    }

    // Handle both array response and object with users property
    if (Array.isArray(manufacturersData)) {
      return manufacturersData.filter((user: any) => user.role === 'manufacturer');
    }

    if (manufacturersData.users && Array.isArray(manufacturersData.users)) {
      return manufacturersData.users.filter((user: any) => user.role === 'manufacturer');
    }

    return [];
  }, [manufacturersData, manufacturersError]);

  // Fetch categories from database
  const { data: dbCategories = [], refetch: refetchCategories } = useQuery({
    queryKey: ["admin", "catalog-categories"],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch("/api/catalog-options/categories", {
        headers,
        credentials: "include"
      });
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
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch("/api/catalog-options/sports", {
        headers,
        credentials: "include"
      });
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
        tags: itemData.tags ? itemData.tags.split(",").map(tag => tag.trim()).filter(tag => tag.length > 0) : [],
        specifications: itemData.specifications && itemData.specifications.trim() ? 
          (() => {
            try {
              return JSON.parse(itemData.specifications);
            } catch (error) {
              throw new Error("Invalid JSON in specifications field");
            }
          })() : {},
        build_instructions: itemData.buildInstructions,
      };

      const token = localStorage.getItem('authToken') || localStorage.getItem('token');

      // Create the catalog item first
      const response = await fetch("/api/catalog", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        // Token expired, clear auth and reload
        localStorage.removeItem('authToken');
        localStorage.removeItem('tokenExpires');
        window.location.reload();
        throw new Error("Authentication expired. Please log in again.");
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to add catalog item");
      }

      const result = await response.json();

      // Upload product image if provided
      if (_uploadFile && result.item?.id) {
        const formData = new FormData();
        formData.append('image', _uploadFile);

        const uploadResponse = await fetch(`/api/images/catalog/${result.item.id}`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
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
          headers: {
            "Authorization": `Bearer ${token}`,
          },
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

      // Clear the file inputs and preview states
      const fileInput = document.getElementById('catalog-image-upload') as HTMLInputElement;
      const measurementInput = document.getElementById('measurement-chart-upload') as HTMLInputElement;

      // Clear file inputs and custom properties
      [fileInput, measurementInput].forEach(input => {
        if (input) {
          input.value = '';
          (input as any).selectedFile = null;
          (input as any).selectedMeasurementFile = null;
        }
      });

      // Force re-render of ImageUploadArea components by clearing their state
      const imageUploadElements = document.querySelectorAll('[data-image-preview]');
      imageUploadElements.forEach(element => {
        const img = element.querySelector('img');
        if (img && img.src.startsWith('blob:')) {
          URL.revokeObjectURL(img.src);
        }
      });

      toast({
        title: "Success",
        description: "Catalog item and images uploaded successfully",
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

  // Delete item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error("No authentication token available");
      }

      const response = await fetch(`/api/catalog/${itemId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
        credentials: 'include'
      });

      if (response.status === 401) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('tokenExpires');
        window.location.reload();
        throw new Error("Authentication expired. Please log in again.");
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to delete catalog item");
      }

      return { success: true, itemId };
    },
    onMutate: async (itemId) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ["admin", "catalog"] });

      // Snapshot the previous value
      const previousCatalog = queryClient.getQueryData(["admin", "catalog"]);

      // Optimistically remove the item from the cache
      queryClient.setQueryData(["admin", "catalog"], (old: CatalogItem[] | undefined) => {
        if (!old) return [];
        return old.filter(item => item.id !== itemId);
      });

      // Return a context object with the snapshotted value
      return { previousCatalog };
    },
    onError: (error, itemId, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousCatalog) {
        queryClient.setQueryData(["admin", "catalog"], context.previousCatalog);
      }

      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete catalog item",
        variant: "destructive",
      });
    },
    onSuccess: (data, itemId) => {
      toast({
        title: "Success",
        description: "Catalog item deleted successfully",
      });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ["admin", "catalog"] });
    },
  });

  // Handle dropdown actions
  const handleViewDetails = (item: CatalogItem) => {
    setSelectedItem(item);
    setIsViewDetailsDialogOpen(true);
  };

  const handleEditItem = (item: CatalogItem) => {
    setSelectedItem(item);
    // Populate form with existing data
    form.reset({
      name: item.name,
      category: item.category,
      sport: item.sport,
      basePrice: item.basePrice,
      unitCost: item.unitCost,
      sku: item.sku,
      status: item.status,
      imageUrl: item.imageUrl || "",
      measurementChartUrl: item.measurementChartUrl || "",
      hasMeasurements: item.hasMeasurements || false,
      measurementInstructions: item.measurementInstructions || "",
      etaDays: item.etaDays,
      preferredManufacturerId: item.preferredManufacturerId || "",
      tags: Array.isArray(item.tags) ? item.tags.join(", ") : "",
      specifications: item.specifications ? JSON.stringify(item.specifications, null, 2) : "",
      buildInstructions: item.buildInstructions || "",
    });
    setIsEditItemDialogOpen(true);
  };

  const [deleteConfirmItem, setDeleteConfirmItem] = useState<CatalogItem | null>(null);

  const handleDeleteItem = (item: CatalogItem) => {
    setDeleteConfirmItem(item);
  };

  const confirmDelete = () => {
    if (deleteConfirmItem) {
      deleteItemMutation.mutate(deleteConfirmItem.id);
      setDeleteConfirmItem(null);
    }
  };

  // Combine database categories with local state as fallback and ensure uniqueness
  const allCategories = React.useMemo(() => {
    const dbCats = dbCategories.length > 0 ? dbCategories.map((cat: any) => cat.name) : [];
    const localCats = categories || [];
    const combined = [...new Set([...dbCats, ...localCats])];
    return combined.sort();
  }, [dbCategories, categories]);

  // Combine database sports with local state as fallback and ensure uniqueness
  const allSports = React.useMemo(() => {
    const dbSportsNames = dbSports.length > 0 ? dbSports.map((sport: any) => sport.name) : [];
    const localSports = sports || [];
    const combined = [...new Set([...dbSportsNames, ...localSports])];
    return combined.sort();
  }, [dbSports, sports]);

  // Add new category handler with database persistence
  const addNewCategory = async () => {
    if (!newCategory.trim()) return;

    try {
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch("/api/catalog-options/categories", {
        method: "POST",
        headers,
        credentials: "include",
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
        description: error instanceof Error ? error.message : "Failed to add category",
        variant: "destructive",
      });
    }
  };

  // Add new sport handler with database persistence
  const addNewSport = async () => {
    if (!newSport.trim()) return;

    try {
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch("/api/catalog-options/sports", {
        method: "POST",
        headers,
        credentials: "include",
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
        description: error instanceof Error ? error.message : "Failed to add sport",
        variant: "destructive",
      });
    }
  };

  const handleAddSport = async (sportName: string) => {
    try {
      console.log('Adding sport:', sportName);

      const response = await fetch('/api/catalog-options/sports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ name: sportName })
      });

      if (response.ok) {
        setSports(prev => [...prev, sportName]);
        console.log('Sport added successfully');
      } else {
        const errorData = await response.json();
        console.error('Failed to add sport:', errorData.message);
      }
    } catch (error) {
      console.error('Error adding sport:', error);
    }
  };

  const handleAddCategory = async (categoryName: string) => {
    try {
      console.log('Adding category:', categoryName);

      const response = await fetch('/api/catalog-options/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ name: categoryName })
      });

      if (response.ok) {
        setCategories(prev => [...prev, categoryName]);
        console.log('Category added successfully');
      } else {
        const errorData = await response.json();
        console.error('Failed to add category:', errorData.message);
      }
    } catch (error) {
      console.error('Error adding category:', error);
    }
  };

  // Update item mutation
  const updateItemMutation = useMutation({
    mutationFn: async (data: CatalogItemForm & { itemId: string }) => {
      const { itemId, ...itemData } = data;

      const payload = {
        ...itemData,
        tags: itemData.tags ? itemData.tags.split(",").map(tag => tag.trim()).filter(tag => tag.length > 0) : [],
        specifications: itemData.specifications && itemData.specifications.trim() ? 
          (() => {
            try {
              return JSON.parse(itemData.specifications);
            } catch (error) {
              throw new Error("Invalid JSON in specifications field");
            }
          })() : {},
        buildInstructions: itemData.buildInstructions, // Use camelCase
      };

      console.log('Update payload being sent:', payload);

      const token = localStorage.getItem('authToken');

      if (!token) {
        throw new Error("Authentication token not found");
      }

      const response = await fetch(`/api/catalog/${itemId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('tokenExpires');
        window.location.reload();
        throw new Error("Authentication expired. Please log in again.");
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Update failed:', response.status, errorData);

        // Handle specific database column errors
        if (errorData.message && errorData.message.includes('build_instructions')) {
          throw new Error("Database schema issue: build_instructions column not found. Please contact administrator.");
        }

        throw new Error(errorData.message || `Failed to update catalog item (${response.status})`);
      }

      const result = await response.json();
      console.log('Update response:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('Update mutation succeeded:', data);
      queryClient.invalidateQueries({ queryKey: ["admin", "catalog"] });
      setIsEditItemDialogOpen(false);
      setIsAddItemDialogOpen(false);
      setSelectedItem(null);
      form.reset();

      toast({
        title: "Success",
        description: "Catalog item updated successfully",
      });
    },
    onError: (error) => {
      console.error('Update mutation failed:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update catalog item",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: CatalogItemForm) => {
    // Comprehensive form validation before submission
    try {
      // Validate SKU format and uniqueness (only for new items)
      if (!selectedItem && (!data.sku || data.sku.trim().length < 3)) {
        toast({
          title: "Invalid SKU",
          description: "SKU must be at least 3 characters long",
          variant: "destructive",
        });
        return;
      }

      // Validate JSON specifications if provided
      if (data.specifications && data.specifications.trim()) {
        try {
          const parsedSpecs = JSON.parse(data.specifications);
          // Ensure it's an object, not a primitive
          if (typeof parsedSpecs !== 'object' || parsedSpecs === null || Array.isArray(parsedSpecs)) {
            throw new Error("Specifications must be a JSON object");
          }
        } catch (error) {
          toast({
            title: "Invalid JSON",
            description: "Specifications must be valid JSON object format",
            variant: "destructive",
          });
          return;
        }
      }

      // Validate category and sport selections
      if (!allCategories.includes(data.category)) {
        toast({
          title: "Invalid Category",
          description: "Please select a valid category from the list",
          variant: "destructive",
        });
        return;
      }

      if (!allSports.includes(data.sport)) {
        toast({
          title: "Invalid Sport",
          description: "Please select a valid sport from the list",
          variant: "destructive",
        });
        return;
      }

      // Validate measurement requirements only if measurements are required
      if (data.hasMeasurements) {
        const fileInput = document.getElementById('measurement-chart-upload') as HTMLInputElement;
        const selectedMeasurementFile = (fileInput as any)?.selectedMeasurementFile;

        // Allow if there's either instructions, a URL, or an uploaded file
        const hasInstructions = data.measurementInstructions?.trim();
        const hasChartUrl = data.measurementChartUrl?.trim();
        const hasUploadedFile = selectedMeasurementFile;

        if (!hasInstructions && !hasChartUrl && !hasUploadedFile) {
          toast({
            title: "Missing Measurement Info",
            description: "Items requiring measurements must have either instructions or a measurement chart image",
            variant: "destructive",
          });
          return;
        }
      }

      // Process and clean data
      const processedData = {
        ...data,
        preferredManufacturerId: data.preferredManufacturerId === 'none' ? '' : data.preferredManufacturerId,
        tags: data.tags?.trim() || '',
        buildInstructions: data.buildInstructions?.trim() || '',
        measurementInstructions: data.measurementInstructions?.trim() || '',
        name: data.name.trim(),
        sku: data.sku.trim().toUpperCase(),
        etaDays: data.etaDays.trim(),
        hasMeasurements: Boolean(data.hasMeasurements) // Ensure it's a proper boolean
      };

      // Check if we're editing an existing item
      if (selectedItem) {
        // Update existing item
        updateItemMutation.mutate({
          ...processedData,
          itemId: selectedItem.id
        });
      } else {
        // Check for file uploads for new items
        const fileInput = document.getElementById('catalog-image-upload') as HTMLInputElement;
        const measurementInput = document.getElementById('measurement-chart-upload') as HTMLInputElement;
        const selectedFile = (fileInput as any)?.selectedFile;
        const selectedMeasurementFile = (measurementInput as any)?.selectedMeasurementFile;

        // Validate file sizes if present
        if (selectedFile && selectedFile.size > 5 * 1024 * 1024) {
          toast({
            title: "File Too Large",
            description: "Product image must be less than 5MB",
            variant: "destructive",
          });
          return;
        }

        if (selectedMeasurementFile && selectedMeasurementFile.size > 5 * 1024 * 1024) {
          toast({
            title: "File Too Large",
            description: "Measurement chart must be less than 5MB",
            variant: "destructive",
          });
          return;
        }

        // Create new item with or without file uploads
        try {
          if (selectedFile || selectedMeasurementFile) {
            addItemMutation.mutate({
              ...processedData,
              imageUrl: selectedFile ? "" : processedData.imageUrl,
              measurementChartUrl: selectedMeasurementFile ? "" : processedData.measurementChartUrl,
              _uploadFile: selectedFile,
              _uploadMeasurementFile: selectedMeasurementFile
            });
          } else {
            addItemMutation.mutate(processedData);
          }
        } catch (error) {
          console.error('Error submitting form:', error);
          toast({
            title: "Submission Error",
            description: "An unexpected error occurred while submitting the form",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Form submission validation error:', error);
      toast({
        title: "Submission Error",
        description: "Please check all fields and try again",
        variant: "destructive",
      });
    }
  };

  // Filter and sort items with automatic categorization
  const items = catalogItems || [];
  const filteredItems = items
    .filter((item: CatalogItem) => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.sport.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (item.tags && item.tags.some((tag: string) => tag.toLowerCase().includes(searchTerm.toLowerCase())));

      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;

      return matchesSearch && matchesCategory;
    })
    .sort((a: CatalogItem, b: CatalogItem) => {
      // Primary sort: Sport (alphabetical, but "All Around Item" first)
      const aSport = a.sport === "All Around Item" ? "0" : a.sport;
      const bSport = b.sport === "All Around Item" ? "0" : b.sport;
      const sportCompare = aSport.localeCompare(bSport);
      if (sportCompare !== 0) return sportCompare;

      // Secondary sort: Category (alphabetical)
      const categoryCompare = a.category.localeCompare(b.category);
      if (categoryCompare !== 0) return categoryCompare;

      // Tertiary sort: Name (alphabetical)
      return a.name.localeCompare(b.name);
    });

  // Group items by sport for display
  const groupedItems = React.useMemo(() => {
    const groups: { [sport: string]: CatalogItem[] } = {};
    filteredItems.forEach((item: CatalogItem) => {
      if (!groups[item.sport]) {
        groups[item.sport] = [];
      }
      groups[item.sport].push(item);
    });
    return groups;
  }, [filteredItems]);

  // Fetch categories and sports on component mount
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        console.log('🔍 Fetching catalog options...');
        const [categoriesRes, sportsRes] = await Promise.all([
          fetch('/api/catalog-options/categories', {
            headers: { 
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            },
            credentials: 'include'
          }),
          fetch('/api/catalog-options/sports', {
            headers: { 
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            },
            credentials: 'include'
          })
        ]);

        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json();
          console.log('📂 Categories response:', categoriesData);
          const categoryList = categoriesData.data?.categories || [];
          console.log('📂 Setting categories:', categoryList);
          setCategories(categoryList);
        } else {
          console.error('❌ Categories fetch failed:', categoriesRes.status, categoriesRes.statusText);
        }

        if (sportsRes.ok) {
          const sportsData = await sportsRes.json();
          console.log('⚽ Sports response:', sportsData);
          const sportsList = sportsData.data?.sports || [];
          console.log('⚽ Setting sports:', sportsList);
          setSports(sportsList);
        } else {
          console.error('❌ Sports fetch failed:', sportsRes.status, sportsRes.statusText);
        }
      } catch (error) {
        console.error('❌ Error fetching options:', error);
      }
    };

    if (authToken) {
      fetchOptions();
    }
  }, [authToken]);

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
                              {allSports.length > 0 ? (
                                allSports.map((sport: string) => (
                                  <SelectItem key={sport} value={sport}>
                                    {sport}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="loading" disabled>
                                  Loading sports...
                                </SelectItem>
                              )}
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
                              {allCategories.length > 0 ? (
                                <>
                                  {allCategories.map((category: string) => (
                                    <SelectItem key={category} value={category}>{category}</SelectItem>
                                  ))}
                                  <SelectItem value="add-new-category" className="text-neon-blue font-medium">
                                    + Add Category
                                  </SelectItem>
                                </>
                              ) : (
                                <SelectItem value="loading" disabled>
                                  Loading categories...
                                </SelectItem>
                              )}
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
                    name="buildInstructions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="subtitle text-muted-foreground text-xs">Build Instructions</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            className="rich-input" 
                            placeholder="Enter detailed build instructions for this item..."
                          />
                        </FormControl>
                        <FormDescription className="subtitle text-muted-foreground text-xs">
                          Provide step-by-step instructions for manufacturing this item
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
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
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
                      disabled={addItemMutation.isPending || updateItemMutation.isPending}
                    >
                      {(addItemMutation.isPending || updateItemMutation.isPending) ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {selectedItem ? "Updating..." : "Adding..."}
                    </>
                  ) : (
                    selectedItem ? "Update Item" : "Add Item"
                  )}
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

      {/* View Details Dialog */}
      <Dialog open={isViewDetailsDialogOpen} onOpenChange={setIsViewDetailsDialogOpen}>
        <DialogContent className="bg-rich-black/90 backdrop-blur-md border border-glass-border max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-neon-blue flex items-center">
              <Eye className="mr-2 h-5 w-5" />
              Item Details
            </DialogTitle>
            <DialogDescription className="subtitle text-neon-green">
              Detailed information for {selectedItem?.name}
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-6 p-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Product Image */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Product Image</h3>
                  {selectedItem.imageUrl ? (
                    <img 
                      src={selectedItem.imageUrl} 
                      alt={selectedItem.name}
                      className="w-full h-48 object-cover rounded-lg border border-glass-border"
                      onError={(e) => {
                        console.log('Detail view image failed to load:', selectedItem.imageUrl);
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`w-full h-48 glass-panel flex items-center justify-center rounded-lg ${selectedItem.imageUrl ? 'hidden' : ''}`}>
                    <ImageIcon className="h-12 w-12 text-muted-foreground" />
                  </div>
                </div>

                {/* Basic Info */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Basic Information</h3>
                    <div className="mt-2 space-y-2">
                      <div className="flex justify-between"><span className="text-sm text-muted-foreground">Name:</span>
                        <span className="text-sm text-foreground font-medium">{selectedItem.name}</span>
                      </div>
                                            <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">SKU:</span>
                        <span className="text-sm text-foreground font-mono">{selectedItem.sku}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Category:</span>
                        <span className="text-sm text-foreground">{selectedItem.category}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Sport:</span>
                        <span className="text-sm text-foreground">{selectedItem.sport}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Status:</span>
                        <Badge 
                          variant={selectedItem.status === 'active' ? 'default' : 'secondary'}
                          className={
                            selectedItem.status === 'active' ? 'bg-neon-green text-rich-black' :
                            selectedItem.status === 'inactive' ? 'bg-yellow-500 text-rich-black' :
                            'bg-red-500 text-white'
                          }
                        >
                          {selectedItem.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pricing and Logistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-panel p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Base Price</h4>
                  <p className="text-2xl font-bold text-neon-green">${selectedItem.basePrice?.toFixed(2) || '0.00'}</p>
                </div>
                <div className="glass-panel p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Unit Cost</h4>
                  <p className="text-2xl font-bold text-neon-blue">${selectedItem.unitCost?.toFixed(2) || '0.00'}</p>
                </div>
                <div className="glass-panel p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">ETA</h4>
                  <p className="text-2xl font-bold text-foreground">{selectedItem.etaDays} days</p>
                </div>
              </div>

              {/* Measurements */}
              {selectedItem.hasMeasurements && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">Measurements</h3>
                  <div className="glass-panel p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs bg-neon-blue text-rich-black px-2 py-1 rounded">Requires Measurements</span>
                    </div>
                    {selectedItem.measurementInstructions && (
                      <div className="mt-3">
                        <h4 className="text-xs font-medium text-muted-foreground mb-1">Instructions:</h4>
                        <p className="text-sm text-foreground">{selectedItem.measurementInstructions}</p>
                      </div>
                    )}
                    {selectedItem.measurementChartUrl && (
                      <div className="mt-3">
                        <h4 className="text-xs font-medium text-muted-foreground mb-1">Measurement Chart:</h4>
                        <a 
                          href={selectedItem.measurementChartUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-neon-blue hover:underline text-sm"
                        >
                          View Chart
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tags and Specifications */}
              {((selectedItem.tags && selectedItem.tags.length > 0) || selectedItem.specifications) && (
                <div className="space-y-4">
                  {selectedItem.tags && selectedItem.tags.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">Tags</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedItem.tags?.map((tag: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedItem.specifications && Object.keys(selectedItem.specifications).length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">Specifications</h3>
                      <div className="glass-panel p-3 rounded-lg">
                        <pre className="text-xs text-foreground overflow-x-auto">
                          {JSON.stringify(selectedItem.specifications, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                   {selectedItem.buildInstructions && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">Build Instructions</h3>
                      <div className="glass-panel p-3 rounded-lg">
                        <pre className="text-xs text-foreground overflow-x-auto">
                          {selectedItem.buildInstructions}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setIsViewDetailsDialogOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={isEditItemDialogOpen} onOpenChange={setIsEditItemDialogOpen}>
        <DialogContent className="bg-rich-black/90 backdrop-blur-md border border-glass-border max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-[90vw] md:w-[80vw] lg:w-[70vw]">
          <DialogHeader>
            <DialogTitle className="text-neon-blue flex items-center">
              <Edit className="mr-2 h-5 w-5" />
              Edit Catalog Item
            </DialogTitle>
            <DialogDescription className="subtitle text-neon-green">
              Make changes to {selectedItem?.name}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-1">
              {/* Same form fields as Add Item, but populated with existing data */}
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
                      <FormLabel className="subtitle text-muted-foreground text-xs">SKU</FormLabel>
                      <FormControl>
                        <Input {...field} className="rich-input" placeholder="SKU" readOnly />
                      </FormControl>
                      <FormDescription className="subtitle text-muted-foreground text-xs">
                        SKU cannot be changed after creation
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
                              {allCategories.length > 0 ? (
                                <>
                                  {allCategories.map((category: string) => (
                                    <SelectItem key={category} value={category}>{category}</SelectItem>
                                  ))}
                                  <SelectItem value="add-new-category" className="text-neon-blue font-medium">
                                    + Add Category
                                  </SelectItem>
                                </>
                              ) : (
                                <SelectItem value="loading" disabled>
                                  Loading categories...
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sport"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="subtitle text-muted-foreground text-xs">Sport</FormLabel>

<Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="rich-input">
                            <SelectValue placeholder="Select sport" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {allSports.length > 0 ? (
                            allSports.map((sport: string) => (
                              <SelectItem key={sport} value={sport}>
                                {sport}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="loading" disabled>
                              Loading sports...
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>

                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                <FormField
                  control={form.control}
                  name="unitCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="subtitle text-muted-foreground text-xs">Unit Cost ($)</FormLabel>
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
              <FormField
                  control={form.control}
                  name="buildInstructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="subtitle text-muted-foreground text-xs">Build Instructions</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          className="rich-input min-h-[150px]" 
                          rows={8}
                          placeholder="Enter detailed step-by-step build instructions for this item...&#10;&#10;Example:&#10;1. Cut fabric according to pattern&#10;2. Sew side seams&#10;3. Attach shoulder straps&#10;4. Apply finishing touches"
                        />
                      </FormControl>
                      <FormDescription className="subtitle text-muted-foreground text-xs">
                        Provide step-by-step instructions for manufacturing this item
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-4 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditItemDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="btn-primary"
                  disabled={addItemMutation.isPending || updateItemMutation.isPending}
                >
                  {addItemMutation.isPending || updateItemMutation.isPending ? "Updating..." : "Update Item"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmItem} onOpenChange={() => setDeleteConfirmItem(null)}>
        <DialogContent className="bg-rich-black/90 backdrop-blur-md border border-glass-border">
          <DialogHeader>
            <DialogTitle className="text-red-400 flex items-center">
              <Trash2 className="mr-2 h-5 w-5" />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription className="subtitle text-muted-foreground">
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {deleteConfirmItem && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg border border-red-500/20 bg-red-500/5">
                <p className="text-sm text-foreground">
                  Are you sure you want to delete <span className="font-semibold text-neon-blue">"{deleteConfirmItem.name}"</span>?
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  SKU: {deleteConfirmItem.sku}
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setDeleteConfirmItem(null)}
                  disabled={deleteItemMutation.isPending}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={confirmDelete}
                  disabled={deleteItemMutation.isPending}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {deleteItemMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Item
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
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
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="glass-panel p-3 mb-4">
                <AlertCircle className="h-10 w-10 text-red-500" />
              </div>
              <h3 className="text-lg font-medium mb-2 text-foreground">Unable to load catalog</h3>
              <p className="text-muted-foreground mb-4">There was an error fetching catalog data.</p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => refetch()}
                  disabled={isLoading}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => window.location.reload()}
                >
                  Reload Page
                </Button>
              </div>
            </div>
          ) : filteredItems && filteredItems.length > 0 ? (
            <div className="space-y-6">
              {Object.entries(groupedItems).map(([sport, sportItems]) => {
                const SportIcon = getSportIcon(sport);

                // Group by category within each sport
                const categorizedItems: { [category: string]: CatalogItem[] } = {};
                sportItems.forEach((item: CatalogItem) => {
                  if (!categorizedItems[item.category]) {
                    categorizedItems[item.category] = [];
                  }
                  categorizedItems[item.category].push(item);
                });

                return (
                  <div key={sport} className="space-y-4">
                    {/* Sport Header */}
                    <div className="flex items-center gap-3 px-4 py-2 bg-glass-panel rounded-lg border border-glass-border">
                      <SportIcon className="h-6 w-6 text-neon-blue" />
                      <h3 className="text-lg font-semibold text-neon-blue">{sport}</h3>
                      <Badge variant="outline" className="ml-auto">
                        {sportItems.length} items
                      </Badge>
                    </div>

                    {/* Categories within Sport */}
                    {Object.entries(categorizedItems).map(([category, categoryItems]) => {
                      const CategoryIcon = getCategoryIcon(category);

                      return (
                        <div key={`${sport}-${category}`} className="ml-4">
                          {/* Category Header */}
                          <div className="flex items-center gap-2 px-3 py-1 mb-2">
                            <CategoryIcon className="h-4 w-4 text-neon-green" />
                            <h4 className="text-md font-medium text-neon-green">{category}</h4>
                            <Badge variant="secondary" className="ml-auto text-xs">
                              {categoryItems.length}
                            </Badge>
                          </div>

                          {/* Items Table */}
                          <div className="rounded-md border border-glass-border mb-4">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="text-foreground">Product</TableHead>
                                  <TableHead className="text-foreground">SKU</TableHead>
                                  <TableHead className="text-foreground">Base Price</TableHead>
                                  <TableHead className="text-foreground">Status</TableHead>
                                  <TableHead className="text-right text-foreground">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {categoryItems.map((item: CatalogItem) => (
                                  <TableRow key={item.id}>
                                    <TableCell>
                                      <div className="flex items-center space-x-3">
                                        {item.imageUrl ? (
                                          <img 
                                            src={item.imageUrl} 
                                            alt={item.name}
                                            className="w-10 h-10 object-cover rounded border border-glass-border"
                                            onError={(e) => {
                                              console.log('Image failed to load:', item.imageUrl);
                                              e.currentTarget.style.display = 'none';
                                              e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                            }}
                                          />
                                        ) : null}
                                        <div className={`w-10 h-10 glass-panel flex items-center justify-center rounded ${item.imageUrl ? 'hidden' : ''}`}>
                                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                        <div>
                                          <div className="font-medium text-foreground">{item.name}</div>
                                          <div className="text-xs text-muted-foreground">
                                            ETA: {item.etaDays} days
                                          </div>
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-foreground font-mono text-sm">{item.sku}</TableCell>
                                    <TableCell className="text-foreground">${(() => {
                                      try {
                                        const price = item.basePrice;
                                        if (price == null || price === undefined || isNaN(Number(price))) {
                                          return '0.00';
                                        }
                                        const numPrice = Number(price);
                                        return numPrice.toFixed(2);
                                      } catch (error) {
                                        console.warn('Error formatting price for item:', item.id, error);
                                        return '0.00';
                                      }
                                    })()}</TableCell>
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
                                          <DropdownMenuItem 
                                            className="text-foreground hover:glass-panel"
                                            onClick={() => handleViewDetails(item)}
                                          >
                                            <Eye className="mr-2 h-4 w-4" />
                                            View Details
                                          </DropdownMenuItem>
                                          <DropdownMenuItem 
                                            className="text-foreground hover:glass-panel"
                                            onClick={() => handleEditItem(item)}
                                          >
                                            <Edit className="mr-2 h-4 w-4" />
                                            Edit Item
                                          </DropdownMenuItem>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem 
                                            className="text-red-600"
                                            onClick={() => handleDeleteItem(item)}
                                            disabled={deleteItemMutation.isPending}
                                          >
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
                        </div>
                      );
                    })}
                  </div>
                );
              })}
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

export default function CatalogPage() {
  return (
    <ErrorBoundary
      fallback={({ error, resetError }) => (
        <div className="container mx-auto py-8">
          <Card className="mx-auto max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                Catalog Page Error
              </CardTitle>
              <CardDescription>
                Something went wrong while loading the catalog page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Error: {error?.message || 'Unknown error occurred'}
              </p>
              <div className="flex gap-2">
                <Button onClick={resetError} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button onClick={() => window.location.reload()} size="sm">
                  Reload Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    >
      <CatalogPageContent />
    </ErrorBoundary>
  );
}