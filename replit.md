# ThreadCraft - Custom Clothing Order Management System

## Overview
ThreadCraft is a comprehensive full-stack web application designed for managing custom clothing orders. It streamlines the entire process from client intake and design coordination to production tracking and final delivery. The system features role-based access control, integrated payment processing, and aims to provide an efficient solution for custom clothing businesses.

## User Preferences
Preferred communication style: Simple, everyday language.
Design theme: Rich Habits blackout glassmorphism with neon blue/green accents, sharp edges, luxury branding.

## System Architecture

### UI/UX Decisions
- **Design Theme**: Rich Habits blackout glassmorphism with neon blue/green accents, sharp edges, and luxury branding.
- **Components**: Utilizes Tailwind CSS with shadcn/ui for UI components.
- **Loading States**: Comprehensive skeleton components and global full-screen loading indicators for enhanced user experience.
- **Real-time Feedback**: Optimistic updates and real-time field validation (onBlur) with visual feedback.
- **Undo System**: 5-second undo prompt system for soft delete operations.

### Technical Implementations
- **Frontend**: React.js with TypeScript, Vite for build. State managed with TanStack React Query.
- **Backend**: Node.js with Express.js, written in TypeScript with ES modules.
- **Database ORM**: Drizzle ORM for type-safe PostgreSQL interactions.
- **Authentication**: Supabase Auth integrated with custom middleware and session management. Multi-role system (Admin, Salesperson, Designer, Manufacturer, Customer) with Row Level Security.
- **File Handling**: Local file system with configurable cloud storage support (Supabase Storage). Comprehensive image management with drag-and-drop galleries, metadata tagging, and optimization (Sharp library). Entity-based folder structure for organization.
- **Payment Processing**: Stripe integration for secure payment handling.
- **Order Management**: Comprehensive order lifecycle (Draft → Design → Production → Completion) with detailed tracking, nested item management, and transaction support.
- **Design Workflow**: Task assignment, file management, approval process, and status tracking for designs.
- **Production Management**: Manufacturing task assignments, progress tracking, and quality control.
- **Form Management**: Comprehensive validation system with double-submission prevention, automatic form reset, navigation blocking during submission, and post-creation redirects.
- **Performance**: Intelligent route preloading, optimized query performance with default LIMITs, and global data synchronization using React Query cache invalidation.
- **Error Handling**: Centralized error logging middleware, enhanced frontend error handling, and comprehensive validation library.
- **Timestamp Management**: Database-side timestamp generation for consistency and accuracy.
- **Shared Utilities**: Comprehensive shared type system and environment variable validation.

### Feature Specifications
- **Authentication & Authorization**: Multi-role access, Supabase integration, RLS, session management.
- **Order Management**: Status workflow, tracking, customer profiles, detailed order items.
- **Design Workflow**: Task assignment, file management, approval processes, status tracking.
- **Production Management**: Manufacturing task tracking, resource allocation, quality control.
- **Payment Processing**: Stripe integration, customer ID tracking, payment status.
- **Catalog Management**: Multi-image support, size/color variants, dynamic categories/sports, SKU generation.
- **User Management**: Comprehensive user profiles and role management.
- **Customer Management**: Detailed customer profiles, photo upload, and associated data.
- **Image Asset Traceability**: Comprehensive metadata tracking for all uploaded images.

### System Design Choices
- **Architectural Patterns**: Microservices-oriented design with clear separation of frontend and backend concerns.
- **Data Flow**: Defined flows for user authentication and order processing.
- **Security**: Comprehensive API security audit with authentication guards, RLS policies, and token validation.
- **Scalability**: Designed for scalability with PostgreSQL-backed sessions and optimized database queries.
- **Maintainability**: Emphasis on clean code, type safety (TypeScript), and consistent API response formats.

## External Dependencies

### Third-Party Services
- **Supabase**: Authentication, database hosting (PostgreSQL), and real-time features.
- **Stripe**: Payment processing.
- **SendGrid**: Email notification service (optional).
- **QuickBooks**: Accounting integration (optional).

### Core Dependencies
- `@supabase/supabase-js`
- `@stripe/stripe-js`
- `drizzle-orm`
- `express-session`
- `bcrypt`
- `multer`
- `@dnd-kit`
- `sharp`