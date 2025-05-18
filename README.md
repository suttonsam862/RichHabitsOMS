# ThreadCraft - Custom Clothing Order Management System

A full-stack web application for managing custom clothing orders from intake to delivery, with integrated design processes, production tracking, and payment processing.

![ThreadCraft](./generated-icon.png)

## Features

- **Role-based Authentication**: Secure access for different user roles (Admin, Salesperson, Designer, Manufacturer, Customer)
- **Order Management**: Complete lifecycle tracking from draft to delivery
- **Design Workflow**: Design task management with file uploads and approval process
- **Production Tracking**: Manufacturing task assignment and status updates
- **Payment Processing**: Secure payment handling with Stripe integration
- **Messaging System**: In-app communication between users
- **Admin Dashboard**: Comprehensive oversight of all system activities
- **Mobile Responsive**: Optimized UI for all device sizes

## Technology Stack

- **Frontend**: React.js with TypeScript
- **UI Framework**: Tailwind CSS with shadcn/ui components
- **Backend**: Node.js with Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with local strategy
- **File Storage**: Local file system (configurable for cloud storage)
- **Payment Processing**: Stripe API integration
- **Real-time Communication**: WebSockets

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Stripe account (for payment processing)
- (Optional) QuickBooks account (for accounting integration)

## Environment Variables

The application requires the following environment variables:

```
# Database Configuration
DATABASE_URL=postgresql://username:password@hostname:port/database

# Authentication
SESSION_SECRET=your_session_secret

# Stripe Configuration
STRIPE_SECRET_KEY=your_stripe_secret_key
VITE_STRIPE_PUBLIC_KEY=your_stripe_publishable_key

# Optional: QuickBooks Integration
QBO_CLIENT_ID=your_quickbooks_client_id
QBO_CLIENT_SECRET=your_quickbooks_client_secret
QBO_REALM_ID=your_quickbooks_realm_id
QBO_REFRESH_TOKEN=your_quickbooks_refresh_token
QBO_ACCESS_TOKEN=your_quickbooks_access_token

# Email Configuration (if using email notifications)
EMAIL_SERVICE=your_email_service
EMAIL_USER=your_email_user
EMAIL_PASSWORD=your_email_password
```

## Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up environment variables (see above)
4. Push the database schema:
   ```
   npm run db:push
   ```
5. Start the development server:
   ```
   npm run dev
   ```

## Deployment

The application can be deployed to any Node.js-compatible hosting service. Here are the recommended steps:

1. Set up all required environment variables on your hosting platform
2. Build the project:
   ```
   npm run build
   ```
3. Start the production server:
   ```
   npm start
   ```

### Deployment on Replit

This project is optimized for deployment on Replit:

1. Simply click the "Deploy" button in the Replit interface
2. Ensure all environment variables are properly configured
3. The application will be automatically built and deployed

## User Roles and Access

- **Admin**: Full access to all features and functionality
- **Salesperson**: Create orders, manage customer relationships
- **Designer**: Manage design tasks and upload design files
- **Manufacturer**: Manage production tasks and update order status
- **Customer**: View own orders, approve designs, make payments

## API Documentation

API endpoints are documented with OpenAPI specification (Swagger) and can be accessed at `/api-docs` when running in development mode.

## Testing

Run the test suite with:
```
npm test
```

## License

This project is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.

## Support

For support inquiries, please contact support@threadcraft.com