# ThreadCraft - Custom Clothing Order Management System

## Overview

ThreadCraft is a comprehensive full-stack web application designed for managing custom clothing orders from initial client intake to final delivery. The system provides role-based access control, order lifecycle management, design workflow coordination, production tracking, and integrated payment processing.

## System Architecture

### Frontend Architecture
- **Framework**: React.js with TypeScript for type safety
- **UI Components**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack React Query for server state management
- **Build Tool**: Vite for fast development and optimized production builds
- **Authentication**: Supabase Auth integration with custom middleware

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database interactions
- **Authentication**: Supabase Auth with custom session management
- **File Handling**: Local file system with configurable cloud storage support

### Data Storage Solutions
- **Primary Database**: PostgreSQL via Supabase
- **Authentication**: Supabase Auth service
- **Session Storage**: Configurable between PostgreSQL and memory store
- **File Storage**: Local filesystem with uploads directory structure
- **Schema Management**: Drizzle Kit for migrations and schema synchronization

## Key Components

### Authentication and Authorization
- **Multi-role System**: Admin, Salesperson, Designer, Manufacturer, Customer roles
- **Supabase Integration**: Leverages Supabase Auth for user management
- **Row Level Security**: Database-level access control for data protection
- **Session Management**: Express sessions with PostgreSQL or memory store backup

### Order Management System
- **Status Workflow**: Draft → Design → Production → Completion pipeline
- **Order Tracking**: Comprehensive order lifecycle with status transitions
- **Customer Management**: Integrated customer profiles with contact information
- **Order Items**: Detailed product specifications with pricing

### Design Workflow
- **Task Assignment**: Design tasks allocated to specific designers
- **File Management**: Upload and version control for design assets
- **Approval Process**: Review and approval workflow for design submissions
- **Status Tracking**: Real-time updates on design progress

### Production Management
- **Manufacturing Tasks**: Production assignments with progress tracking
- **Resource Allocation**: Manufacturer assignment and workload distribution
- **Quality Control**: Task status management through production pipeline

### Payment Processing
- **Stripe Integration**: Secure payment handling with Stripe APIs
- **Customer Management**: Stripe customer ID tracking for repeat transactions
- **Payment Status**: Comprehensive payment lifecycle tracking

## Data Flow

### User Authentication Flow
1. User login via Supabase Auth
2. Token validation and user profile retrieval
3. Role-based access control enforcement
4. Session establishment with secure cookie management

### Order Processing Flow
1. Customer order creation (draft status)
2. Salesperson review and design task assignment
3. Designer file upload and approval workflow
4. Production task creation and manufacturer assignment
5. Manufacturing progress tracking
6. Order completion and customer notification

### File Upload Flow
1. Secure file upload to local storage
2. Database record creation with file metadata
3. Access control validation for file retrieval
4. Optional cloud storage migration capability

## External Dependencies

### Third-Party Services
- **Supabase**: Authentication, database hosting, and real-time features
- **Stripe**: Payment processing and customer management
- **SendGrid**: Email notification service (optional)
- **QuickBooks**: Accounting integration (optional)

### Core Dependencies
- **@supabase/supabase-js**: Supabase client library
- **@stripe/stripe-js**: Stripe payment integration
- **drizzle-orm**: Type-safe database ORM
- **express-session**: Session management
- **bcrypt**: Password hashing
- **multer**: File upload handling

## Deployment Strategy

### Environment Configuration
- **Development**: Local Vite dev server with hot reloading
- **Production**: Compiled assets with Express static serving
- **Database**: Supabase PostgreSQL with connection pooling
- **Sessions**: PostgreSQL-backed sessions for production scalability

### Build Process
1. Frontend compilation via Vite
2. Backend TypeScript compilation via ESBuild
3. Asset optimization and bundling
4. Database schema synchronization via Drizzle

### Infrastructure Requirements
- Node.js 18+ runtime environment
- PostgreSQL database (via Supabase)
- SSL/TLS certificate for production
- File storage capability (local or cloud)

### Security Considerations
- Environment variable management for sensitive credentials
- Row Level Security policies for data access control
- CSRF protection for form submissions
- Secure file upload validation
- Rate limiting for authentication endpoints

## Changelog
- June 17, 2025. Initial setup
- June 17, 2025. Implemented Rich Habits blackout glassmorphism theme across core components

## User Preferences

Preferred communication style: Simple, everyday language.
Design theme: Rich Habits blackout glassmorphism with neon blue/green accents, sharp edges, luxury branding.

## Recent Changes

