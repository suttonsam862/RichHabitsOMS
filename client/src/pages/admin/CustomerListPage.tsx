
import React, { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  MoreHorizontal, 
  PlusCircle, 
  Filter, 
  RefreshCw, 
  Mail, 
  UserPlus, 
  FileText, 
  Trash2,
  Users,
  Eye,
  Building2,
  Trophy,
  Briefcase,
  GraduationCap,
  Heart,
  Zap,
  Star
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import AddCustomerForm from "./AddCustomerForm";
import CustomerOnboardingFlow from "@/components/customer/CustomerOnboardingFlow";
import OrganizationDetailModal from "@/components/admin/OrganizationDetailModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Customer {
  id: number | string;
  name?: string;
  email?: string;
  company?: string;
  sport?: string;
  organizationType?: string;
  orders?: number;
  spent?: string;
  lastOrder?: string | null;
  status?: string;
  firstName?: string;
  lastName?: string;
  userId?: number;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  created_at?: string;
}

interface OrganizationCard {
  id: string;
  name: string;
  sport: string;
  type: 'sports' | 'business' | 'education' | 'nonprofit' | 'government';
  customerCount: number;
  totalOrders: number;
  totalSpent: string;
  primaryContact?: string;
  avatar?: string;
  customers: Customer[];
}

const organizationIcons = {
  sports: Trophy,
  business: Briefcase,
  education: GraduationCap,
  nonprofit: Heart,
  government: Building2
};

const organizationColors = {
  sports: 'from-orange-500/20 to-red-500/20 border-orange-500/30',
  business: 'from-blue-500/20 to-indigo-500/20 border-blue-500/30',
  education: 'from-green-500/20 to-emerald-500/20 border-green-500/30',
  nonprofit: 'from-pink-500/20 to-rose-500/20 border-pink-500/30',
  government: 'from-purple-500/20 to-violet-500/20 border-purple-500/30'
};

const sportsOrder = [
  'Football', 'Basketball', 'Soccer', 'Baseball', 'Hockey', 
  'Tennis', 'Golf', 'Swimming', 'Track & Field', 'Volleyball', 
  'Wrestling', 'General Sports'
];

