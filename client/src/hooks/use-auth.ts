// Re-export from the unified AuthContext to maintain compatibility
export { useAuth } from '@/context/AuthContext';

// Legacy types for backward compatibility
export interface User {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  role: string;
  visiblePages?: string[];
  isSuperAdmin?: boolean;
  customRole?: string;
}

export interface RegisterData {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role?: string;
}