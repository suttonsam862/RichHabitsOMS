import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Shield, FileText, Building2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function LegalManagementPage() {
  const { toast } = useToast();

  const handleBrandManager360 = () => {
    // Open Brand Manager 360 in new tab
    window.open('https://brandmanager360.com', '_blank');
    toast({
      title: "Redirecting to Brand Manager 360",
      description: "Opening NCAA affiliations management platform",
    });
  };

  const handleKKInsurance = () => {
    // Open K&K Insurance in new tab
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
          <h1 className="text-3xl font-bold text-gray-900">Legal Management</h1>
          <p className="text-gray-600 mt-2">
            Manage legal compliance, NCAA affiliations, and event insurance
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Shield className="h-8 w-8 text-blue-600" />
          <span className="text-sm font-medium text-gray-500">Legal Oversight</span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-500">NCAA Status</div>
                <div className="text-2xl font-bold text-gray-900">Active</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Shield className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-500">Insurance Coverage</div>
                <div className="text-2xl font-bold text-gray-900">Current</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-500">Legal Documents</div>
                <div className="text-2xl font-bold text-gray-900">Up to Date</div>
              </div>
            </div>
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
                <CardDescription>
                  NCAA affiliations and licensing management
                </CardDescription>
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
              <ExternalLink className="h-4 w-4" />
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
                <CardDescription>
                  Event insurance and liability coverage
                </CardDescription>
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
              <ExternalLink className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Additional Legal Resources */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Legal Resources & Documentation</span>
          </CardTitle>
          <CardDescription>
            Quick access to important legal documents and compliance information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">NCAA Compliance</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Student-Athlete Eligibility</li>
                <li>• Licensing Guidelines</li>
                <li>• Brand Usage Rules</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Insurance Coverage</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Event Liability Policies</li>
                <li>• Coverage Limits</li>
                <li>• Claims Procedures</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Legal Documents</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Terms of Service</li>
                <li>• Privacy Policies</li>
                <li>• Licensing Agreements</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}