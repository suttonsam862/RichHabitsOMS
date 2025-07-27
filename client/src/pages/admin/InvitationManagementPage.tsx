
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { useToast } from '../../hooks/use-toast';
import { apiRequest, getQueryFn } from '../../lib/queryClient';
import { 
  UserPlus, 
  Mail, 
  Clock, 
  CheckCircle, 
  XCircle, 
  FileText, 
  Building, 
  Eye,
  Copy,
  RefreshCw
} from 'lucide-react';

interface CreateInvitationData {
  email: string;
  role: string;
  customMessage: string;
  organizationContext: string;
  expectedOrderVolume: string;
  priorityLevel: string;
  expirationDays: number;
}

export function InvitationManagementPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState<any>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  
  const [createData, setCreateData] = useState<CreateInvitationData>({
    email: '',
    role: 'customer',
    customMessage: '',
    organizationContext: '',
    expectedOrderVolume: '',
    priorityLevel: 'standard',
    expirationDays: 7
  });

  // Fetch invitations
  const { data: invitationsResponse, isLoading } = useQuery({
    queryKey: ['/api/invitations/admin/list'],
    queryFn: getQueryFn({ on401: 'throw' }),
  });

  const invitations = Array.isArray(invitationsResponse) ? invitationsResponse : [];

  // Create invitation mutation
  const createInvitationMutation = useMutation({
    mutationFn: (data: CreateInvitationData) => 
      apiRequest('POST', '/api/invitations/create', data),
    onSuccess: (response) => {
      toast({
        title: 'Invitation Created',
        description: 'The invitation has been sent successfully.',
      });
      setIsCreateDialogOpen(false);
      setCreateData({
        email: '',
        role: 'customer',
        customMessage: '',
        organizationContext: '',
        expectedOrderVolume: '',
        priorityLevel: 'standard',
        expirationDays: 7
      });
      queryClient.invalidateQueries({ queryKey: ['/api/invitations/admin/list'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create invitation',
        variant: 'destructive'
      });
    }
  });

  const copyInvitationLink = (invitation: any) => {
    const link = `${window.location.origin}/onboarding?token=${invitation.token}`;
    navigator.clipboard.writeText(link);
    toast({
      title: 'Link Copied',
      description: 'Invitation link has been copied to clipboard.'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600">Pending</Badge>;
      case 'accepted':
        return <Badge variant="default" className="bg-green-600">Accepted</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">High</Badge>;
      case 'medium':
        return <Badge variant="default">Medium</Badge>;
      case 'low':
        return <Badge variant="secondary">Low</Badge>;
      default:
        return <Badge variant="outline">Standard</Badge>;
    }
  };

  const getOnboardingProgress = (invitation: any) => {
    const progress = invitation.onboarding_progress?.[0];
    if (!progress) return 0;
    return Math.round((progress.completed_steps?.length || 0) / (progress.total_steps || 8) * 100);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Invitation Management</h1>
          <p className="text-gray-600">Create and manage customer invitations</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Create Invitation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Invitation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={createData.email}
                    onChange={(e) => setCreateData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select 
                    value={createData.role} 
                    onValueChange={(value) => setCreateData(prev => ({ ...prev, role: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer">Customer</SelectItem>
                      <SelectItem value="salesperson">Salesperson</SelectItem>
                      <SelectItem value="designer">Designer</SelectItem>
                      <SelectItem value="manufacturer">Manufacturer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="orgContext">Organization Context</Label>
                <Input
                  id="orgContext"
                  placeholder="e.g., Local sports team, Corporate office"
                  value={createData.organizationContext}
                  onChange={(e) => setCreateData(prev => ({ ...prev, organizationContext: e.target.value }))}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="orderVolume">Expected Order Volume</Label>
                  <Select 
                    value={createData.expectedOrderVolume} 
                    onValueChange={(value) => setCreateData(prev => ({ ...prev, expectedOrderVolume: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select volume" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small (&lt; 50 items)</SelectItem>
                      <SelectItem value="medium">Medium (50-200 items)</SelectItem>
                      <SelectItem value="large">Large (200-500 items)</SelectItem>
                      <SelectItem value="enterprise">Enterprise (500+ items)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="priority">Priority Level</Label>
                  <Select 
                    value={createData.priorityLevel} 
                    onValueChange={(value) => setCreateData(prev => ({ ...prev, priorityLevel: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="expiration">Expiration (Days)</Label>
                <Input
                  id="expiration"
                  type="number"
                  min="1"
                  max="30"
                  value={createData.expirationDays}
                  onChange={(e) => setCreateData(prev => ({ ...prev, expirationDays: parseInt(e.target.value) || 7 }))}
                />
              </div>
              
              <div>
                <Label htmlFor="customMessage">Custom Message</Label>
                <Textarea
                  id="customMessage"
                  placeholder="Optional welcome message for the invitee..."
                  value={createData.customMessage}
                  onChange={(e) => setCreateData(prev => ({ ...prev, customMessage: e.target.value }))}
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => createInvitationMutation.mutate(createData)}
                  disabled={!createData.email || createInvitationMutation.isPending}
                >
                  {createInvitationMutation.isPending ? 'Creating...' : 'Create Invitation'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Mail className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Invitations</p>
                <p className="text-2xl font-bold">{invitations.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold">
                  {invitations.filter((inv: any) => inv.status === 'pending').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Accepted</p>
                <p className="text-2xl font-bold">
                  {invitations.filter((inv: any) => inv.status === 'accepted').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <XCircle className="h-8 w-8 text-red-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Expired</p>
                <p className="text-2xl font-bold">
                  {invitations.filter((inv: any) => new Date(inv.expires_at) < new Date()).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invitations Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Invitations</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.map((invitation: any) => (
                <TableRow key={invitation.id}>
                  <TableCell className="font-medium">{invitation.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{invitation.role}</Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(invitation.status)}</TableCell>
                  <TableCell>{getPriorityBadge(invitation.priority_level)}</TableCell>
                  <TableCell>
                    {invitation.status === 'pending' ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full" 
                            style={{ width: `${getOnboardingProgress(invitation)}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-500">
                          {getOnboardingProgress(invitation)}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">
                        {invitation.status === 'accepted' ? 'Complete' : 'N/A'}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(invitation.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <span className={new Date(invitation.expires_at) < new Date() ? 'text-red-500' : ''}>
                      {new Date(invitation.expires_at).toLocaleDateString()}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedInvitation(invitation);
                          setIsDetailsDialogOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {invitation.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyInvitationLink(invitation)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Invitation Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invitation Details</DialogTitle>
          </DialogHeader>
          {selectedInvitation && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Basic Information</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Email:</strong> {selectedInvitation.email}</p>
                    <p><strong>Role:</strong> {selectedInvitation.role}</p>
                    <p><strong>Status:</strong> {getStatusBadge(selectedInvitation.status)}</p>
                    <p><strong>Priority:</strong> {getPriorityBadge(selectedInvitation.priority_level)}</p>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Timeline</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Created:</strong> {new Date(selectedInvitation.created_at).toLocaleString()}</p>
                    <p><strong>Expires:</strong> {new Date(selectedInvitation.expires_at).toLocaleString()}</p>
                    {selectedInvitation.used_at && (
                      <p><strong>Accepted:</strong> {new Date(selectedInvitation.used_at).toLocaleString()}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Organization Profile */}
              {selectedInvitation.organization_profiles?.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 flex items-center">
                    <Building className="h-4 w-4 mr-2" />
                    Organization Profile
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    {selectedInvitation.organization_profiles.map((org: any) => (
                      <div key={org.id} className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p><strong>Name:</strong> {org.organization_name}</p>
                          <p><strong>Type:</strong> {org.organization_type}</p>
                          <p><strong>Industry:</strong> {org.industry}</p>
                          <p><strong>Website:</strong> {org.website_url}</p>
                        </div>
                        <div>
                          <p><strong>Employees:</strong> {org.employee_count_range}</p>
                          <p><strong>Revenue:</strong> {org.annual_revenue_range}</p>
                          <p><strong>Phone:</strong> {org.business_phone}</p>
                          <p><strong>Location:</strong> {org.city}, {org.state_province}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Order Preferences */}
              {selectedInvitation.order_preferences?.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Order Preferences</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    {selectedInvitation.order_preferences.map((pref: any) => (
                      <div key={pref.id} className="space-y-2 text-sm">
                        <p><strong>Product Types:</strong> {pref.primary_product_types?.join(', ')}</p>
                        <p><strong>Typical Quantity:</strong> {pref.typical_order_quantity_min} - {pref.typical_order_quantity_max}</p>
                        <p><strong>Materials:</strong> {pref.preferred_materials?.join(', ')}</p>
                        <p><strong>Print Methods:</strong> {pref.preferred_print_methods?.join(', ')}</p>
                        <p><strong>Quality Preference:</strong> {pref.quality_preference}</p>
                        <p><strong>Budget Range:</strong> {pref.budget_range_per_item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tax Certificates */}
              {selectedInvitation.tax_exemption_certificates?.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    Tax Exemption Certificates
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    {selectedInvitation.tax_exemption_certificates.map((cert: any) => (
                      <div key={cert.id} className="space-y-2 text-sm">
                        <p><strong>Type:</strong> {cert.certificate_type}</p>
                        <p><strong>Number:</strong> {cert.certificate_number}</p>
                        <p><strong>Issuing State:</strong> {cert.issuing_state}</p>
                        <p><strong>Expires:</strong> {new Date(cert.expiration_date).toLocaleDateString()}</p>
                        <p><strong>Status:</strong> {cert.verification_status}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Message */}
              {selectedInvitation.custom_message && (
                <div>
                  <h3 className="font-semibold mb-2">Custom Message</h3>
                  <div className="bg-blue-50 p-4 rounded-lg text-sm">
                    {selectedInvitation.custom_message}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