### Fixed Comprehensive Catalog Authentication and Functionality Issues (June 27, 2025)
- Standardized authentication token management to use single 'authToken' key throughout application
- Fixed login flow to properly store and validate authentication tokens in localStorage
- Updated all catalog-related API calls to consistently include proper authentication headers
- Resolved duplicate route registration conflicts in server/routes.ts causing authentication failures
- Enhanced server-side authentication middleware to properly validate Bearer tokens
- Implemented comprehensive error handling for authentication failures with user-friendly messages
- Fixed all TypeScript errors in catalog component for improved type safety
- Created admin test user functionality for development and testing purposes
- Verified end-to-end catalog functionality: login, authentication persistence, item creation, SKU generation
- Confirmed proper role-based access control for admin users accessing catalog features
- Updated React Query integration to handle authentication errors gracefully
- Ensured authentication state persists across page refreshes and browser sessions
- Fixed catalog page JavaScript crash caused by variable shadowing in dbSports processing
- Resolved "Cannot access 'dbSports2' before initialization" error in CatalogPage component

### Implemented Custom Role-Based Page Visibility System (June 27, 2025)
- Created two custom role users with tailored page access permissions
- Carter Vail (cartervail@rich-habits.com) - customer_catalog_manager role with access to Customers and Catalog pages
- Charlie Reeves (charliereeves@rich-habits.com) - catalog_manager role with access to Catalog page only
- Extended authentication context to support custom role metadata (customRole, visiblePages)
- Updated server authentication to pass custom role data from Supabase user metadata to frontend
- Implemented hasPageAccess function for granular page visibility control
- Modified navigation filtering to use custom role-based access instead of static role arrays
- Verified complete functionality with successful logins and proper navigation restrictions
- Both users can authenticate and see only their assigned pages in the navigation menu

### Fixed SKU Field Usability in Catalog Management (June 21, 2025)
- Removed read-only restriction from SKU input field in catalog add item form
- Made SKU field fully editable allowing custom SKU entry
- Converted auto-generation from automatic to manual trigger via refresh button
- Updated field label and description to reflect new editable behavior
- Maintained auto-generation functionality as optional feature for user convenience

### Enhanced Catalog Management System with Persistent Storage (June 20, 2025)
- Removed description field from catalog add item form per user requirements
- Implemented dynamic category dropdown with "Add Category" option for real-time category management
- Added sport selection dropdown with "All Around Item" default and "Add Sport" option
- Integrated unit cost input field for future profit/loss calculations
- Added ETA (days) field for production time tracking
- Implemented preferred manufacturer selection referencing system manufacturers
- Created auto-generated SKU system with regenerate functionality using pattern: CATEGORY-NAME-TIMESTAMP-RANDOM
- Added responsive dialog management for adding new categories and sports
- Updated schema to support new fields: sport, unitCost, etaDays, preferredManufacturerId
- Created persistent database storage for categories and sports with dedicated tables (catalog_categories, catalog_sports)
- Built API endpoints for managing categories and sports: GET/POST /api/catalog-options/categories and /api/catalog-options/sports
- Implemented database initialization with default categories and sports data
- Connected frontend to database-driven dropdown options instead of hardcoded arrays

### Efficient Image Upload System (June 20, 2025)
- Implemented comprehensive image upload system for catalog items and order line items
- Created secure file handling with validation (JPEG, JPG, PNG, WebP, 5MB limit)
- Added dedicated API endpoints for catalog and order item image management
- Integrated role-based access control for image operations
- Established proper database synchronization with automatic cleanup on failures
- Created organized upload directory structure with unique filename generation

### Project Refactoring and Organization (June 19, 2025)
- Consolidated root-level scripts into organized directories (`scripts/admin/`, `scripts/database/`, `scripts/setup/`)
- Removed duplicate dashboard components and established single source of truth in `client/src/pages/dashboard/`
- Cleaned up backup files (.bak, .old, .new) and moved to archive directories
- Organized server route files into logical groupings (`server/routes/api/`, `server/routes/auth/`, `server/routes/admin/`)
- Archived debugging files from attached_assets to reduce project clutter
- Created comprehensive scripts documentation and usage guidelines
- Established redirect components for legacy dashboard paths to maintain routing compatibility

### Rich Habits Theme Implementation (June 17, 2025)
- Updated global CSS with blackout glassmorphism foundation
- Refactored login page and authentication forms with luxury branding
- Enhanced admin dashboard with command center aesthetics
- Applied glassmorphism to sidebar navigation and header components
- Updated core UI components (Button, Card, Input) with theme variants
- Implemented neon accent colors (#00d1ff blue, #00ff9f green)
- Added Poppins and Inter font integration for luxury typography
- Created glass panel effects with white gleam animations