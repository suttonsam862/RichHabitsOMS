import { z } from 'zod';

// Order types
export const orderItemSchema = z.object({
  id: z.number().optional(),
  productName: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  size: z.string().optional(),
  color: z.string().optional(),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
  unitPrice: z.coerce.number().min(0.01, 'Unit price must be greater than 0'),
  totalPrice: z.number().optional(),
});

export const orderFormSchema = z.object({
  orderNumber: z.string().min(1, 'Order number is required'),
  customerId: z.coerce.number({
    required_error: 'Customer is required',
  }),
  status: z.string().default('draft'),
  notes: z.string().optional(),
  items: z.array(orderItemSchema).min(1, 'At least one item is required'),
});

export type OrderFormValues = z.infer<typeof orderFormSchema>;
export type OrderItemValues = z.infer<typeof orderItemSchema>;

// Customer type for select dropdown
export interface Customer {
  id: number;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
}

// Order type from API
// Catalog Item type
export interface CatalogItem {
  id: string;
  name: string;
  description?: string;
  category?: string;
  sport?: string;
  price?: number;
  images?: Array<{
    id: string;
    url: string;
    fileName: string;
  }>;
  sizes?: string[];
  colors?: string[];
  fabrics?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Order {
  id: number;
  orderNumber: string;
  customerId: number;
  status: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  customer?: {
    id: number;
    user: {
      firstName: string;
      lastName: string;
    };
  };
}

export interface OrderItem {
  id: number;
  orderId: number;
  productName: string;
  description?: string;
  size?: string;
  color?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}