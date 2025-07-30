# ThreadCraft Development Scripts

This directory contains utility scripts for development, testing, and deployment.

## Database Seeding

### devSeed.ts

Loads comprehensive development seed data into Supabase database using the service key.

#### Features
- ✅ Loads realistic business sample data from `mocks/devSeedData.json`
- ✅ Creates Supabase Auth users with proper metadata
- ✅ Validates data relationships before insertion
- ✅ Clears existing data safely with dependency ordering
- ✅ Batch insertion with error handling and progress tracking
- ✅ Comprehensive logging and error reporting

#### Usage

```bash
# Standard seeding with confirmation
tsx scripts/devSeed.ts

# Force seeding without confirmation
tsx scripts/devSeed.ts --force

# Validate data without inserting (dry run)
tsx scripts/devSeed.ts --dry-run

# Only clear existing data
tsx scripts/devSeed.ts --clear-only

# Show help
tsx scripts/devSeed.ts --help
```

#### Environment Variables Required

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
```

#### Development Login Credentials

After seeding, you can log in with any of these accounts:

```
Admin User:
Email: admin@threadcraft-dev.com
Password: DevPassword123!

Salesperson:
Email: john.sales@threadcraft-dev.com  
Password: DevPassword123!

Designer:
Email: emma.design@threadcraft-dev.com
Password: DevPassword123!

Manufacturers:
Email: precision.threads@threadcraft-dev.com
Email: elite.garments@threadcraft-dev.com
Password: DevPassword123!
```

#### Seed Data Includes

- **5 User Profiles**: Admin, salesperson, designer, and 2 manufacturers with realistic capabilities
- **5 Customers**: Education, business, sports, nonprofit, and government organizations
- **5 Catalog Items**: Basketball jerseys, soccer uniforms, corporate polos, football jerseys, medical scrubs
- **5 Orders**: Different workflow stages (draft, design, production, completed) with authentic pricing
- **Order Items**: Detailed specifications, customization, and production notes
- **Design Tasks**: Active tasks linked to orders requiring design work

#### Data Validation

The script validates:
- ✅ Customer-user profile relationships
- ✅ Order-customer relationships  
- ✅ Order item-order relationships
- ✅ Design task-order relationships
- ✅ Foreign key constraints
- ✅ Required field presence

#### Error Handling

- Batch processing prevents timeout on large datasets
- Individual record error tracking with detailed reporting
- Automatic rollback on critical failures
- Comprehensive logging for debugging

#### Production Safety

- Only works with development environment detection
- Requires explicit confirmation before data modification
- Service key validation before execution
- Safe table clearing with dependency ordering

## Running Scripts

### Prerequisites

```bash
# Install dependencies
npm install

# Ensure environment variables are configured
cp .env.example .env
# Edit .env with your Supabase credentials
```

### Development Workflow

```bash
# 1. Clear and seed database for fresh start
tsx scripts/devSeed.ts --force

# 2. Start application
npm run dev

# 3. Access application with seeded data
# Login with admin@threadcraft-dev.com / DevPassword123!
```

### Troubleshooting

#### Database Connection Issues
```bash
# Test connection only
tsx scripts/devSeed.ts --dry-run
```

#### Permission Issues
- Ensure SUPABASE_SERVICE_KEY has admin permissions
- Check RLS policies allow service key access
- Verify table schemas match seed data structure

#### Data Validation Failures
```bash
# Check data relationships
tsx scripts/devSeed.ts --dry-run

# View detailed error logs in console output
```

## Script Development

### Adding New Scripts

1. Create TypeScript file in `scripts/` directory
2. Add proper imports and error handling
3. Include help documentation
4. Add entry to this README
5. Test with development environment

### Best Practices

- Always validate environment variables
- Include comprehensive error handling  
- Provide progress feedback for long operations
- Support dry-run mode for validation
- Include help documentation
- Use TypeScript for type safety
- Follow existing logging patterns