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
      
      // Fetch logos for each customer ID
      const logoPromises = customerIds.map(async (customerId) => {
        try {
          const response = await fetch(`/api/organization-files/${customerId}?fileType=logo`, {
            credentials: 'include',
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data && data.data.length > 0) {
              // Find the primary logo or use the first one
              const primaryLogo = data.data.find((file: OrganizationFile) => file.isPrimary) || data.data[0];
              logoMap.set(customerId, primaryLogo.fileUrl);
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
        const response = await fetch(`/api/organization-files/${customerId}?fileType=logo`, {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data && data.data.length > 0) {
            // Find the primary logo or use the first one
            const primaryLogo = data.data.find((file: OrganizationFile) => file.isPrimary) || data.data[0];
            return primaryLogo.fileUrl;
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