# ThreadCraft Scripts Directory

This directory contains organized utility scripts for database setup, user management, and system administration.

## Directory Structure

### `/admin/` - User Administration Scripts
- `admin-setup.js` - Initial admin user setup
- `confirm-admin.js` - Admin user confirmation
- `create-admin.js` - Create admin user in local database
- `create-admin-in-supabase.js` - Create admin user in Supabase
- `create-supabase-admin.js` - Supabase admin user creation
- `make-super-admin.js` - Promote user to super admin
- `update-admin-role.js` - Update admin user permissions
- `update-super-admin.js` - Super admin privilege updates

### `/database/` - Database Management Scripts
- `create-database-schema.js` - Complete database schema creation
- `create-complete-schema.js` - Full schema with all tables
- `create-catalog-table.js` - Product catalog table setup
- `setup-database-now.js` - Quick database initialization

### `/setup/` - Development and Testing Scripts
- `create-sam.js` - Create test user (Sam)
- `create-test-user.js` - General test user creation
- `fix-and-store-order.js` - Order data repair utility
- `fix-customer-api.js` - Customer API debugging

## Usage Guidelines

### Before Running Scripts
1. Ensure environment variables are properly configured
2. Verify database connectivity
3. Check Supabase credentials

### Common Workflow
1. Database setup: Run `/database/create-complete-schema.js`
2. Admin creation: Run `/admin/create-supabase-admin.js`
3. Test users: Run `/setup/create-test-user.js`

### Environment Requirements
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_KEY` - Supabase service role key
- `DATABASE_URL` - PostgreSQL connection string

## Security Notes
- Admin scripts should only be run in development environments
- Service keys should never be committed to version control
- Test users should be removed from production databases

## Troubleshooting
- Check network connectivity to Supabase
- Verify all environment variables are set
- Ensure proper permissions for service key operations