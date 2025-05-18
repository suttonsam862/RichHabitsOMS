# ThreadCraft Deployment Checklist

This checklist ensures that the ThreadCraft application is properly prepared for production deployment.

## Environment Configuration

- [ ] `DATABASE_URL` environment variable is set with proper PostgreSQL connection string
- [ ] `STRIPE_SECRET_KEY` is configured with production Stripe key
- [ ] `VITE_STRIPE_PUBLIC_KEY` is configured with production Stripe publishable key
- [ ] `SESSION_SECRET` is set with a strong, random string
- [ ] (Optional) Email notification settings are configured if enabled

## Database

- [ ] Database schema is up-to-date (`npm run db:push`)
- [ ] Database indexes are created for frequently queried fields
- [ ] Database connection pool is properly configured

## Security

- [ ] Authentication is properly enforced for all protected routes
- [ ] Role-based access control is verified for all user types
- [ ] CSRF protection is implemented for form submissions
- [ ] File upload validation is properly enforced
- [ ] Rate limiting is in place for authentication and API endpoints

## Frontend Assets

- [ ] Frontend is built for production (`npm run build`)
- [ ] Assets are properly minified and optimized
- [ ] Images and other static assets are compressed
- [ ] Unused code and dependencies are removed

## Testing

- [ ] Unit tests are passing (`npm test`)
- [ ] Integration tests are passing
- [ ] Authentication flow is tested
- [ ] Order creation and management flow is tested
- [ ] Payment processing is tested
- [ ] File uploads are tested

## Performance

- [ ] API responses are optimized
- [ ] Database queries are efficient
- [ ] Frontend bundle size is optimized
- [ ] Image assets are optimized and properly sized

## Third-Party Services

- [ ] Stripe integration is tested with both successful and failed payments
- [ ] (Optional) QuickBooks integration is verified
- [ ] (Optional) Email notifications are tested

## Documentation

- [ ] API endpoints are documented
- [ ] Environment variable requirements are documented
- [ ] Deployment process is documented
- [ ] User roles and permissions are documented

## Post-Deployment

- [ ] Verify application loads correctly
- [ ] Check authentication flow
- [ ] Verify database connections
- [ ] Test payment processing in production
- [ ] Monitor application logs for errors
- [ ] Verify file uploads are working
- [ ] Test role-based access restrictions