
import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  ImageIcon,
  Loader2,
  RefreshCw,
  Package,
  DollarSign,
  Calendar,
  Hash,
  FileText,
  Upload,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Sparkles
} from "lucide-react";
import OptimizedImage from "@/components/OptimizedImage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Separator } from "@/components/ui/separator";

interface CatalogItem {
  id: string;
  name: string;
  category: string;
  sport: string;
  basePrice: number;
  unitCost: number;
  sku: string;
  etaDays: string;
  status: 'active' | 'inactive';
  imageUrl?: string;
  imageVariants?: {
    thumbnail?: string;
    medium?: string;
    large?: string;
    original?: string;
    gallery?: string[];
  };
  description?: string;
  buildInstructions?: string;
  fabric?: string;
  sizes?: string[];
  colors?: string[];
  customizationOptions?: string[];
  minQuantity?: number;
  maxQuantity?: number;
  created_at?: string;
  updated_at?: string;
}

interface CatalogFormData {
  name: string;
  category: string;
  sport: string;
  basePrice: number;
  unitCost: number;
  sku: string;
  etaDays: string;
  status: 'active' | 'inactive';
  description: string;
  buildInstructions: string;
  fabric: string;
  sizes: string[];
  colors: string[];
  customizationOptions: string[];
  minQuantity: number;
  maxQuantity: number;
}

const ONBOARDING_STEPS = [
  {
    id: 'basic',
    title: 'Basic Information',
    description: 'Tell us about your product',
    icon: Package
  },
  {
    id: 'pricing',
    title: 'Pricing & Cost',
    description: 'Set your pricing structure',
    icon: DollarSign
  },
  {
    id: 'details',
    title: 'Product Details',
    description: 'Add detailed specifications',
    icon: FileText
  },
  {
    id: 'customization',
    title: 'Customization',
    description: 'Define available options',
    icon: Sparkles
  },
  {
    id: 'image',
    title: 'Product Image',
    description: 'Upload a stunning image',
    icon: Upload
  }
];

// Enhanced Categorized Catalog View Component
interface CategorizedCatalogViewProps {
  items: CatalogItem[];
  onEditItem: (item: CatalogItem) => void;
  onDeleteItem: (itemId: string) => void;
  isDeleting: boolean;
}

function CategorizedCatalogView({ items, onEditItem, onDeleteItem, isDeleting }: CategorizedCatalogViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'gallery' | 'compact'>('gallery');
  const [viewingItem, setViewingItem] = useState<CatalogItem | null>(null);

  // Group items by category and sort aesthetically
  const categorizedItems = useMemo(() => {
    const categories = new Map<string, CatalogItem[]>();
    
    // Sort items by category, then by price (premium first), then by name
    const sortedItems = [...items].sort((a, b) => {
      // First by category
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      // Then by price (higher price first for premium appearance)
      if (a.basePrice !== b.basePrice) {
        return (b.basePrice || 0) - (a.basePrice || 0);
      }
      // Finally by name
      return a.name.localeCompare(b.name);
    });

    sortedItems.forEach(item => {
      const category = item.category || 'Uncategorized';
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(item);
    });

    return categories;
  }, [items]);

  const allCategories = ['all', ...Array.from(categorizedItems.keys()).sort()];
  const displayItems = selectedCategory === 'all' ? items : categorizedItems.get(selectedCategory) || [];

  return (
    <div className="space-y-6">
      {/* Category Navigation & View Controls */}
      <Card className="rich-card">
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            {/* Category Tabs */}
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full lg:w-auto">
              <ScrollArea className="w-full">
                <TabsList className="glass-surface inline-flex h-10 items-center justify-center rounded-md bg-rich-black/40 p-1 text-muted-foreground">
                  {allCategories.map(category => (
                    <TabsTrigger 
                      key={category}
                      value={category}
                      className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-neon-blue data-[state=active]:text-rich-black data-[state=active]:shadow-sm"
                    >
                      {category === 'all' ? `All Items (${items.length})` : `${category} (${categorizedItems.get(category)?.length || 0})`}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </ScrollArea>
            </Tabs>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={viewMode === 'gallery' ? 'default' : 'outline'}
                onClick={() => setViewMode('gallery')}
                className="glass-button"
              >
                Gallery
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                onClick={() => setViewMode('grid')}
                className="glass-button"
              >
                Grid
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'compact' ? 'default' : 'outline'}
                onClick={() => setViewMode('compact')}
                className="glass-button"
              >
                Compact
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Display */}
      {selectedCategory === 'all' ? (
        // Show all categories with sections
        <div className="space-y-8">
          {Array.from(categorizedItems.entries()).map(([category, categoryItems]) => (
            <CategorySection
              key={category}
              category={category}
              items={categoryItems}
              viewMode={viewMode}
              onEditItem={onEditItem}
              onDeleteItem={onDeleteItem}
              onViewItem={setViewingItem}
              isDeleting={isDeleting}
            />
          ))}
        </div>
      ) : (
        // Show selected category items
        <ItemsGrid
          items={displayItems}
          viewMode={viewMode}
          onEditItem={onEditItem}
          onDeleteItem={onDeleteItem}
          onViewItem={setViewingItem}
          isDeleting={isDeleting}
        />
      )}

      {/* Detailed Item View Modal */}
      <CatalogItemDetailModal
        item={viewingItem}
        isOpen={!!viewingItem}
        onClose={() => setViewingItem(null)}
        onEdit={() => {
          if (viewingItem) {
            onEditItem(viewingItem);
            setViewingItem(null);
          }
        }}
        onDelete={() => {
          if (viewingItem) {
            onDeleteItem(viewingItem.id);
            setViewingItem(null);
          }
        }}
        isDeleting={isDeleting}
      />
    </div>
  );
}

// Category Section Component
interface CategorySectionProps {
  category: string;
  items: CatalogItem[];
  viewMode: 'grid' | 'gallery' | 'compact';
  onEditItem: (item: CatalogItem) => void;
  onDeleteItem: (itemId: string) => void;
  onViewItem: (item: CatalogItem) => void;
  isDeleting: boolean;
}

function CategorySection({ category, items, viewMode, onEditItem, onDeleteItem, onViewItem, isDeleting }: CategorySectionProps) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-2xl font-bold text-foreground">{category}</h2>
        <Badge variant="outline" className="glass-surface">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </Badge>
      </div>
      <ItemsGrid
        items={items}
        viewMode={viewMode}
        onEditItem={onEditItem}
        onDeleteItem={onDeleteItem}
        onViewItem={onViewItem}
        isDeleting={isDeleting}
      />
    </div>
  );
}

