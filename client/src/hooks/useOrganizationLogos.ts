import { useQuery } from '@tanstack/react-query';

interface OrganizationFile {
  id: string;
  fileName: string;
  fileType: string;
  fileUrl: string;
  isPrimary: boolean;
  uploadedAt: string;
}

/**
 * Hook to fetch organization logos for multiple customers
 */
export function useOrganizationLogos(customerIds: string[]) {
  return useQuery({
    queryKey: ['organization-files', customerIds],
    queryFn: async () => {
      const logoMap = new Map<string, string>();
      
      // Fetch customer data to get company_logo_url
      const logoPromises = customerIds.map(async (customerId) => {
        try {
          const response = await fetch(`/api/customers`, {
            credentials: 'include',
          });
          
          if (response.ok) {
            const data = await response.json();
            const customers = data.success ? (data.data?.customers || data.data || []) : [];
            const customer = customers.find((c: any) => c.id === customerId);
            
            if (customer && customer.company_logo_url) {
              logoMap.set(customerId, customer.company_logo_url);
            }
          }
        } catch (error) {
          console.warn(`Failed to fetch logo for customer ${customerId}:`, error);
        }
      });
      
      await Promise.all(logoPromises);
      return logoMap;
    },
    enabled: customerIds.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
  });
}

/**
 * Hook to fetch logo for a single organization
 */
export function useOrganizationLogo(customerId: string | null) {
  return useQuery({
    queryKey: ['organization-files', customerId, 'logo'],
    queryFn: async () => {
      if (!customerId) return null;
      
      try {
        const response = await fetch(`/api/customers`, {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          const customers = data.success ? (data.data?.customers || data.data || []) : [];
          const customer = customers.find((c: any) => c.id === customerId);
          
          if (customer && customer.company_logo_url) {
            return customer.company_logo_url;
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch logo for customer ${customerId}:`, error);
      }
      
      return null;
    },
    enabled: !!customerId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
  });
}