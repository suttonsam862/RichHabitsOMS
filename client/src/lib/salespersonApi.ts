/**
 * Salesperson API Client
 * Handles all API requests for salesperson management
 */

const API_BASE = '/api/sales-management';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

interface Salesperson {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  employee_id: string;
  position_title?: string;
  hire_date?: string;
  employment_status: string;
  base_salary?: number;
  commission_rate?: number;
  sales_quota?: number;
  current_year_sales?: number;
  customer_count?: number;
  performance_rating?: number;
  profile_image_url?: string;
  payroll_file_url?: string;
  is_active: boolean;
  manager_id?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Fetch all salespeople
 */
export async function getSalespeople(): Promise<ApiResponse<Salesperson[]>> {
  try {
    const response = await fetch(API_BASE, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching salespeople:', error);
    throw error;
  }
}

/**
 * Fetch single salesperson by ID
 */
export async function getSalesperson(id: string): Promise<ApiResponse<Salesperson>> {
  try {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching salesperson ${id}:`, error);
    throw error;
  }
}

/**
 * Create new salesperson
 */
export async function createSalesperson(salespersonData: Partial<Salesperson>): Promise<ApiResponse<Salesperson>> {
  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(salespersonData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating salesperson:', error);
    throw error;
  }
}

/**
 * Update existing salesperson
 */
export async function updateSalesperson(id: string, salespersonData: Partial<Salesperson>): Promise<ApiResponse<Salesperson>> {
  try {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(salespersonData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error updating salesperson ${id}:`, error);
    throw error;
  }
}

/**
 * Delete salesperson
 */
export async function deleteSalesperson(id: string): Promise<ApiResponse<void>> {
  try {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error deleting salesperson ${id}:`, error);
    throw error;
  }
}

/**
 * Assign customer to salesperson
 */
export async function assignCustomerToSalesperson(customerId: string, salespersonId: string, assignmentType = 'primary'): Promise<ApiResponse<any>> {
  try {
    const response = await fetch(`${API_BASE}/assign-customer`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerId,
        salespersonId,
        assignmentType,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error assigning customer to salesperson:', error);
    throw error;
  }
}

export type { Salesperson, ApiResponse };