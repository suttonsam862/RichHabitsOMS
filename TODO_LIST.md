
# Salesperson Management - TODO List

## ✅ Completed Scaffolding

### Database
- [x] Migration file created (`scripts/migrations/20250801_add_salesperson_fields.sql`)
- [x] Shared types updated (`shared/types.ts`)

### Frontend
- [x] API client stubs added (`client/src/lib/salespersonApi.ts`)
- [x] React Query hooks scaffolded (`client/src/hooks/useSalespeople.ts`)
- [x] SalespersonManagement page created (`client/src/pages/admin/SalespersonManagement.tsx`)
- [x] CustomerList & CustomerDetails updated with salesperson fields
- [x] SalespersonForm stub created (`client/src/components/forms/SalespersonForm.tsx`)
- [x] Navigation link & route stubbed

### Backend
- [x] Server-side API routes stub created (`server/routes/api/salespersonRoutes.ts`)

---

## 🚧 Pending Implementation (by Agent prompts)

### Database Implementation
- [ ] Run migration to add salesperson fields to tables
- [ ] Create indexes for performance optimization
- [ ] Implement RLS policies for salesperson data access
- [ ] Set up foreign key constraints and cascade rules

### API Implementation
- [ ] Implement actual database queries in `salespersonRoutes.ts`
- [ ] Add proper validation using Zod schemas
- [ ] Integrate with Supabase client
- [ ] Add file upload middleware (multer configuration)
- [ ] Implement storage service integration for profile images
- [ ] Implement storage service integration for payroll files
- [ ] Add error handling and logging
- [ ] Add pagination and filtering for salespeople list

### Frontend API Client
- [ ] Implement actual fetch logic in `salespersonApi.ts`
- [ ] Add proper error handling and retry logic
- [ ] Configure request/response interceptors
- [ ] Add TypeScript types for API responses
- [ ] Implement optimistic updates

### React Query Hooks
- [ ] Wire hooks to actual API functions
- [ ] Add comprehensive error handling
- [ ] Implement optimistic updates
- [ ] Add proper cache invalidation strategies
- [ ] Configure stale-while-revalidate patterns

### SalespersonManagement Page
- [ ] Create data table component for salespeople list
- [ ] Add sorting, filtering, and search functionality
- [ ] Implement stats cards with real data
- [ ] Add bulk operations (delete, status change)
- [ ] Implement customer assignment management
- [ ] Add export functionality for reports

### SalespersonForm Component
- [ ] Add form validation using react-hook-form + Zod
- [ ] Implement file upload progress indicators
- [ ] Add image preview and cropping functionality
- [ ] Implement drag-and-drop file uploads
- [ ] Add commission rate calculation helpers
- [ ] Implement form auto-save
- [ ] Add territory assignment functionality

### Customer Integration
- [ ] Update customer forms with salesperson dropdown
- [ ] Implement salesperson assignment workflow
- [ ] Add salesperson filter to customer list
- [ ] Show salesperson info in customer details
- [ ] Add bulk salesperson assignment

### UI/UX Enhancements
- [ ] Design salesperson profile cards
- [ ] Add avatar placeholders and fallbacks
- [ ] Implement commission rate visualization
- [ ] Add performance metrics dashboard
- [ ] Create assignment history timeline
- [ ] Add notification system for assignments

### File Management
- [ ] Configure storage buckets for profile images
- [ ] Configure storage buckets for payroll files
- [ ] Implement file type validation
- [ ] Add file size limits and compression
- [ ] Implement secure file access controls
- [ ] Add file versioning and backup

### Security & Permissions
- [ ] Implement role-based access controls
- [ ] Add audit logging for salesperson operations
- [ ] Secure file upload endpoints
- [ ] Add data encryption for sensitive information
- [ ] Implement activity monitoring

### Testing
- [ ] Write unit tests for API endpoints
- [ ] Write integration tests for salesperson workflows
- [ ] Add E2E tests for form submissions
- [ ] Test file upload functionality
- [ ] Add performance tests for large datasets

### Navigation & Routing
- [ ] Add breadcrumb navigation
- [ ] Implement deep linking for salesperson details
- [ ] Add route guards and permissions
- [ ] Implement URL state management

---

## 📋 Storage Service Integration Points

### Profile Images
```ts
// TODO: call storageService.uploadFile('salesperson_profiles', `${id}/profile_image`, file)
```

### Payroll Files
```ts
// TODO: call storageService.uploadFile('salesperson_payroll', `${id}/payroll_file`, file)
```

---

## 🔗 Dependencies Required

- [ ] Configure multer for file uploads
- [ ] Add Zod validation schemas
- [ ] Set up image processing (sharp/jimp)
- [ ] Configure file compression utilities
- [ ] Add progress tracking utilities

---

**Next Steps**: Review this scaffolding, then proceed with detailed Agent prompts to implement each TODO section systematically.