// Items Grid Component with Different View Modes
interface ItemsGridProps {
  items: CatalogItem[];
  viewMode: 'grid' | 'gallery' | 'compact';
  onEditItem: (item: CatalogItem) => void;
  onDeleteItem: (itemId: string) => void;
  onViewItem: (item: CatalogItem) => void;
  isDeleting: boolean;
}

function ItemsGrid({ items, viewMode, onEditItem, onDeleteItem, onViewItem, isDeleting }: ItemsGridProps) {
  const getGridClasses = () => {
    switch (viewMode) {
      case 'gallery':
        return 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6';
      case 'grid':
        return 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4';
      case 'compact':
        return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3';
      default:
        return 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6';
    }
  };

  if (items.length === 0) {
    return (
      <Card className="rich-card">
        <CardContent className="py-16 text-center">
          <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2 text-foreground">No items in this category</h3>
          <p className="text-muted-foreground">Items you add to this category will appear here.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={getGridClasses()}>
      {items.map((item) => (
        <CatalogItemCard
          key={item.id}
          item={item}
          viewMode={viewMode}
          onEdit={() => onEditItem(item)}
          onDelete={() => onDeleteItem(item.id)}
          onView={() => onViewItem(item)}
          isDeleting={isDeleting}
        />
      ))}
    </div>
  );
}

// Enhanced Catalog Item Card
interface CatalogItemCardProps {
  item: CatalogItem;
  viewMode: 'grid' | 'gallery' | 'compact';
  onEdit: () => void;
  onDelete: () => void;
  onView: () => void;
  isDeleting: boolean;
}

function CatalogItemCard({ item, viewMode, onEdit, onDelete, onView, isDeleting }: CatalogItemCardProps) {
  const getCardClasses = () => {
    const base = 'rich-card relative group hover:shadow-xl transition-all duration-300 hover:scale-[1.02]';
    switch (viewMode) {
      case 'gallery':
        return `${base} overflow-hidden`;
      case 'grid':
        return `${base} aspect-square`;
      case 'compact':
        return `${base} flex flex-row`;
      default:
        return base;
    }
  };

  const renderImage = () => {
    if (!item.imageUrl) {
      return (
        <div className={`
          ${viewMode === 'compact' ? 'w-24 h-24' : 'w-full h-48'} 
          bg-gradient-to-br from-rich-black/20 to-glass-border/20 
          flex items-center justify-center rounded-md
        `}>
          <ImageIcon className={`${viewMode === 'compact' ? 'w-8 h-8' : 'w-12 h-12'} text-muted-foreground`} />
        </div>
      );
    }

    return (
      <div 
        className={`${viewMode === 'compact' ? 'w-24 h-24 flex-shrink-0' : 'w-full h-48'} relative overflow-hidden rounded-md group cursor-pointer`}
        onClick={onView}
      >
        <OptimizedImage
          src={item.imageUrl}
          alt={item.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          loading="lazy"
          placeholder="blur"
          sizes="(max-width: 768px) 100vw, 400px"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-rich-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="bg-neon-blue/20 backdrop-blur-sm rounded-full p-2 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
            <Search className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>
    );
  };

  if (viewMode === 'compact') {
    return (
      <Card className={getCardClasses()}>
        <CardContent className="p-4 flex items-center gap-4">
          {renderImage()}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-foreground truncate">{item.name}</h3>
              <Badge variant={item.status === 'active' ? 'default' : 'secondary'} className="ml-2">
                {item.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-2">{item.category} • {item.sport}</p>
            <div className="flex items-center justify-between">
              <span className="font-bold text-lg text-neon-blue">${(item.basePrice || 0).toFixed(2)}</span>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={onView} className="h-8 w-8 p-0">
                  <Search className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="outline" onClick={onEdit} className="h-8 w-8 p-0">
                  <Edit className="w-3 h-3" />
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={onDelete} 
                  disabled={isDeleting}
                  className="h-8 w-8 p-0 hover:bg-red-500/10"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={getCardClasses()}>
      <CardContent className="p-0">
        {renderImage()}
        
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <CardTitle className={`${viewMode === 'grid' ? 'text-sm' : 'text-lg'} text-foreground line-clamp-2`}>
              {item.name}
            </CardTitle>
            <Badge variant={item.status === 'active' ? 'default' : 'secondary'} className="ml-2">
              {item.status}
            </Badge>
          </div>
          
          <p className={`${viewMode === 'grid' ? 'text-xs' : 'text-sm'} text-muted-foreground mb-3`}>
            {item.category} • {item.sport}
          </p>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className={`${viewMode === 'grid' ? 'text-xs' : 'text-sm'} text-muted-foreground`}>Price:</span>
              <span className="font-bold text-neon-blue">${(item.basePrice || 0).toFixed(2)}</span>
            </div>
            
            {viewMode === 'gallery' && (
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SKU:</span>
                  <span className="font-mono text-xs">{item.sku}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ETA:</span>
                  <span>{item.etaDays}</span>
                </div>
                {item.fabric && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fabric:</span>
                    <span className="truncate ml-2">{item.fabric}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-2 mt-4">
            <Button size="sm" variant="outline" onClick={onView} className="glass-button">
              <Search className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={onEdit} className="glass-button">
              <Edit className="w-4 h-4" />
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={onDelete} 
              disabled={isDeleting}
              className="glass-button hover:bg-red-500/10"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Detailed Item View Modal Component
interface CatalogItemDetailModalProps {
  item: CatalogItem | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

function CatalogItemDetailModal({ item, isOpen, onClose, onEdit, onDelete, isDeleting }: CatalogItemDetailModalProps) {
  const [selectedImageVariant, setSelectedImageVariant] = useState<string>('medium');
  const [showImageUpload, setShowImageUpload] = useState(false);

  if (!item) return null;

  const imageVariants = item.imageVariants || {};
  const availableVariants = Object.entries(imageVariants).filter(([_, url]) => url);
  const currentImageUrl = imageVariants[selectedImageVariant as keyof typeof imageVariants] || item.imageUrl;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-rich-black/95 backdrop-blur-xl border border-glass-border max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl text-neon-blue flex items-center gap-3">
            <Package className="w-6 h-6" />
            {item.name}
            <Badge variant={item.status === 'active' ? 'default' : 'secondary'} className="ml-auto">
              {item.status}
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-neon-green">
            {item.category} • {item.sport} • SKU: {item.sku}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
          {/* Image Section with Multiple Variants */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Product Images</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowImageUpload(true)}
                className="glass-button"
              >
                <Upload className="w-4 h-4 mr-2" />
                Add Images
              </Button>
            </div>

            {/* Main Image Display */}
            <Card className="rich-card overflow-hidden">
              <AspectRatio ratio={4/3}>
                {currentImageUrl ? (
                  <div className="relative group">
                    <OptimizedImage
                      src={currentImageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      sizes="(max-width: 768px) 100vw, 600px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-rich-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-rich-black/20 to-glass-border/20 flex items-center justify-center">
                    <ImageIcon className="w-16 h-16 text-muted-foreground" />
                  </div>
                )}
              </AspectRatio>
            </Card>

            {/* Image Variant Selector */}
            {availableVariants.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Image Variants</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {availableVariants.map(([variant, url]) => (
                    <Card 
                      key={variant}
                      className={`rich-card cursor-pointer transition-all duration-200 ${
                        selectedImageVariant === variant ? 'ring-2 ring-neon-blue' : ''
                      }`}
                      onClick={() => setSelectedImageVariant(variant)}
                    >
                      <div className="aspect-square p-2">
                        <OptimizedImage
                          src={url}
                          alt={`${item.name} - ${variant}`}
                          className="w-full h-full object-cover rounded-sm"
                          sizes="150px"
                        />
                      </div>
                      <div className="p-2 text-center">
                        <span className="text-xs capitalize text-muted-foreground">{variant}</span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Additional Images Gallery */}
            {imageVariants.gallery && imageVariants.gallery.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Gallery ({imageVariants.gallery.length} images)</Label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {imageVariants.gallery.map((imageUrl, index) => (
                    <Card key={index} className="rich-card overflow-hidden">
                      <div className="aspect-square">
                        <OptimizedImage
                          src={imageUrl}
                          alt={`${item.name} gallery ${index + 1}`}
                          className="w-full h-full object-cover"
                          sizes="120px"
                        />
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Product Details Section */}
          <div className="space-y-6">
            {/* Pricing Information */}
            <Card className="rich-card">
              <CardHeader>
                <CardTitle className="text-lg text-foreground flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Pricing Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Base Price:</span>
                  <span className="text-2xl font-bold text-neon-blue">${(item.basePrice || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Unit Cost:</span>
                  <span className="font-semibold">${(item.unitCost || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Profit Margin:</span>
                  <span className="font-semibold text-neon-green">
                    ${((item.basePrice || 0) - (item.unitCost || 0)).toFixed(2)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">ETA:</span>
                  <span className="font-medium">{item.etaDays}</span>
                </div>
              </CardContent>
            </Card>

            {/* Product Specifications */}
            <Card className="rich-card">
              <CardHeader>
                <CardTitle className="text-lg text-foreground flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Specifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {item.fabric && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Fabric</Label>
                    <p className="text-foreground">{item.fabric}</p>
                  </div>
                )}
                
                {item.sizes && item.sizes.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Available Sizes</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.sizes.map((size, index) => (
                        <Badge key={index} variant="outline" className="glass-surface">
                          {size}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {item.colors && item.colors.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Available Colors</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.colors.map((color, index) => (
                        <Badge key={index} variant="outline" className="glass-surface">
                          {color}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {item.customizationOptions && item.customizationOptions.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Customization Options</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.customizationOptions.map((option, index) => (
                        <Badge key={index} variant="outline" className="glass-surface">
                          {option}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Min Quantity</Label>
                    <p className="text-foreground">{item.minQuantity || 1}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Max Quantity</Label>
                    <p className="text-foreground">{item.maxQuantity || 1000}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Description & Instructions */}
            {(item.description || item.buildInstructions) && (
              <Card className="rich-card">
                <CardHeader>
                  <CardTitle className="text-lg text-foreground">Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {item.description && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                      <p className="text-foreground mt-1">{item.description}</p>
                    </div>
                  )}
                  {item.buildInstructions && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Build Instructions</Label>
                      <p className="text-foreground mt-1 whitespace-pre-wrap">{item.buildInstructions}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-6 border-t border-glass-border mt-8">
          <div className="text-sm text-muted-foreground">
            Created: {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Unknown'}
            {item.updated_at && ` • Updated: ${new Date(item.updated_at).toLocaleDateString()}`}
          </div>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="glass-button"
            >
              Close
            </Button>
            <Button
              variant="outline"
              onClick={onEdit}
              className="glass-button"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Item
            </Button>
            <Button
              variant="outline"
              onClick={onDelete}
              disabled={isDeleting}
              className="glass-button hover:bg-red-500/10"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Delete Item
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function CatalogPage() {
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [showImageUploadModal, setShowImageUploadModal] = useState(false);
  const [uploadTargetItemId, setUploadTargetItemId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CatalogFormData>({
    name: '',
    category: '',
    sport: '',
    basePrice: 0,
    unitCost: 0,
    sku: '',
    etaDays: '7-10 business days',
    status: 'active',
    description: '',
    buildInstructions: '',
    fabric: '',
    sizes: [],
    colors: [],
    customizationOptions: [],
    minQuantity: 1,
    maxQuantity: 1000
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch catalog items with comprehensive error handling
  const { data: catalogItems = [], isLoading, error, refetch } = useQuery({
    queryKey: ['catalog'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token missing');
      }

      console.log("Fetching catalog items...");
      try {
        const response = await fetch("/api/catalog", {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Network error' }));
          throw new Error(errorData.message || `Failed to fetch catalog: ${response.status}`);
        }

        const data = await response.json();
        console.log("Catalog data received:", data);
        
        // Handle different response structures with validation
        if (data.success && Array.isArray(data.data)) {
          return data.data;
        } else if (Array.isArray(data)) {
          return data;
        } else if (data.data && Array.isArray(data.data)) {
          return data.data;
        } else {
          console.warn("Unexpected catalog response structure:", data);
          return [];
        }
      } catch (error) {
        console.error("Catalog fetch error:", error);
        throw error;
      }
    },
    retry: (failureCount, error: any) => {
      if (error?.message?.includes('401') || error?.message?.includes('403')) {
        return false; // Don't retry auth errors
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 15000, // Cache for 15 seconds
    refetchInterval: 60000 // Refresh every minute
  });

  // Fetch categories and sports for dropdowns
  const { data: categories = [] } = useQuery({
    queryKey: ['catalog-categories'],
    queryFn: async () => {
      const response = await fetch("/api/catalog-options/categories");
      if (response.ok) {
        const data = await response.json();
        return data.categories || [];
      }
      return ['Jerseys', 'Shorts', 'Accessories', 'Equipment', 'Custom Apparel'];
    }
  });

  const { data: sports = [] } = useQuery({
    queryKey: ['catalog-sports'],
    queryFn: async () => {
      const response = await fetch("/api/catalog-options/sports");
      if (response.ok) {
        const data = await response.json();
        return data.sports || [];
      }
      return ['Football', 'Basketball', 'Soccer', 'Baseball', 'Hockey', 'Tennis', 'Golf', 'General'];
    }
  });

  // Create item mutation with comprehensive validation
  const createItemMutation = useMutation({
    mutationFn: async (itemData: CatalogFormData) => {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token missing');
      }

      // Validate required fields
      if (!itemData.name?.trim()) {
        throw new Error('Product name is required');
      }
      if (!itemData.category?.trim()) {
        throw new Error('Category is required');
      }
      if (!itemData.sport?.trim()) {
        throw new Error('Sport is required');
      }
      if (itemData.basePrice < 0) {
        throw new Error('Base price cannot be negative');
      }
      if (itemData.unitCost < 0) {
        throw new Error('Unit cost cannot be negative');
      }

      const formDataToSend = new FormData();
      
      // Clean and validate data before sending
      const cleanedData = {
        ...itemData,
        name: itemData.name.trim(),
        category: itemData.category.trim(),
        sport: itemData.sport.trim(),
        basePrice: Math.round(itemData.basePrice * 100) / 100, // Round to 2 decimals
        unitCost: Math.round(itemData.unitCost * 100) / 100,
        sku: itemData.sku?.trim() || '',
        description: itemData.description?.trim() || '',
        buildInstructions: itemData.buildInstructions?.trim() || '',
        fabric: itemData.fabric?.trim() || '',
        etaDays: itemData.etaDays?.trim() || '7-10 business days',
        minQuantity: Math.max(1, itemData.minQuantity || 1),
        maxQuantity: Math.max(itemData.minQuantity || 1, itemData.maxQuantity || 1000)
      };

      // Add all form fields
      Object.entries(cleanedData).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          formDataToSend.append(key, JSON.stringify(value.filter(v => v?.trim())));
        } else {
          formDataToSend.append(key, String(value));
        }
      });

      // Add image if selected with validation
      if (selectedFile) {
        // Validate file size (5MB limit)
        if (selectedFile.size > 5 * 1024 * 1024) {
          throw new Error('Image file size must be less than 5MB');
        }
        // Validate file type
        if (!selectedFile.type.startsWith('image/')) {
          throw new Error('Please select a valid image file');
        }
        formDataToSend.append('image', selectedFile);
      }

      const response = await fetch('/api/catalog', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Network error' }));
        throw new Error(errorData.message || `Failed to create item: ${response.status}`);
      }

      return response.json();
    },
    onSuccess: (response) => {
      toast({
        title: "Item Created Successfully",
        description: response?.message || `${formData.name} has been added to the catalog`,
      });
      queryClient.invalidateQueries({ queryKey: ['catalog'] });
      queryClient.invalidateQueries({ queryKey: ['catalog-categories'] });
      queryClient.invalidateQueries({ queryKey: ['catalog-sports'] });
      refetch(); // Immediate refresh
      resetForm();
      setIsAddingItem(false);
    },
    onError: (error: Error) => {
      console.error('Catalog item creation failed:', error);
      toast({
        title: "Creation Failed",
        description: error.message || "An unexpected error occurred while creating the item",
        variant: "destructive",
      });
      // Don't reset form on error so user can retry
    }
  });

  // Update item mutation with validation
  const updateItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CatalogFormData }) => {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token missing');
      }

      if (!id) {
        throw new Error('Item ID is required for updates');
      }

      // Validate required fields for updates
      if (!data.name?.trim()) {
        throw new Error('Product name is required');
      }
      if (!data.category?.trim()) {
        throw new Error('Category is required');
      }
      if (data.basePrice < 0) {
        throw new Error('Base price cannot be negative');
      }

      const formDataToSend = new FormData();
      
      // Clean and validate data
      const cleanedData = {
        ...data,
        name: data.name.trim(),
        category: data.category.trim(),
        sport: data.sport?.trim() || '',
        basePrice: Math.round(data.basePrice * 100) / 100,
        unitCost: Math.round(data.unitCost * 100) / 100,
        sku: data.sku?.trim() || '',
        description: data.description?.trim() || '',
        buildInstructions: data.buildInstructions?.trim() || '',
        fabric: data.fabric?.trim() || '',
        etaDays: data.etaDays?.trim() || '7-10 business days',
        minQuantity: Math.max(1, data.minQuantity || 1),
        maxQuantity: Math.max(data.minQuantity || 1, data.maxQuantity || 1000)
      };

      Object.entries(cleanedData).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          formDataToSend.append(key, JSON.stringify(value.filter(v => v?.trim())));
        } else {
          formDataToSend.append(key, String(value));
        }
      });

      // Add image if selected with validation
      if (selectedFile) {
        if (selectedFile.size > 5 * 1024 * 1024) {
          throw new Error('Image file size must be less than 5MB');
        }
        if (!selectedFile.type.startsWith('image/')) {
          throw new Error('Please select a valid image file');
        }
        formDataToSend.append('image', selectedFile);
      }

      const response = await fetch(`/api/catalog/${id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Network error' }));
        throw new Error(errorData.message || `Failed to update item: ${response.status}`);
      }

      return response.json();
    },
    onSuccess: (response) => {
      toast({
        title: "Item Updated Successfully",
        description: response?.message || `${formData.name} has been updated`,
      });
      queryClient.invalidateQueries({ queryKey: ['catalog'] });
      queryClient.invalidateQueries({ queryKey: ['catalog-categories'] });
      queryClient.invalidateQueries({ queryKey: ['catalog-sports'] });
      refetch(); // Immediate refresh
      resetForm();
      setIsAddingItem(false);
      setEditingItem(null);
    },
    onError: (error: Error) => {
      console.error('Catalog item update failed:', error);
      toast({
        title: "Update Failed",
        description: error.message || "An unexpected error occurred while updating the item",
        variant: "destructive",
      });
      // Don't reset form on error so user can retry
    }
  });

  // Delete item mutation with confirmation
  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token missing');
      }

      if (!id) {
        throw new Error('Item ID is required for deletion');
      }

      const response = await fetch(`/api/catalog/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Network error' }));
        throw new Error(errorData.message || `Failed to delete item: ${response.status}`);
      }

      return response.json();
    },
    onSuccess: (response) => {
      toast({
        title: "Item Deleted Successfully",
        description: response?.message || "The catalog item has been permanently removed",
      });
      queryClient.invalidateQueries({ queryKey: ['catalog'] });
      queryClient.invalidateQueries({ queryKey: ['catalog-categories'] });
      queryClient.invalidateQueries({ queryKey: ['catalog-sports'] });
      refetch(); // Immediate refresh
    },
    onError: (error: Error) => {
      console.error('Catalog item deletion failed:', error);
      toast({
        title: "Deletion Failed",
        description: error.message || "An unexpected error occurred while deleting the item",
        variant: "destructive",
      });
    }
  });

  // Upload image variants mutation
  const uploadImageVariantsMutation = useMutation({
    mutationFn: async ({ catalogItemId, files }: { catalogItemId: string; files: File[] }) => {
      const formData = new FormData();
      
      files.forEach((file) => {
        formData.append('images', file);
      });

      const response = await fetch(`/api/catalog/${catalogItemId}/images`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || 'dev-admin-token-12345'}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload images');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Images Uploaded",
        description: `Successfully processed ${data.data?.statistics?.filesProcessed || 0} images with multiple variants.`,
      });
      queryClient.invalidateQueries({ queryKey: ['catalog'] });
      setShowImageUploadModal(false);
      setSelectedFiles([]);
      setUploadTargetItemId(null);
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: `Failed to upload images: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Handle multiple file selection for image variants
  const handleMultipleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      setSelectedFiles(files);
    }
  };

  // Handle file selection with validation
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please select a valid image file (JPEG, PNG, WebP, or GIF)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "File Too Large",
        description: "Image size must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    
    // Create preview with error handling
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
      toast({
        title: "Image Selected",
        description: `${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`,
      });
    };
    reader.onerror = () => {
      toast({
        title: "File Read Error",
        description: "Failed to read the selected image file",
        variant: "destructive",
      });
    };
    reader.readAsDataURL(file);
  };

  // Generate SKU with enhanced algorithm
  const generateSKU = () => {
    if (!formData.category || !formData.name) {
      toast({
        title: "Missing Information",
        description: "Please fill in category and product name before generating SKU",
        variant: "destructive",
      });
      return;
    }

    const categoryPrefix = formData.category.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '');
    const namePrefix = formData.name.substring(0, 2).toUpperCase().replace(/[^A-Z]/g, '');
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 4).toUpperCase();
    
    const newSKU = `${categoryPrefix || 'CAT'}-${namePrefix || 'PR'}-${timestamp}-${random}`;
    
    setFormData({ ...formData, sku: newSKU });
    
    toast({
      title: "SKU Generated",
      description: `New SKU: ${newSKU}`,
    });
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      sport: '',
      basePrice: 0,
      unitCost: 0,
      sku: '',
      etaDays: '7-10 business days',
      status: 'active',
      description: '',
      buildInstructions: '',
      fabric: '',
      sizes: [],
      colors: [],
      customizationOptions: [],
      minQuantity: 1,
      maxQuantity: 1000
    });
    setSelectedFile(null);
    setImagePreview(null);
    setCurrentStep(0);
  };

  // Start editing
  const startEditing = (item: CatalogItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      category: item.category || '',
      sport: item.sport || '',
      basePrice: item.basePrice || 0,
      unitCost: item.unitCost || 0,
      sku: item.sku || '',
      etaDays: item.etaDays || '7-10 business days',
      status: item.status || 'active',
      description: item.description || '',
      buildInstructions: item.buildInstructions || '',
      fabric: item.fabric || '',
      sizes: item.sizes || [],
      colors: item.colors || [],
      customizationOptions: item.customizationOptions || [],
      minQuantity: item.minQuantity || 1,
      maxQuantity: item.maxQuantity || 1000
    });
    setIsAddingItem(true);
  };

  // Handle form submission with comprehensive validation
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Comprehensive client-side validation
    if (!formData.name?.trim()) {
      toast({
        title: "Validation Error",
        description: "Product name is required",
        variant: "destructive",
      });
      setCurrentStep(0); // Go back to basic info step
      return;
    }
    
    if (!formData.category?.trim()) {
      toast({
        title: "Validation Error", 
        description: "Category is required",
        variant: "destructive",
      });
      setCurrentStep(0); // Go back to basic info step
      return;
    }

    if (!formData.sport?.trim()) {
      toast({
        title: "Validation Error",
        description: "Sport selection is required", 
        variant: "destructive",
      });
      setCurrentStep(0); // Go back to basic info step
      return;
    }

    if (formData.basePrice < 0) {
      toast({
        title: "Validation Error",
        description: "Base price cannot be negative",
        variant: "destructive",
      });
      setCurrentStep(1); // Go to pricing step
      return;
    }

    if (formData.unitCost < 0) {
      toast({
        title: "Validation Error",
        description: "Unit cost cannot be negative",
        variant: "destructive",
      });
      setCurrentStep(1); // Go to pricing step
      return;
    }

    if (formData.minQuantity > formData.maxQuantity) {
      toast({
        title: "Validation Error",
        description: "Minimum quantity cannot be greater than maximum quantity",
        variant: "destructive",
      });
      setCurrentStep(2); // Go to details step
      return;
    }

    // Submit after validation passes
    if (editingItem?.id) {
      updateItemMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createItemMutation.mutate(formData);
    }
  };

  // Filter items based on search
  const filteredItems = catalogItems.filter((item: CatalogItem) =>
    item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sport?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle next step in onboarding
  const handleNextStep = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  // Handle previous step in onboarding
  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Render onboarding step content
  const renderStepContent = () => {
    const step = ONBOARDING_STEPS[currentStep];
    
    switch (step.id) {
      case 'basic':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-foreground">Product Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter product name"
                className="glass-input"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="category" className="text-foreground">Category</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger className="glass-input">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="glass-panel border-glass-border">
                  {categories.map((category: string) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="sport" className="text-foreground">Sport</Label>
              <Select value={formData.sport} onValueChange={(value) => setFormData({ ...formData, sport: value })}>
                <SelectTrigger className="glass-input">
                  <SelectValue placeholder="Select sport" />
                </SelectTrigger>
                <SelectContent className="glass-panel border-glass-border">
                  {sports.map((sport: string) => (
                    <SelectItem key={sport} value={sport}>
                      {sport}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'pricing':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="basePrice" className="text-foreground">Base Price ($)</Label>
              <Input
                id="basePrice"
                type="number"
                step="0.01"
                value={formData.basePrice}
                onChange={(e) => setFormData({ ...formData, basePrice: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                className="glass-input"
              />
            </div>
            
            <div>
              <Label htmlFor="unitCost" className="text-foreground">Unit Cost ($)</Label>
              <Input
                id="unitCost"
                type="number"
                step="0.01"
                value={formData.unitCost}
                onChange={(e) => setFormData({ ...formData, unitCost: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                className="glass-input"
              />
            </div>

            <div>
              <Label htmlFor="sku" className="text-foreground">SKU</Label>
              <div className="flex space-x-2">
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="Product SKU"
                  className="glass-input"
                />
                <Button type="button" onClick={generateSKU} variant="outline" className="glass-button">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="etaDays" className="text-foreground">Estimated Delivery Time</Label>
              <Input
                id="etaDays"
                value={formData.etaDays}
                onChange={(e) => setFormData({ ...formData, etaDays: e.target.value })}
                placeholder="7-10 business days"
                className="glass-input"
              />
            </div>
          </div>
        );

      case 'details':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="description" className="text-foreground">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your product"
                className="glass-input"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="buildInstructions" className="text-foreground">Build Instructions</Label>
              <Textarea
                id="buildInstructions"
                value={formData.buildInstructions}
                onChange={(e) => setFormData({ ...formData, buildInstructions: e.target.value })}
                placeholder="Manufacturing and build instructions"
                className="glass-input"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="fabric" className="text-foreground">Fabric</Label>
              <Input
                id="fabric"
                value={formData.fabric}
                onChange={(e) => setFormData({ ...formData, fabric: e.target.value })}
                placeholder="e.g., 100% Polyester, Cotton Blend"
                className="glass-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="minQuantity" className="text-foreground">Min Quantity</Label>
                <Input
                  id="minQuantity"
                  type="number"
                  value={formData.minQuantity}
                  onChange={(e) => setFormData({ ...formData, minQuantity: parseInt(e.target.value) || 1 })}
                  className="glass-input"
                />
              </div>
              <div>
                <Label htmlFor="maxQuantity" className="text-foreground">Max Quantity</Label>
                <Input
                  id="maxQuantity"
                  type="number"
                  value={formData.maxQuantity}
                  onChange={(e) => setFormData({ ...formData, maxQuantity: parseInt(e.target.value) || 1000 })}
                  className="glass-input"
                />
              </div>
            </div>
          </div>
        );

      case 'customization':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="sizes" className="text-foreground">Available Sizes</Label>
              <Input
                id="sizes"
                value={formData.sizes.join(', ')}
                onChange={(e) => setFormData({ ...formData, sizes: e.target.value.split(', ').filter(s => s.trim()) })}
                placeholder="XS, S, M, L, XL, XXL"
                className="glass-input"
              />
              <p className="text-xs text-muted-foreground mt-1">Separate sizes with commas</p>
            </div>

            <div>
              <Label htmlFor="colors" className="text-foreground">Available Colors</Label>
              <Input
                id="colors"
                value={formData.colors.join(', ')}
                onChange={(e) => setFormData({ ...formData, colors: e.target.value.split(', ').filter(c => c.trim()) })}
                placeholder="Red, Blue, Green, Black, White"
                className="glass-input"
              />
              <p className="text-xs text-muted-foreground mt-1">Separate colors with commas</p>
            </div>

            <div>
              <Label htmlFor="customizationOptions" className="text-foreground">Customization Options</Label>
              <Input
                id="customizationOptions"
                value={formData.customizationOptions.join(', ')}
                onChange={(e) => setFormData({ ...formData, customizationOptions: e.target.value.split(', ').filter(o => o.trim()) })}
                placeholder="Embroidery, Screen Print, Heat Transfer"
                className="glass-input"
              />
              <p className="text-xs text-muted-foreground mt-1">Separate options with commas</p>
            </div>

            <div>
              <Label htmlFor="status" className="text-foreground">Status</Label>
              <Select value={formData.status} onValueChange={(value: 'active' | 'inactive') => setFormData({ ...formData, status: value })}>
                <SelectTrigger className="glass-input">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="glass-panel border-glass-border">
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'image':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="image" className="text-foreground">Product Image</Label>
              <div className="border-2 border-dashed border-glass-border rounded-lg p-6 text-center">
                {imagePreview ? (
                  <div className="space-y-4">
                    <img src={imagePreview} alt="Preview" className="mx-auto max-h-48 rounded-lg" />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setSelectedFile(null);
                        setImagePreview(null);
                      }}
                      className="glass-button"
                    >
                      Remove Image
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                    <div>
                      <Label htmlFor="file-upload" className="cursor-pointer">
                        <span className="text-neon-blue hover:text-neon-blue/80">Upload an image</span>
                        <Input
                          id="file-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">PNG, JPG, GIF up to 10MB</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-neon-blue" />
        <span className="ml-2 text-foreground">Loading catalog...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Product Catalog</h1>
          <p className="text-muted-foreground">Manage your product inventory and catalog items</p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={() => {
              console.log("Manually refreshing catalog...");
              refetch();
            }}
            disabled={isLoading}
            className="glass-button"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Refresh
          </Button>
          <Button 
            onClick={() => setIsAddingItem(true)}
            className="bg-neon-blue hover:bg-neon-blue/80 text-rich-black font-semibold"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card className="rich-card">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search catalog items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="glass-input max-w-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="rich-card">
          <CardContent className="py-8 text-center">
            <h3 className="text-lg font-medium mb-2 text-foreground">Unable to load catalog</h3>
            <p className="text-muted-foreground mb-4">There was an error fetching catalog data. Please try again.</p>
            <Button onClick={() => refetch()} className="glass-button">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Categorized Catalog Display */}
      {!error && (
        <CategorizedCatalogView 
          items={filteredItems} 
          onEditItem={startEditing}
          onDeleteItem={(itemId) => deleteItemMutation.mutate(itemId)}
          isDeleting={deleteItemMutation.isPending}
        />
      )}

      {/* Empty State */}
      {!error && filteredItems.length === 0 && !isLoading && (
        <Card className="rich-card">
          <CardContent className="py-16 text-center">
            <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-foreground">No catalog items found</h3>
            <p className="text-muted-foreground mb-6">
              {searchTerm ? 'No items match your search criteria.' : 'Get started by adding your first catalog item.'}
            </p>
            {!searchTerm && (
              <Button 
                onClick={() => setIsAddingItem(true)}
                className="bg-neon-blue hover:bg-neon-blue/80 text-rich-black font-semibold"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add First Item
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tinder-Style Onboarding Dialog */}
      <Dialog open={isAddingItem} onOpenChange={(open) => {
        if (!open) {
          setIsAddingItem(false);
          setEditingItem(null);
          resetForm();
        }
      }}>
        <DialogContent className="bg-rich-black/90 backdrop-blur-md border border-glass-border max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-neon-blue flex items-center">
              <Package className="mr-2 h-5 w-5" />
              {editingItem ? 'Edit Catalog Item' : 'Add New Catalog Item'}
            </DialogTitle>
            <DialogDescription className="subtitle text-neon-green">
              {editingItem ? 'Update your catalog item information' : 'Create a new product for your catalog'}
            </DialogDescription>
          </DialogHeader>

          {/* Progress Indicator */}
          <div className="flex items-center justify-between mb-6">
            {ONBOARDING_STEPS.map((step, index) => {
              const IconComponent = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300
                    ${isActive ? 'border-neon-blue bg-neon-blue text-rich-black' : ''}
                    ${isCompleted ? 'border-neon-green bg-neon-green text-rich-black' : ''}
                    ${!isActive && !isCompleted ? 'border-glass-border bg-transparent text-muted-foreground' : ''}
                  `}>
                    {isCompleted ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <IconComponent className="w-5 h-5" />
                    )}
                  </div>
                  {index < ONBOARDING_STEPS.length - 1 && (
                    <div className={`
                      w-12 h-0.5 mx-2 transition-all duration-300
                      ${isCompleted ? 'bg-neon-green' : 'bg-glass-border'}
                    `} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Step Content */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="min-h-[300px]">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-foreground">
                  {ONBOARDING_STEPS[currentStep].title}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {ONBOARDING_STEPS[currentStep].description}
                </p>
              </div>
              
              {renderStepContent()}
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6 border-t border-glass-border">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevStep}
                disabled={currentStep === 0}
                className="glass-button"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>

              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddingItem(false);
                    setEditingItem(null);
                    resetForm();
                  }}
                  className="glass-button"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>

                {currentStep === ONBOARDING_STEPS.length - 1 ? (
                  <Button
                    type="submit"
                    disabled={createItemMutation.isPending || updateItemMutation.isPending}
                    className="bg-neon-blue hover:bg-neon-blue/80 text-rich-black font-semibold"
                  >
                    {createItemMutation.isPending || updateItemMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Check className="w-4 h-4 mr-2" />
                    )}
                    {editingItem ? 'Update Item' : 'Create Item'}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleNextStep}
                    className="bg-neon-blue hover:bg-neon-blue/80 text-rich-black font-semibold"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