export default function CustomerListPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrganizationType, setSelectedOrganizationType] = useState<string>("all");
  const [isAddCustomerDialogOpen, setIsAddCustomerDialogOpen] = useState(false);
  const [isOnboardingFlowOpen, setIsOnboardingFlowOpen] = useState(false);
  const [isViewCustomerDialogOpen, setIsViewCustomerDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isOrganizationDetailOpen, setIsOrganizationDetailOpen] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState<OrganizationCard | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsViewCustomerDialogOpen(true);
  };

  const handleOrganizationClick = (organization: OrganizationCard) => {
    setSelectedOrganization(organization);
    setIsOrganizationDetailOpen(true);
  };

  const handleOrganizationUpdate = () => {
    // Refresh the customer data when organization is updated
    queryClient.invalidateQueries({ queryKey: ["admin", "customers"] });
  };

  // Fetch real customer data from API
  const { data: customersResponse, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "customers"],
    queryFn: async () => {
      console.log("Fetching real customers from API...");
      try {
        const response = await fetch("/api/customers", {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch customers: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        console.log("Received customer data:", data);
        return data;
      } catch (error) {
        console.error("Customer fetch error:", error);
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    retry: 1, // Only retry once
    retryDelay: 2000 // Wait 2 seconds before retry
  });

  // Enhanced data processing with better error handling
  const processCustomerData = useCallback((data: any) => {
    console.log('Processing customer data:', data);

    if (!data) {
      console.log('No data provided');
      return [];
    }

    let customersArray = [];

    if (Array.isArray(data)) {
      customersArray = data;
    } else if (data && typeof data === 'object') {
      if (data.data && Array.isArray(data.data)) {
        customersArray = data.data;
      } else if (data.customers && Array.isArray(data.customers)) {
        customersArray = data.customers;
      } else {
        console.warn('Unexpected data format, returning empty array:', data);
        return [];
      }
    } else {
      console.warn('Data is not an object or array:', data);
      return [];
    }

    return customersArray || [];
  }, []);

  // Extract customers array from API response
  const customers = React.useMemo(() => {
    if (isLoading || !customersResponse) {
      return [];
    }
    return processCustomerData(customersResponse);
  }, [customersResponse, processCustomerData, isLoading]);

  // Group customers by organization and sport
  const organizations = React.useMemo(() => {
    const orgMap = new Map<string, OrganizationCard>();
    
    customers.forEach((customer: Customer) => {
      const orgName = customer.company || 'Individual Customers';
      const orgType = customer.organizationType || getOrganizationType(orgName);
      const sport = customer.sport || (orgType === 'sports' ? 'General Sports' : 'N/A');
      
      if (!orgMap.has(orgName)) {
        orgMap.set(orgName, {
          id: orgName.toLowerCase().replace(/\s+/g, '-'),
          name: orgName,
          sport: sport,
          type: orgType as OrganizationCard['type'],
          customerCount: 0,
          totalOrders: 0,
          totalSpent: '$0.00',
          customers: []
        });
      }
      
      const org = orgMap.get(orgName)!;
      org.customers.push(customer);
      org.customerCount += 1;
      org.totalOrders += customer.orders || 0;
      
      // Set primary contact as first customer
      if (!org.primaryContact) {
        org.primaryContact = `${customer.firstName} ${customer.lastName}`;
      }
    });
    
    return Array.from(orgMap.values());
  }, [customers]);

  // Helper function to determine organization type
  function getOrganizationType(orgName: string): OrganizationCard['type'] {
    const name = orgName.toLowerCase();
    if (name.includes('sport') || name.includes('team') || name.includes('athletic') || name.includes('fc') || name.includes('united')) return 'sports';
    if (name.includes('school') || name.includes('university') || name.includes('college') || name.includes('education')) return 'education';
    if (name.includes('nonprofit') || name.includes('foundation') || name.includes('charity')) return 'nonprofit';
    if (name.includes('city') || name.includes('county') || name.includes('government') || name.includes('municipal')) return 'government';
    return 'business';
  }

  // Filter organizations by type and search
  const filteredOrganizations = React.useMemo(() => {
    return organizations.filter(org => {
      const matchesSearch = searchTerm === '' || 
        org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        org.primaryContact?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        org.sport.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = selectedOrganizationType === 'all' || org.type === selectedOrganizationType;
      
      return matchesSearch && matchesType;
    });
  }, [organizations, searchTerm, selectedOrganizationType]);

  // Group sports organizations by sport
  const sportOrganizations = React.useMemo(() => {
    const sportsOrgs = filteredOrganizations.filter(org => org.type === 'sports');
    const grouped = new Map<string, OrganizationCard[]>();
    
    sportsOrgs.forEach(org => {
      const sport = org.sport || 'General Sports';
      if (!grouped.has(sport)) {
        grouped.set(sport, []);
      }
      grouped.get(sport)!.push(org);
    });
    
    // Sort by predefined sports order
    const sortedSports = sportsOrder.filter(sport => grouped.has(sport));
    const otherSports = Array.from(grouped.keys()).filter(sport => !sportsOrder.includes(sport));
    
    return [...sortedSports, ...otherSports].map(sport => ({
      sport,
      organizations: grouped.get(sport) || []
    }));
  }, [filteredOrganizations]);

  // Non-sports organizations grouped by type
  const businessOrganizations = React.useMemo(() => {
    const nonSportsOrgs = filteredOrganizations.filter(org => org.type !== 'sports');
    const grouped = {
      business: nonSportsOrgs.filter(org => org.type === 'business'),
      education: nonSportsOrgs.filter(org => org.type === 'education'),
      nonprofit: nonSportsOrgs.filter(org => org.type === 'nonprofit'),
      government: nonSportsOrgs.filter(org => org.type === 'government')
    };
    
    return Object.fromEntries(
      Object.entries(grouped).filter(([_, orgs]) => orgs.length > 0)
    );
  }, [filteredOrganizations]);

  const OrganizationCard = ({ organization }: { organization: OrganizationCard }) => {
    const IconComponent = organizationIcons[organization.type];
    const colorClasses = organizationColors[organization.type];
    
    return (
      <div 
        className={`relative group cursor-pointer min-w-[240px] h-[140px] rounded-lg bg-gradient-to-br ${colorClasses} backdrop-blur-md border transition-all duration-300 hover:scale-[1.02] hover:shadow-xl flex-shrink-0`}
        onClick={() => handleOrganizationClick(organization)}
      >
        {/* Glassmorphism overlay */}
        <div className="absolute inset-0 bg-white/5 rounded-lg backdrop-blur-sm"></div>
        
        {/* Content */}
        <div className="relative z-10 p-4 h-full flex flex-col justify-between">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center">
                <IconComponent className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-white truncate">
                  {organization.name}
                </h3>
                <p className="text-white/70 text-xs">
                  {organization.type === 'sports' ? organization.sport : organization.type}
                </p>
              </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0 text-white/70 hover:text-white hover:bg-white/10"
                  onClick={(e) => e.stopPropagation()} // Prevent card click when clicking dropdown
                >
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="glass-panel border-glass-border">
                <DropdownMenuLabel className="text-foreground">Actions</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-glass-border" />
                <DropdownMenuItem 
                  className="text-foreground hover:bg-white/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOrganizationClick(organization);
                  }}
                >
                  <Eye className="mr-2 h-3 w-3" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem className="text-foreground hover:bg-white/10">
                  <Mail className="mr-2 h-3 w-3" />
                  Contact
                </DropdownMenuItem>
                <DropdownMenuItem className="text-foreground hover:bg-white/10">
                  <FileText className="mr-2 h-3 w-3" />
                  View Orders
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Primary Contact Avatar */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-white/20 to-white/10 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-lg">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-neon-blue/30 to-neon-green/30 flex items-center justify-center">
                <span className="text-white font-bold text-xs">
                  {organization.primaryContact?.charAt(0) || organization.name.charAt(0)}
                </span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex justify-between items-end">
            <div className="text-white/90">
              <div className="text-xs text-white/60">Members</div>
              <div className="text-sm font-bold">{organization.customerCount}</div>
            </div>
            <div className="text-white/90 text-right">
              <div className="text-xs text-white/60">Orders</div>
              <div className="text-sm font-bold">{organization.totalOrders}</div>
            </div>
          </div>
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-white/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Organizations</h1>
          <p className="text-muted-foreground mt-2">
            Manage customer organizations and business relationships
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-2">
          <Button 
            variant="outline"
            onClick={() => setIsAddCustomerDialogOpen(true)}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Quick Add
          </Button>
          <Button onClick={() => setIsOnboardingFlowOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Organization
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="rich-card">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                type="search" 
                placeholder="Search organizations or sports..." 
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <Button 
                variant={selectedOrganizationType === 'all' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setSelectedOrganizationType('all')}
              >
                All
              </Button>
              <Button 
                variant={selectedOrganizationType === 'sports' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setSelectedOrganizationType('sports')}
              >
                <Trophy className="mr-2 h-4 w-4" />
                Sports
              </Button>
              <Button 
                variant={selectedOrganizationType === 'business' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setSelectedOrganizationType('business')}
              >
                <Briefcase className="mr-2 h-4 w-4" />
                Business
              </Button>
              <Button 
                variant={selectedOrganizationType === 'education' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setSelectedOrganizationType('education')}
              >
                <GraduationCap className="mr-2 h-4 w-4" />
                Education
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  console.log("Manually refreshing customer data...");
                  queryClient.removeQueries({ queryKey: ["admin", "customers"] });
                  refetch();
                }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full mr-2" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : isError ? (
        <Card className="rich-card">
          <CardContent className="py-16 text-center">
            <h3 className="text-lg font-medium mb-2 text-foreground">Unable to load organizations</h3>
            <p className="text-muted-foreground">There was an error fetching organization data. Please try again later.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Sports Organizations by Sport */}
          {(selectedOrganizationType === 'all' || selectedOrganizationType === 'sports') && 
            sportOrganizations.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Trophy className="w-6 h-6 text-neon-blue" />
                <h2 className="text-xl font-bold text-foreground">
                  Sports Organizations
                </h2>
                <Badge variant="secondary">
                  {sportOrganizations.reduce((acc, sport) => acc + sport.organizations.length, 0)}
                </Badge>
              </div>
              
              {sportOrganizations.map(({ sport, organizations }) => (
                <div key={sport} className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-semibold text-foreground">{sport}</h3>
                    <Badge variant="outline">{organizations.length}</Badge>
                  </div>
                  
                  <div className="overflow-x-auto pb-2">
                    <div className="flex space-x-4" style={{ width: 'max-content' }}>
                      {organizations.map((org) => (
                        <OrganizationCard key={org.id} organization={org} />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Business Organizations */}
          {Object.keys(businessOrganizations).length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Building2 className="w-6 h-6 text-neon-blue" />
                <h2 className="text-xl font-bold text-foreground">
                  Business Organizations
                </h2>
                <Badge variant="secondary">
                  {Object.values(businessOrganizations).reduce((acc, orgs) => acc + orgs.length, 0)}
                </Badge>
              </div>
              
              {Object.entries(businessOrganizations).map(([type, orgs]) => {
                const IconComponent = organizationIcons[type as keyof typeof organizationIcons];
                return (
                  <div key={type} className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <IconComponent className="w-5 h-5 text-muted-foreground" />
                      <h3 className="text-lg font-semibold text-foreground capitalize">{type}</h3>
                      <Badge variant="outline">{orgs.length}</Badge>
                    </div>
                    
                    <div className="overflow-x-auto pb-2">
                      <div className="flex space-x-4" style={{ width: 'max-content' }}>
                        {orgs.map((org) => (
                          <OrganizationCard key={org.id} organization={org} />
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty State */}
          {sportOrganizations.length === 0 && Object.keys(businessOrganizations).length === 0 && (
            <Card className="rich-card">
              <CardContent className="py-16 text-center">
                <div className="bg-gray-100 p-3 rounded-full mb-4 inline-block">
                  <Building2 className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium mb-2 text-foreground">No organizations found</h3>
                <p className="text-muted-foreground max-w-md mb-6 mx-auto">
                  There are no organizations matching your current filters. Try adjusting your search or filters.
                </p>
                <Button 
                  onClick={() => setIsOnboardingFlowOpen(true)}
                  className="flex items-center"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Organization
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Dialogs */}
      <AddCustomerForm 
        isOpen={isAddCustomerDialogOpen} 
        onClose={() => setIsAddCustomerDialogOpen(false)} 
      />

      <CustomerOnboardingFlow 
        isOpen={isOnboardingFlowOpen}
        onClose={() => setIsOnboardingFlowOpen(false)}
        onSuccess={() => {
          setIsOnboardingFlowOpen(false);
          queryClient.invalidateQueries({ queryKey: ["admin", "customers"] });
        }}
      />

      {/* View Customer Dialog */}
      <Dialog open={isViewCustomerDialogOpen} onOpenChange={setIsViewCustomerDialogOpen}>
        <DialogContent className="bg-rich-black/90 backdrop-blur-md border border-glass-border max-w-2xl" style={{ transform: 'none !important' }}>
          <DialogHeader>
            <DialogTitle className="text-neon-blue flex items-center">
              <Eye className="mr-2 h-5 w-5" />
              Customer Details
            </DialogTitle>
            <DialogDescription className="subtitle text-neon-green">
              Complete customer information and account details
            </DialogDescription>
          </DialogHeader>

          {selectedCustomer && (
            <div className="space-y-6 mt-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground border-b border-glass-border pb-2">
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="subtitle text-muted-foreground text-xs">Full Name</label>
                    <p className="text-foreground font-medium">
                      {selectedCustomer.firstName} {selectedCustomer.lastName}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="subtitle text-muted-foreground text-xs">Email Address</label>
                    <p className="text-foreground">{selectedCustomer.email || "Not provided"}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="subtitle text-muted-foreground text-xs">Company</label>
                    <p className="text-foreground">{selectedCustomer.company || "Not provided"}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="subtitle text-muted-foreground text-xs">Sport</label>
                    <p className="text-foreground">{selectedCustomer.sport || "Not specified"}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="subtitle text-muted-foreground text-xs">Phone</label>
                    <p className="text-foreground">{selectedCustomer.phone || "Not provided"}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="subtitle text-muted-foreground text-xs">Organization Type</label>
                    <p className="text-foreground capitalize">{selectedCustomer.organizationType || "Business"}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Organization Detail Modal */}
      <OrganizationDetailModal
        organization={selectedOrganization}
        isOpen={isOrganizationDetailOpen}
        onClose={() => setIsOrganizationDetailOpen(false)}
        onUpdate={handleOrganizationUpdate}
      />
    </div>
  );
}
