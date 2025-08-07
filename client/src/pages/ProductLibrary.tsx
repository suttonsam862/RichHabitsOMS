import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  Images, 
  ShoppingCart, 
  Upload,
  Package,
  TrendingUp,
  Users
} from 'lucide-react';

// Import the new components we created
import { HistoricalProductsView } from '@/components/ProductLibrary/HistoricalProductsView';
import { MockupGallery } from '@/components/ProductLibrary/MockupGallery';
import { ProductOrderHistory } from '@/components/ProductLibrary/ProductOrderHistory';
import { ProductMockupUploader } from '@/components/ProductLibrary/ProductMockupUploader';
import { ProductGrid, type ProductGridItem } from '@/components/ProductGrid';

interface SelectedProduct {
  id: string;
  name: string;
  category: string;
  sku: string;
  description: string;
}

export default function ProductLibrary() {
  const [selectedProduct, setSelectedProduct] = useState<SelectedProduct | null>(null);
  const [activeTab, setActiveTab] = useState('historical');

  // Handle product selection from the historical products view
  const handleProductSelect = (product: any) => {
    setSelectedProduct({
      id: product.id,
      name: product.name,
      category: product.category,
      sku: product.sku || 'N/A',
      description: product.description || ''
    });
    
    // Switch to mockups tab when a product is selected for detailed view
    setActiveTab('mockups');
  };

  // Handle successful mockup upload
  const handleMockupUploadSuccess = () => {
    // Could show a toast notification or refresh data
    console.log('Mockup uploaded successfully');
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-green-500 bg-clip-text text-transparent">
              Product Library
            </h1>
            <p className="text-gray-600 mt-2">
              Comprehensive product catalog with historical data, mockups, and analytics
            </p>
          </div>
          
          {selectedProduct && (
            <div className="text-right">
              <div className="text-sm text-gray-500">Selected Product</div>
              <div className="font-semibold">{selectedProduct.name}</div>
              <Badge variant="outline" className="mt-1">
                {selectedProduct.category}
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500 text-white rounded-lg">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm text-gray-600">Historical Products</div>
                <div className="text-xl font-bold text-blue-700">Browse & Analyze</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-500 text-white rounded-lg">
                <Images className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm text-gray-600">Mockup Gallery</div>
                <div className="text-xl font-bold text-green-700">Visual Library</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-500 text-white rounded-lg">
                <Upload className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm text-gray-600">Upload Mockups</div>
                <div className="text-xl font-bold text-purple-700">Add Content</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-500 text-white rounded-lg">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm text-gray-600">Order Analytics</div>
                <div className="text-xl font-bold text-orange-700">Performance Data</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:grid-cols-5">
          <TabsTrigger value="historical" className="flex items-center space-x-2" data-testid="historical-products-tab">
            <BookOpen className="h-4 w-4" />
            <span>Historical Products</span>
          </TabsTrigger>
          <TabsTrigger value="product-grid" className="flex items-center space-x-2">
            <Package className="h-4 w-4" />
            <span>Product Grid</span>
          </TabsTrigger>
          
          <TabsTrigger value="mockups" className="flex items-center space-x-2" data-testid="mockups-tab">
            <Images className="h-4 w-4" />
            <span>Mockup Gallery</span>
          </TabsTrigger>
          
          <TabsTrigger value="upload" className="flex items-center space-x-2" data-testid="upload-tab">
            <Upload className="h-4 w-4" />
            <span>Upload Mockups</span>
          </TabsTrigger>
          
          <TabsTrigger value="orders" className="flex items-center space-x-2" data-testid="orders-tab">
            <ShoppingCart className="h-4 w-4" />
            <span>Order History</span>
          </TabsTrigger>
        </TabsList>

        {/* Historical Products Tab */}
        <TabsContent value="historical" className="space-y-6">
          <HistoricalProductsView 
            onProductSelect={handleProductSelect}
            className="min-h-[600px]"
          />
        </TabsContent>

        {/* Product Grid Tab */}
        <TabsContent value="product-grid" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5" />
                <span>Product Grid View</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ProductGrid
                products={[]}
                isLoading={false}
                showFilters={true}
                basePath="/products"
                searchPlaceholder="Search product library..."
                emptyStateTitle="No products in library"
                emptyStateDescription="Products from your catalog and order history will appear here."
                className="mt-4"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mockup Gallery Tab */}
        <TabsContent value="mockups" className="space-y-6">
          {selectedProduct ? (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Viewing mockups for: {selectedProduct.name}</h3>
                    <p className="text-sm text-gray-600">SKU: {selectedProduct.sku} | Category: {selectedProduct.category}</p>
                  </div>
                  <Badge variant="secondary">Product Selected</Badge>
                </div>
              </div>
              
              <MockupGallery 
                productId={selectedProduct.id}
                className="min-h-[600px]"
              />
            </div>
          ) : (
            <MockupGallery className="min-h-[600px]" />
          )}
        </TabsContent>

        {/* Upload Mockups Tab */}
        <TabsContent value="upload" className="space-y-6">
          {selectedProduct ? (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Upload mockups for: {selectedProduct.name}</h3>
                    <p className="text-sm text-gray-600">SKU: {selectedProduct.sku} | Category: {selectedProduct.category}</p>
                  </div>
                  <Badge variant="secondary">Ready for Upload</Badge>
                </div>
              </div>

              <ProductMockupUploader 
                productId={selectedProduct.id}
                onUploadSuccess={handleMockupUploadSuccess}
                maxFiles={10}
                className="min-h-[500px]"
              />
            </div>
          ) : (
            <Card className="p-12 text-center">
              <div className="space-y-4">
                <Upload className="h-16 w-16 text-gray-400 mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Select a Product First</h3>
                  <p className="text-gray-500">
                    Choose a product from the Historical Products tab to upload mockups
                  </p>
                </div>
                <div className="pt-4">
                  <button
                    onClick={() => setActiveTab('historical')}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Browse Products
                  </button>
                </div>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Order History Tab */}
        <TabsContent value="orders" className="space-y-6">
          {selectedProduct ? (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-4 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Order history for: {selectedProduct.name}</h3>
                    <p className="text-sm text-gray-600">SKU: {selectedProduct.sku} | Category: {selectedProduct.category}</p>
                  </div>
                  <Badge variant="secondary">Analytics Available</Badge>
                </div>
              </div>

              <ProductOrderHistory 
                productId={selectedProduct.id}
                className="min-h-[600px]"
              />
            </div>
          ) : (
            <Card className="p-12 text-center">
              <div className="space-y-4">
                <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Select a Product First</h3>
                  <p className="text-gray-500">
                    Choose a product from the Historical Products tab to view order analytics
                  </p>
                </div>
                <div className="pt-4">
                  <button
                    onClick={() => setActiveTab('historical')}
                    className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Browse Products
                  </button>
                </div>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}