
# Comprehensive Catalog System Setup for Replit Agent

## Overview
This guide ensures the catalog management system is fully operational and ready for user use. The catalog system includes item management, categorization, image uploads, and proper authentication.

## Step 1: Database Schema Verification

### 1.1 Verify Required Tables Exist
Check that all catalog-related tables are properly created:

```sql
-- Run in Supabase SQL Editor
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('catalog_items', 'catalog_categories', 'catalog_sports');
```

### 1.2 Create Missing Tables
If any tables are missing, run the creation scripts:

```bash
# Create catalog options tables
node scripts/database/create-catalog-options-tables.js

# Verify table structure
psql $DATABASE_URL -c "\d catalog_items"
```

## Step 2: Authentication System Validation

### 2.1 Verify User Roles and Permissions
Ensure the custom role users can access catalog features:

```sql
-- Check user profiles and roles
SELECT id, username, role, first_name, last_name 
FROM user_profiles 
WHERE role IN ('admin', 'catalog_manager');
```

### 2.2 Test Authentication Flow
1. Login with admin credentials
2. Verify token storage in localStorage
3. Test API calls with proper Bearer token headers

## Step 3: Catalog Routes Comprehensive Testing

### 3.1 Test Core Catalog CRUD Operations

**GET /api/catalog** - List all catalog items
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     http://localhost:5000/api/catalog
```

**POST /api/catalog** - Create new catalog item
```bash
curl -X POST \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Test T-Shirt",
       "category": "T-Shirts",
       "sport": "All Around Item",
       "basePrice": 19.99,
       "unitCost": 12.00,
       "sku": "TEST-001",
       "etaDays": "7"
     }' \
     http://localhost:5000/api/catalog
```

**GET /api/catalog/:id** - Get specific item
**PUT /api/catalog/:id** - Update item
**DELETE /api/catalog/:id** - Delete item

### 3.2 Test Catalog Options Routes

**GET /api/catalog-options/categories** - List categories
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:5000/api/catalog-options/categories
```

**POST /api/catalog-options/categories** - Add new category
```bash
curl -X POST \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"name": "New Category"}' \
     http://localhost:5000/api/catalog-options/categories
```

**GET /api/catalog-options/sports** - List sports
**POST /api/catalog-options/sports** - Add new sport

### 3.3 Test SKU Management
**GET /api/catalog/check-sku?sku=TEST-001** - Check SKU availability

## Step 4: Form Validation and Data Integrity

### 4.1 Required Field Validation
Verify all required fields are properly validated:
- name (string, 1-255 chars)
- category (string, must exist in catalog_categories)
- sport (string, must exist in catalog_sports)
- basePrice (decimal, 0.01-999999.99)
- unitCost (decimal, 0.00-999999.99)
- sku (string, 3-100 chars, unique)
- etaDays (string, required)

### 4.2 Data Type Validation
- Numeric fields properly converted and validated
- JSON fields (tags, specifications) properly parsed
- Boolean fields properly handled

### 4.3 Business Logic Validation
- SKU uniqueness (case insensitive)
- Measurement requirements (if hasMeasurements = true, require instructions or chart URL)
- Category/sport existence validation

## Step 5: Image Upload System Testing

### 5.1 Test Image Upload Endpoints
**POST /api/images/catalog/:catalogItemId** - Upload catalog item image

```bash
curl -X POST \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -F "image=@test-image.jpg" \
     http://localhost:5000/api/images/catalog/CATALOG_ITEM_ID
```

### 5.2 Verify Image Storage
- Check uploads/catalog directory exists
- Verify image URL generation
- Test image file cleanup on failures

## Step 6: Frontend Integration Testing

### 6.1 Catalog Page Functionality
1. Navigate to /admin/catalog
2. Test "Add Item" form with all fields
3. Test category/sport dropdowns with "Add New" options
4. Test SKU auto-generation and manual override
5. Test form validation and error handling
6. Test image upload functionality

### 6.2 Data Display and Sorting
1. Verify catalog items display correctly
2. Test filtering by category/sport
3. Test search functionality
4. Verify pagination if implemented

## Step 7: Error Handling and Edge Cases

### 7.1 Authentication Errors
- Test expired tokens
- Test invalid tokens
- Test missing tokens
- Verify proper error messages

### 7.2 Validation Errors
- Test duplicate SKU handling
- Test invalid data types
- Test missing required fields
- Test oversized inputs

### 7.3 Database Errors
- Test foreign key constraints
- Test unique constraints
- Test connection failures

## Step 8: Performance and Security

### 8.1 Security Checks
- Verify role-based access control
- Test SQL injection prevention
- Test file upload security (type, size limits)
- Verify proper error message sanitization

### 8.2 Performance Optimization
- Test with large datasets
- Verify database indexes
- Check query performance
- Test concurrent user scenarios

## Step 9: User Experience Validation

### 9.1 Form Usability
- Clear field labels and placeholders
- Proper validation messages
- Loading states during operations
- Success/error notifications

### 9.2 Workflow Testing
1. Complete item creation workflow
2. Test item editing workflow
3. Test category/sport management
4. Test image upload workflow

## Step 10: Final Verification Checklist

- [ ] All database tables created and accessible
- [ ] Authentication working for all user roles
- [ ] All catalog CRUD operations functional
- [ ] Category and sport management working
- [ ] SKU generation and validation working
- [ ] Image upload system operational
- [ ] Form validation comprehensive
- [ ] Error handling robust
- [ ] Frontend displays data correctly
- [ ] User workflows complete successfully

## Common Issues and Solutions

### Database Connection Issues
```bash
# Test database connection
node -e "
const { testSupabaseConnection } = require('./server/db.ts');
testSupabaseConnection().then(result => console.log('Connection:', result));
"
```

### Authentication Token Issues
```javascript
// Clear localStorage and re-login
localStorage.removeItem('authToken');
// Then login again
```

### Missing Environment Variables
```bash
# Verify required environment variables
echo "SUPABASE_URL: $SUPABASE_URL"
echo "SUPABASE_ANON_KEY: $SUPABASE_ANON_KEY"
```

### Route Registration Issues
```bash
# Check server logs for duplicate route warnings
npm run dev
# Look for "Route already registered" warnings
```

## Success Criteria

The catalog system is ready for user use when:
1. All API endpoints respond correctly
2. Frontend forms work without errors
3. Data persists correctly in database
4. Authentication and authorization work properly
5. Image uploads function correctly
6. User workflows are intuitive and complete
7. Error handling provides meaningful feedback
8. Performance is acceptable for expected load

## Next Steps After Setup

1. Create user documentation
2. Set up monitoring and logging
3. Plan backup and recovery procedures
4. Establish maintenance schedules
5. Consider additional features based on user feedback
