/**
 * Schema Transformation Utilities
 * Handles camelCase ↔ snake_case conversion between frontend and database
 */

// Convert camelCase to snake_case for database operations
export function toSnakeCase(obj: any): any {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(toSnakeCase);
  }

  const snakeCaseObj: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    snakeCaseObj[snakeKey] = typeof value === 'object' ? toSnakeCase(value) : value;
  }
  return snakeCaseObj;
}

// Convert snake_case to camelCase for frontend responses
export function toCamelCase(obj: any): any {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(toCamelCase);
  }

  const camelCaseObj: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    camelCaseObj[camelKey] = typeof value === 'object' ? toCamelCase(value) : value;
  }
  return camelCaseObj;
}

// Database-specific transformers for common entities
export const customerTransformers = {
  toDatabase: (customer: any) => ({
    id: customer.id,
    first_name: customer.firstName,
    last_name: customer.lastName,
    email: customer.email,
    company: customer.company,
    phone: customer.phone,
    address: customer.address,
    city: customer.city,
    state: customer.state,
    zip: customer.zip,
    country: customer.country,
    created_at: customer.createdAt,
    updated_at: customer.updatedAt
  }),
  
  fromDatabase: (customer: any) => ({
    id: customer.id,
    firstName: customer.first_name,
    lastName: customer.last_name,
    email: customer.email,
    company: customer.company,
    phone: customer.phone,
    address: customer.address,
    city: customer.city,
    state: customer.state,
    zip: customer.zip,
    country: customer.country,
    createdAt: customer.created_at,
    updatedAt: customer.updated_at
  })
};

export const orderTransformers = {
  toDatabase: (order: any) => ({
    id: order.id,
    order_number: order.orderNumber,
    customer_id: order.customerId,
    salesperson_id: order.salespersonId,
    assigned_designer_id: order.assignedDesignerId,
    assigned_manufacturer_id: order.assignedManufacturerId,
    status: order.status,
    priority: order.priority,
    total_amount: order.totalAmount,
    tax: order.tax,
    discount: order.discount,
    notes: order.notes,
    internal_notes: order.internalNotes,
    customer_requirements: order.customerRequirements,
    delivery_address: order.deliveryAddress,
    delivery_instructions: order.deliveryInstructions,
    rush_order: order.rushOrder,
    estimated_delivery_date: order.estimatedDeliveryDate,
    actual_delivery_date: order.actualDeliveryDate,
    logo_url: order.logoUrl,
    company_name: order.companyName,
    created_at: order.createdAt,
    updated_at: order.updatedAt
  }),
  
  fromDatabase: (order: any) => ({
    id: order.id,
    orderNumber: order.order_number,
    customerId: order.customer_id,
    salespersonId: order.salesperson_id,
    assignedDesignerId: order.assigned_designer_id,
    assignedManufacturerId: order.assigned_manufacturer_id,
    status: order.status,
    priority: order.priority,
    totalAmount: order.total_amount,
    tax: order.tax,
    discount: order.discount,
    notes: order.notes,
    internalNotes: order.internal_notes,
    customerRequirements: order.customer_requirements,
    deliveryAddress: order.delivery_address,
    deliveryInstructions: order.delivery_instructions,
    rushOrder: order.rush_order,
    estimatedDeliveryDate: order.estimated_delivery_date,
    actualDeliveryDate: order.actual_delivery_date,
    logoUrl: order.logo_url,
    companyName: order.company_name,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    // Include transformed customer data if present
    customer: order.customers ? customerTransformers.fromDatabase(order.customers) : null,
    // Include transformed order items if present
    items: order.order_items ? order.order_items.map(orderItemTransformers.fromDatabase) : []
  })
};

export const orderItemTransformers = {
  toDatabase: (item: any) => ({
    id: item.id,
    order_id: item.orderId,
    name: item.name || item.productName,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    total_price: item.totalPrice,
    color: item.color,
    size: item.size,
    material: item.material,
    fabric: item.fabric,
    customization: item.customization,
    specifications: item.specifications,
    design_file_url: item.designFileUrl,
    production_notes: item.productionNotes,
    status: item.status,
    estimated_completion_date: item.estimatedCompletionDate,
    actual_completion_date: item.actualCompletionDate,
    created_at: item.createdAt,
    updated_at: item.updatedAt
  }),
  
  fromDatabase: (item: any) => ({
    id: item.id,
    orderId: item.order_id,
    name: item.name,
    productName: item.name, // Alias for compatibility
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unit_price,
    totalPrice: item.total_price,
    color: item.color,
    size: item.size,
    material: item.material,
    fabric: item.fabric,
    customization: item.customization,
    specifications: item.specifications,
    designFileUrl: item.design_file_url,
    productionNotes: item.production_notes,
    status: item.status,
    estimatedCompletionDate: item.estimated_completion_date,
    actualCompletionDate: item.actual_completion_date,
    createdAt: item.created_at,
    updatedAt: item.updated_at
  })
};

export const userTransformers = {
  toDatabase: (user: any) => ({
    id: user.id,
    first_name: user.firstName,
    last_name: user.lastName,
    email: user.email,
    role: user.role,
    phone: user.phone,
    company: user.company,
    department: user.department,
    title: user.title,
    status: user.status,
    is_email_verified: user.isEmailVerified,
    last_login: user.lastLogin,
    created_at: user.createdAt,
    updated_at: user.updatedAt,
    permissions: user.permissions,
    custom_attributes: user.customAttributes
  }),
  
  fromDatabase: (user: any) => ({
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    company: user.company,
    department: user.department,
    title: user.title,
    status: user.status,
    isEmailVerified: user.is_email_verified,
    lastLogin: user.last_login,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
    permissions: user.permissions,
    customAttributes: user.custom_attributes
  })
};

export const designTaskTransformers = {
  toDatabase: (task: any) => ({
    id: task.id,
    order_id: task.orderId,
    designer_id: task.designerId,
    status: task.status,
    requirements: task.requirements,
    due_date: task.dueDate,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
    completed_at: task.completedAt
  }),
  
  fromDatabase: (task: any) => ({
    id: task.id,
    orderId: task.order_id,
    designerId: task.designer_id,
    status: task.status,
    requirements: task.requirements,
    dueDate: task.due_date,
    createdAt: task.created_at,
    updatedAt: task.updated_at,
    completedAt: task.completed_at
  })
};

export const productionTaskTransformers = {
  toDatabase: (task: any) => ({
    id: task.id,
    order_id: task.orderId,
    manufacturer_id: task.manufacturerId,
    status: task.status,
    notes: task.notes,
    due_date: task.dueDate,
    completion_percentage: task.completionPercentage,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
    completed_at: task.completedAt
  }),
  
  fromDatabase: (task: any) => ({
    id: task.id,
    orderId: task.order_id,
    manufacturerId: task.manufacturer_id,
    status: task.status,
    notes: task.notes,
    dueDate: task.due_date,
    completionPercentage: task.completion_percentage,
    createdAt: task.created_at,
    updatedAt: task.updated_at,
    completedAt: task.completed_at
  })
};