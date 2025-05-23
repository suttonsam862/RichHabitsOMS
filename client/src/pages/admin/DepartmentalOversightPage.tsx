import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  UserCheck, 
  Scale, 
  Calculator, 
  ShoppingBag, 
  Building2, 
  Shield, 
  Users, 
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  PieChart,
  Layers
} from "lucide-react";

export default function DepartmentalOversightPage() {
  const { toast } = useToast();
  const [selectedDepartment, setSelectedDepartment] = useState("workforce");

  // Legal management handlers
  const handleBrandManager360 = () => {
    window.open('https://brandmanager360.com', '_blank');
    toast({
      title: "Redirecting to Brand Manager 360",
      description: "Opening NCAA affiliations management platform",
    });
  };

  const handleKKInsurance = () => {
    window.open('https://kandkinsurance.com', '_blank');
    toast({
      title: "Redirecting to K&K Insurance",
      description: "Opening event insurance management platform",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Departmental Oversight</h1>
          <p className="text-gray-600 mt-2">
            Comprehensive management across all business departments
          </p>
        </div>
      </div>

      {/* Departmental Tabs */}
      <Tabs value={selectedDepartment} onValueChange={setSelectedDepartment} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="workforce">
            <UserCheck className="mr-2 h-4 w-4" />
            Workforce
          </TabsTrigger>
          <TabsTrigger value="legal">
            <Scale className="mr-2 h-4 w-4" />
            Legal
          </TabsTrigger>
          <TabsTrigger value="finance">
            <Calculator className="mr-2 h-4 w-4" />
            Finance
          </TabsTrigger>
          <TabsTrigger value="operations">
            <ShoppingBag className="mr-2 h-4 w-4" />
            Operations
          </TabsTrigger>
        </TabsList>

        {/* Workforce Department */}
        <TabsContent value="workforce" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Workforce</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">5</div>
                <p className="text-xs text-muted-foreground">Active team members</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Role Distribution</CardTitle>
                <PieChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Admins</span>
                    <span>1</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Customers</span>
                    <span>1</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Designers</span>
                    <span>1</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Sales</span>
                    <span>1</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Manufacturers</span>
                    <span>1</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">User Management</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={() => window.location.href = '/admin/settings'}>
                  <Users className="mr-2 h-4 w-4" />
                  Manage Users
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Workforce Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Workforce Management</CardTitle>
              <CardDescription>Manage team members, roles, and permissions</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button variant="outline" onClick={() => window.location.href = '/admin/settings'}>
                <Users className="mr-2 h-4 w-4" />
                User Management
              </Button>
              <Button variant="outline">
                <UserCheck className="mr-2 h-4 w-4" />
                Role Assignments
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Legal Department */}
        <TabsContent value="legal" className="space-y-6">
          {/* Legal Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">NCAA Status</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm font-medium">Active</span>
                </div>
                <p className="text-xs text-muted-foreground">Compliant & Current</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Insurance Coverage</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm font-medium">Current</span>
                </div>
                <p className="text-xs text-muted-foreground">Event liability covered</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Legal Documents</CardTitle>
                <Scale className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm font-medium">Up to Date</span>
                </div>
                <p className="text-xs text-muted-foreground">All documents current</p>
              </CardContent>
            </Card>
          </div>

          {/* Legal Management Services */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CLC/Brand Manager 360 */}
            <Card className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <Building2 className="h-8 w-8 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">CLC/Brand Manager 360</CardTitle>
                    <CardDescription>NCAA affiliations and licensing management</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    Manage your NCAA collegiate licensing and brand affiliations through the 
                    official Brand Manager 360 platform.
                  </p>
                  <div className="space-y-1">
                    <div className="flex items-center text-sm text-gray-500">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                      NCAA Compliance Tracking
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                      Licensing Agreement Management
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                      Brand Asset Protection
                    </div>
                  </div>
                </div>
                <Button 
                  onClick={handleBrandManager360}
                  className="w-full flex items-center justify-center space-x-2"
                >
                  <span>Access Brand Manager 360</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            {/* K&K Insurance */}
            <Card className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <Shield className="h-8 w-8 text-green-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">K&K Insurance</CardTitle>
                    <CardDescription>Event insurance and liability coverage</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    Manage your event insurance policies and liability coverage through 
                    K&K Insurance Services.
                  </p>
                  <div className="space-y-1">
                    <div className="flex items-center text-sm text-gray-500">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                      Event Liability Coverage
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                      Policy Management
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                      Claims Processing
                    </div>
                  </div>
                </div>
                <Button 
                  onClick={handleKKInsurance}
                  className="w-full flex items-center justify-center space-x-2"
                  variant="outline"
                >
                  <span>Access K&K Insurance</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Finance Department */}
        <TabsContent value="finance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$0.00</div>
                <p className="text-xs text-muted-foreground">This month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Paid Orders</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">Completed payments</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">Awaiting payment</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">+0%</div>
                <p className="text-xs text-muted-foreground">From last month</p>
              </CardContent>
            </Card>
          </div>

          {/* Financial Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Financial Management</CardTitle>
              <CardDescription>Monitor revenue, payments, and financial performance</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="outline">
                <DollarSign className="mr-2 h-4 w-4" />
                Payment Reports
              </Button>
              <Button variant="outline">
                <TrendingUp className="mr-2 h-4 w-4" />
                Revenue Analytics
              </Button>
              <Button variant="outline">
                <Calculator className="mr-2 h-4 w-4" />
                Financial Overview
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Operations Department */}
        <TabsContent value="operations" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">Orders in system</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">In Production</CardTitle>
                <Layers className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">Currently manufacturing</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">Finished orders</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Issues</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">Need attention</p>
              </CardContent>
            </Card>
          </div>

          {/* Operations Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Operations Management</CardTitle>
              <CardDescription>Monitor production, orders, and operational efficiency</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="outline">
                <ShoppingBag className="mr-2 h-4 w-4" />
                Order Management
              </Button>
              <Button variant="outline">
                <Layers className="mr-2 h-4 w-4" />
                Production Status
              </Button>
              <Button variant="outline">
                <AlertCircle className="mr-2 h-4 w-4" />
                Issue Tracking
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}