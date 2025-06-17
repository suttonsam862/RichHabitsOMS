import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Mail, Phone, MapPin, Building, Calendar, ShoppingBag, DollarSign } from "lucide-react";

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  orders: number;
  spent: string;
  lastOrder?: string;
  status: string;
  created_at: string;
}

export default function CustomerDetailsPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();

  const { data: customer, isLoading, error } = useQuery({
    queryKey: ['/api/customers', customerId],
    queryFn: async () => {
      const response = await fetch(`/api/customers/${customerId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch customer details');
      }
      
      return response.json() as Promise<Customer>;
    },
    enabled: !!customerId
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center space-x-4 mb-6">
          <Button variant="ghost" onClick={() => navigate('/admin/customers')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Customers
          </Button>
        </div>
        <div className="animate-pulse">
          <div className="bg-gray-200 h-8 w-64 mb-6 rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-200 h-64 rounded"></div>
            <div className="bg-gray-200 h-64 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center space-x-4 mb-6">
          <Button variant="ghost" onClick={() => navigate('/admin/customers')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Customers
          </Button>
        </div>
        <Card>
          <CardContent className="py-16 text-center">
            <h3 className="text-lg font-medium mb-2">Customer not found</h3>
            <p className="text-muted-foreground">The customer you're looking for doesn't exist or you don't have permission to view it.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate('/admin/customers')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Customers
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{customer.firstName} {customer.lastName}</h1>
            <p className="text-muted-foreground">Customer Details</p>
          </div>
        </div>
        <Badge variant="default">
          {customer.status || 'Active'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Mail className="h-5 w-5 mr-2" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">{customer.email || 'Not provided'}</p>
              </div>
            </div>
            
            {customer.phone && (
              <div className="flex items-center space-x-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Phone</p>
                  <p className="text-sm text-muted-foreground">{customer.phone}</p>
                </div>
              </div>
            )}
            
            {customer.company && (
              <div className="flex items-center space-x-3">
                <Building className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Company</p>
                  <p className="text-sm text-muted-foreground">{customer.company}</p>
                </div>
              </div>
            )}
            
            {(customer.address || customer.city || customer.state || customer.zip || customer.country) && (
              <>
                <Separator />
                <div className="flex items-start space-x-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Address</p>
                    <div className="text-sm text-muted-foreground">
                      {customer.address && <p>{customer.address}</p>}
                      {(customer.city || customer.state || customer.zip) && (
                        <p>
                          {customer.city && customer.city}
                          {customer.city && customer.state && ', '}
                          {customer.state && customer.state}
                          {customer.zip && ` ${customer.zip}`}
                        </p>
                      )}
                      {customer.country && <p>{customer.country}</p>}
                    </div>
                  </div>
                </div>
              </>
            )}
            
            <Separator />
            <div className="flex items-center space-x-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Customer Since</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(customer.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ShoppingBag className="h-5 w-5 mr-2" />
              Order History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3">
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Total Orders</p>
                <p className="text-2xl font-bold">{customer.orders || 0}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Total Spent</p>
                <p className="text-2xl font-bold">{customer.spent || '$0.00'}</p>
              </div>
            </div>
            
            {customer.lastOrder && (
              <>
                <Separator />
                <div className="flex items-center space-x-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Last Order</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(customer.lastOrder).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </>
            )}
            
            <Separator />
            <div className="space-y-2">
              <Button 
                className="w-full" 
                onClick={() => navigate(`/orders?customer=${customer.id}`)}
              >
                <ShoppingBag className="h-4 w-4 mr-2" />
                View All Orders
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate(`/orders/create?customer=${customer.id}`)}
              >
                Create New Order
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline"
              onClick={() => navigate(`/admin/customers/edit/${customer.id}`)}
            >
              Edit Customer
            </Button>
            <Button 
              variant="outline"
              onClick={() => window.location.href = `mailto:${customer.email}`}
            >
              <Mail className="h-4 w-4 mr-2" />
              Send Email
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate(`/messages?customer=${customer.id}`)}
            >
              Send Message
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}