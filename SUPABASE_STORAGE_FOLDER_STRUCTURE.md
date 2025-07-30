# Supabase Storage Folder Structure Documentation

## Overview
ThreadCraft uses a standardized folder structure in Supabase Storage to ensure proper organization and easy file management. All uploaded files must be organized within entity-based folders.

## Standardized Folder Structure

### Primary Entity Folders
All files are organized under the following entity-based structure:

```
uploads/                          # Public bucket for general uploads
├── catalog_items/{item_id}/      # Catalog item images and files
│   ├── {uuid}_filename.jpg       # Product images
│   ├── {uuid}_variant.jpg        # Size/color variants
│   └── measurement-{uuid}.pdf    # Measurement charts
├── customers/{customer_id}/      # Customer-specific files
│   ├── {uuid}_profile.jpg        # Profile photos
│   └── {uuid}_documents.pdf      # Customer documents
└── orders/{order_id}/            # Order-related files
    ├── {uuid}_general.jpg        # General order files
    ├── production/               # Production progress images
    │   ├── {uuid}_cutting.jpg    # Production stage images
    │   └── {uuid}_assembly.jpg   # Assembly progress
    └── designs/                  # Design files and mockups
        ├── {uuid}_mockup.pdf     # Design mockups
        └── {uuid}_specs.pdf      # Design specifications

private_files/                    # Private bucket for sensitive files
├── customers/{customer_id}/      # Private customer files
├── orders/{order_id}/           # Private order files
└── design_tasks/{task_id}/      # Private design task files
```

## Implementation Details

### StorageService Folder Patterns
The `StorageService` class defines standardized folder patterns:

```typescript
private static readonly FOLDER_PATTERNS = {
  CATALOG_ITEMS: (itemId: string) => `catalog_items/${itemId}/`,
  CUSTOMERS: (customerId: string) => `customers/${customerId}/`,
  ORDERS: (orderId: string) => `orders/${orderId}/`,
  ORDER_PRODUCTION: (orderId: string) => `orders/${orderId}/production/`,
  ORDER_DESIGNS: (orderId: string) => `orders/${orderId}/designs/`,
  DESIGN_TASKS: (taskId: string) => `design_tasks/${taskId}/`,
  MANUFACTURER_MEDIA: (manufacturerId: string) => `manufacturers/${manufacturerId}/`
}
```

### File Naming Convention
All files use the following naming pattern:
- `{uuid}_{original_name_cleaned}.{extension}`
- UUIDs prevent filename conflicts
- Original names are sanitized (special characters replaced with underscores)
- File extensions are preserved for proper MIME type detection

### Helper Method
Use `StorageService.getFolderPath()` to get standardized paths:

```typescript
// Get catalog item folder
const catalogPath = StorageService.getFolderPath('catalog_items', itemId);

// Get order production folder
const productionPath = StorageService.getFolderPath('orders', orderId, 'production');

// Get customer folder
const customerPath = StorageService.getFolderPath('customers', customerId);
```

## Upload Methods by Entity Type

### Catalog Items
```typescript
StorageService.uploadCatalogImage(itemId, file, metadata, variant, ownerId)
```
- **Location**: `catalog_items/{itemId}/`
- **Visibility**: Public by default
- **Use Cases**: Product images, size/color variants, measurement charts

### Customers
```typescript
StorageService.uploadCustomerPhoto(customerId, file, metadata, ownerId)
```
- **Location**: `customers/{customerId}/`
- **Visibility**: Private by default
- **Use Cases**: Profile photos, customer documents

### Orders - Production
```typescript
StorageService.uploadProductionImage(orderId, file, metadata, stage, ownerId)
```
- **Location**: `orders/{orderId}/production/`
- **Visibility**: Private by default
- **Use Cases**: Production progress photos, quality control images

### Orders - Design Files
```typescript
StorageService.uploadDesignFile(orderId, file, metadata)
```
- **Location**: `orders/{orderId}/designs/`
- **Visibility**: Private by default
- **Use Cases**: Design mockups, specifications, client approval files

## Benefits of This Structure

### Organization
- Clear separation of files by entity type
- Easy to locate files related to specific entities
- Scalable structure as business grows

### Security
- Entity-based access control through folder structure
- Private vs public buckets for sensitive vs shareable content
- Row Level Security (RLS) policies can be applied by folder path

### Maintenance
- Easy cleanup of files when entities are deleted
- Automated orphaned file detection by entity
- Clear audit trail of file ownership

### Performance
- Faster file listing when scoped to specific entities
- Efficient storage bucket organization
- Reduced query complexity for file operations

## Migration Notes
- All existing uploads have been migrated to this folder structure
- Legacy paths are no longer supported
- All new uploads automatically use standardized folders
- Storage cleanup utilities respect the folder structure

## Compliance
This folder structure ensures:
- ✅ All files organized by entity ID
- ✅ No loose files in bucket root
- ✅ Consistent naming conventions
- ✅ Proper visibility controls
- ✅ Scalable organization pattern

## Usage Examples

### Upload Catalog Image
```typescript
const result = await StorageService.uploadCatalogImage(
  'item-123',
  fileBuffer,
  { name: 'product.jpg', size: 1024, type: 'image/jpeg' },
  'thumbnail',
  'user-456'
);
// Creates: catalog_items/item-123/{uuid}_product_thumbnail.jpg
```

### Upload Customer Photo
```typescript
const result = await StorageService.uploadCustomerPhoto(
  'customer-789',
  fileBuffer,
  { name: 'profile.jpg', size: 2048, type: 'image/jpeg' },
  'user-456'
);
// Creates: customers/customer-789/{uuid}_profile.jpg
```

### Upload Production Image
```typescript
const result = await StorageService.uploadProductionImage(
  'order-321',
  fileBuffer,
  { name: 'progress.jpg', size: 1536, type: 'image/jpeg' },
  'cutting',
  'user-456'
);
// Creates: orders/order-321/production/{uuid}_cutting_progress.jpg
```