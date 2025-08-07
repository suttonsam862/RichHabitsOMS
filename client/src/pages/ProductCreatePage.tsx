import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ProductForm } from '@/components/forms/ProductForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Package } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { CatalogItem } from '@/shared/schema';

export default function ProductCreatePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Check permissions - only allow admin and salesperson to create products
  const canCreateProducts = user?.role === 'admin' || user?.role === 'salesperson';

  if (!canCreateProducts) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">
              You don't have permission to create products. Only administrators and salespeople can create new catalog items.
            </p>
            <Button onClick={() => navigate('/catalog')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Catalog
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSuccess = (product: CatalogItem) => {
    // Navigate to the product detail page or catalog
    navigate(`/products/${product.id}`);
  };

  const handleCancel = () => {
    navigate('/catalog');
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-2 mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/catalog')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Catalog
          </Button>
        </div>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Package className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Create New Product</h1>
            <p className="text-gray-600">Add a new item to your product catalog</p>
          </div>
        </div>
      </div>

      {/* Product Form */}
      <div className="max-w-4xl">
        <ProductForm
          mode="create"
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}