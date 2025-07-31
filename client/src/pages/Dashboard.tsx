import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Dashboard() {
  const { user, logout } = useAuth();

  // Redirect if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            <p className="text-gray-400">Welcome back, {user.firstName || user.email}</p>
          </div>
          <Button 
            onClick={handleLogout}
            variant="outline"
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            Logout
          </Button>
        </div>

        {/* User Info Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>User Information</CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <p className="text-lg">{user.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Role</label>
                <p className="text-lg capitalize">{user.role}</p>
              </div>
              {user.firstName && (
                <div>
                  <label className="text-sm font-medium text-gray-500">First Name</label>
                  <p className="text-lg">{user.firstName}</p>
                </div>
              )}
              {user.lastName && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Last Name</label>
                  <p className="text-lg">{user.lastName}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Catalog Management</CardTitle>
              <CardDescription>Manage your product catalog</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">View Catalog</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Customer Management</CardTitle>
              <CardDescription>Manage customer relationships</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">View Customers</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Order Management</CardTitle>
              <CardDescription>Track and manage orders</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">View Orders</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}