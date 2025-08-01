
import { Salesperson } from '@shared/types';

// TODO: implement actual fetch logic
export async function getSalespeople(): Promise<Salesperson[]> {
  // TODO: fetch from /api/salespeople
  throw new Error('Not implemented');
}

export async function getSalesperson(id: string): Promise<Salesperson> {
  // TODO: fetch from /api/salespeople/:id
  throw new Error('Not implemented');
}

export async function createSalesperson(data: Partial<Salesperson>): Promise<Salesperson> {
  // TODO: POST to /api/salespeople
  throw new Error('Not implemented');
}

export async function updateSalesperson(id: string, data: Partial<Salesperson>): Promise<Salesperson> {
  // TODO: PATCH to /api/salespeople/:id
  throw new Error('Not implemented');
}

export async function deleteSalesperson(id: string): Promise<void> {
  // TODO: DELETE to /api/salespeople/:id
  throw new Error('Not implemented');
}

// TODO: implement salesperson assignment functions
export async function assignSalespersonToCustomer(customerId: string, salespersonId: string): Promise<void> {
  // TODO: POST to /api/customers/:id/assign-salesperson
  throw new Error('Not implemented');
}

export async function unassignSalespersonFromCustomer(customerId: string): Promise<void> {
  // TODO: DELETE /api/customers/:id/salesperson
  throw new Error('Not implemented');
}

// TODO: implement file upload functions
export async function uploadSalespersonProfileImage(id: string, file: File): Promise<string> {
  // TODO: use storageService or direct upload to /api/salespeople/:id/profile-image
  throw new Error('Not implemented');
}

export async function uploadSalespersonPayrollFile(id: string, file: File): Promise<string> {
  // TODO: use storageService or direct upload to /api/salespeople/:id/payroll-file
  throw new Error('Not implemented');
}
