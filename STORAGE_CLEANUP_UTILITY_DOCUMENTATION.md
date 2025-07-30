# Storage Cleanup Utility Documentation

## Overview

The Storage Cleanup Utility provides comprehensive tools for managing orphaned files in Supabase Storage by cross-referencing against the `image_assets` metadata table. This ensures storage efficiency and data consistency across the ThreadCraft application.

## 🔧 API Endpoints

### 1. Scan for Orphaned Files
**GET** `/api/storage-cleanup/scan-orphaned`

Performs a comprehensive scan of all storage buckets to identify files that exist in storage but have no corresponding record in the `image_assets` table.

**Authorization:** Admin only

**Response:**
```json
{
  "success": true,
  "message": "Orphaned files scan completed",
  "data": {
    "stats": {
      "total_files_scanned": 1245,
      "orphaned_files_found": 23,
      "orphaned_files_deleted": 0,
      "total_space_freed": 0,
      "errors": [],
      "scan_duration_ms": 2341
    },
    "orphaned_files": [
      {
        "bucket": "catalog_items",
        "path": "old-product-image.jpg",
        "size": 245760,
        "lastModified": "2025-07-28T10:30:00Z",
        "url": "https://supabase.co/storage/v1/object/public/catalog_items/old-product-image.jpg"
      }
    ]
  }
}
```

### 2. Delete Orphaned Files
**DELETE** `/api/storage-cleanup/delete-orphaned`

Identifies and optionally deletes orphaned files with safety controls and dry-run capability.

**Authorization:** Admin only

**Request Body:**
```json
{
  "dry_run": false,           // Set to true for preview mode
  "bucket_filter": "uploads", // Optional: limit to specific bucket
  "max_files": 50            // Maximum files to delete in single operation
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cleanup completed - deleted 15 files, freed 12.3 MB",
  "data": {
    "stats": {
      "total_files_scanned": 892,
      "orphaned_files_found": 15,
      "orphaned_files_deleted": 15,
      "total_space_freed": 12894720,
      "errors": [],
      "scan_duration_ms": 1892
    },
    "orphaned_files": [],
    "dry_run": false
  }
}
```

### 3. Storage Statistics
**GET** `/api/storage-cleanup/stats`

Provides comprehensive storage usage statistics across all buckets and database records.

**Authorization:** Admin only

**Response:**
```json
{
  "success": true,
  "data": {
    "storage": {
      "total_files": 1245,
      "total_size_bytes": 52428800,
      "total_size_mb": "50.00",
      "buckets": {
        "catalog_items": {
          "file_count": 892,
          "total_size": 45088768
        },
        "uploads": {
          "file_count": 234,
          "total_size": 5242880
        },
        "private_files": {
          "file_count": 89,
          "total_size": 1835008
        },
        "orders": {
          "file_count": 30,
          "total_size": 262144
        }
      }
    },
    "database": {
      "total": 1187,
      "by_type": {
        "catalog_image": 852,
        "customer_photo": 234,
        "production_image": 67,
        "design_file": 34
      },
      "by_visibility": {
        "public": 852,
        "private": 335
      },
      "total_size": 48234496
    }
  }
}
```

## 🔍 How It Works

### Orphaned File Detection Algorithm

1. **Database Query**: Fetches all active (non-deleted) image URLs from `image_assets` table
2. **Storage Scan**: Recursively scans all configured buckets for files
3. **Cross-Reference**: Compares storage file URLs against database records
4. **Identification**: Files in storage without database records are marked as orphaned
5. **Reporting**: Provides detailed statistics and file listings

### Supported Buckets

- **catalog_items**: Product catalog images (public)
- **uploads**: General upload storage (public)
- **private_files**: Private customer and production files
- **orders**: Order-related files and attachments

### Safety Features

- **Dry Run Mode**: Preview orphaned files without deletion
- **Batch Limits**: Maximum files per cleanup operation (default: 50)
- **Bucket Filtering**: Target specific buckets for focused cleanup
- **Error Handling**: Comprehensive error logging and rollback
- **Admin-Only Access**: Restricted to administrator accounts

## 🚀 Usage Examples

### Basic Orphaned File Scan
```bash
curl -X GET \
  https://your-app.replit.dev/api/storage-cleanup/scan-orphaned \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Safe Cleanup with Dry Run
```bash
curl -X DELETE \
  https://your-app.replit.dev/api/storage-cleanup/delete-orphaned \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dry_run": true,
    "max_files": 25
  }'
```

### Production Cleanup (Limited)
```bash
curl -X DELETE \
  https://your-app.replit.dev/api/storage-cleanup/delete-orphaned \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dry_run": false,
    "bucket_filter": "uploads",
    "max_files": 10
  }'
```

### Storage Statistics
```bash
curl -X GET \
  https://your-app.replit.dev/api/storage-cleanup/stats \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## ⚠️ Important Considerations

### Before Running Cleanup

1. **Backup Critical Data**: Ensure important files are backed up
2. **Review Orphaned Files**: Use dry-run mode to inspect files before deletion
3. **Check Dependencies**: Verify files aren't referenced outside the `image_assets` table
4. **Monitor Resources**: Large cleanup operations may impact performance

### Best Practices

- **Start Small**: Begin with `max_files: 10-25` for initial cleanup
- **Use Dry Run**: Always preview files before permanent deletion
- **Bucket-Specific**: Target specific buckets to avoid broad impact
- **Regular Maintenance**: Schedule periodic scans to prevent accumulation
- **Monitor Logs**: Review cleanup logs for errors or unexpected behavior

### Common Scenarios

**Legacy File Cleanup**: Files uploaded before image_assets table implementation
**Failed Upload Cleanup**: Files uploaded but never properly linked to database records
**Development Cleanup**: Test files and temporary uploads from development
**Migration Cleanup**: Orphaned files from system migrations or updates

## 🔧 Technical Implementation

### File Detection Logic
```typescript
// Generate possible URLs for storage files
const { data: urlData } = supabase.storage
  .from(bucketName)
  .getPublicUrl(fullPath);

const publicUrl = urlData.publicUrl;

// Check against database records
const validUrls = new Set(imageAssets?.map(asset => asset.url) || []);
if (!validUrls.has(publicUrl)) {
  // File is orphaned
}
```

### Recursive Bucket Scanning
The utility recursively scans all folders within each bucket, handling:
- Nested directory structures
- Mixed file and folder content
- Large bucket listings with pagination
- Error handling for inaccessible paths

### Statistics Calculation
Comprehensive metrics including:
- File counts per bucket and type
- Storage space utilization
- Database vs. storage discrepancies
- Processing performance metrics

## 📊 Monitoring and Maintenance

### Regular Health Checks
- **Weekly Scans**: Identify orphaned files before they accumulate
- **Monthly Cleanup**: Remove confirmed orphaned files in controlled batches
- **Quarterly Reviews**: Analyze storage usage patterns and optimize retention

### Performance Considerations
- **Bucket Size**: Large buckets may require longer processing times
- **Network Latency**: Storage API calls may be affected by connection quality
- **Database Load**: Cross-referencing large asset tables may impact performance
- **Memory Usage**: Large file listings require adequate server memory

The Storage Cleanup Utility provides essential maintenance capabilities for keeping your ThreadCraft storage organized, efficient, and synchronized with your application's metadata tracking system.