# Supabase Migration Guide

This guide walks you through the process of migrating the Custom Clothing Order Management application to use Supabase as the database provider.

## Step 1: Create a Supabase Project

1. Go to the [Supabase dashboard](https://supabase.com/dashboard/projects)
2. Sign up or log in to your Supabase account
3. Click "New Project"
4. Enter a name for your project (e.g., "custom-clothing-app")
5. Set a secure database password (save this for later use)
6. Choose a region close to your users
7. Click "Create new project"
8. Wait for the project to be created (typically 1-2 minutes)

## Step 2: Get Your Database Connection String

1. In your Supabase project dashboard, click on "Settings" in the left sidebar
2. Navigate to "Database"
3. Scroll down to the "Connection string" section
4. Select "Transaction pooler" from the dropdown menu
5. Copy the connection string that appears
6. Replace `[YOUR-PASSWORD]` in the connection string with the database password you created earlier

Example connection string:
```
postgresql://postgres:[YOUR-PASSWORD]@db.abcdefghijklm.supabase.co:5432/postgres
```

## Step 3: Set Up Your Environment Variables

1. Create a `.env` file in the root of your project based on the `.env.example` template
2. Add your Supabase connection string as the `DATABASE_URL` value
3. Set `NODE_ENV` to `development` for local development or `production` for production deployment
4. Add any other required environment variables (Stripe keys, etc.)

Example `.env` file:
```
DATABASE_URL=postgresql://postgres:your_password_here@db.abcdefghijklm.supabase.co:5432/postgres
NODE_ENV=development
SESSION_SECRET=your_strong_random_secret_here
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
VITE_STRIPE_PUBLIC_KEY=pk_test_your_stripe_publishable_key
```

## Step 4: Initialize Your Supabase Database Schema

1. In your Supabase dashboard, go to the "SQL Editor" section
2. Create a new query
3. Copy and paste the contents of `supabase-migration.sql` into the SQL editor
4. Run the query to create all tables, relationships, and the admin user
5. Verify that all tables were created correctly by checking the "Table Editor" section

## Step 5: Update Your Application Code

The application code has already been updated to work with Supabase. The key changes include:

1. Updated `server/db.ts` to use the standard PostgreSQL client instead of Neon
2. Added SSL support for production environments
3. Modified connection configuration to work with Supabase

## Step 6: Test Your Connection

1. Start your application with `npm run dev`
2. Try logging in with the admin credentials:
   - Username: `samsutton`
   - Password: `Arlodog2013!`
3. Verify that you can access the data and perform CRUD operations

## Troubleshooting

If you encounter any issues:

1. **Connection Errors**: Ensure your `DATABASE_URL` is correct and includes the proper password
2. **SSL Errors**: Make sure SSL is properly configured in the connection (required for production environments)
3. **Permission Errors**: Check that your database user has the necessary permissions
4. **Query Errors**: Verify your table structure matches the expected schema

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)