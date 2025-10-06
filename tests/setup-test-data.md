# Test Data Setup Guide

This guide explains how to set up the test data required for the authentication tests.

## Required Test Users

The test suite requires these specific user accounts to be created in your Supabase project:

### 1. Regular Test User
- **Email:** `test@example.com`
- **Password:** `Password123!`
- **Role:** Regular user (default)
- **Used for:** Basic authentication tests

### 2. Admin Test User
- **Email:** `admin@example.com`
- **Password:** `AdminPass123!`
- **Role:** Admin user
- **Used for:** Admin role testing

### 3. Additional Test User
- **Email:** `user@example.com`
- **Password:** `UserPass123!`
- **Role:** Regular user (default)
- **Used for:** Role comparison tests

## Setup Methods

### Option 1: Using Your App's Sign-Up Flow

1. **Start your development server:**
   ```bash
   bun run dev
   ```

2. **Navigate to the sign-up page:** `http://localhost:3000/auth/sign-up`

3. **Create each test user:**
   - Sign up with each email/password combination
   - Complete email verification if required
   - Sign out after each creation

### Option 2: Using Supabase Dashboard

1. **Go to your Supabase dashboard**
2. **Navigate to Authentication > Users**
3. **Click "Add User"**
4. **For each test user:**
   - Enter the email address
   - Set the password
   - Confirm the user if needed
   - Set metadata for admin users (see Admin Setup below)

### Option 3: Using SQL Commands

If you have access to your Supabase SQL editor, you can create users directly:

```sql
-- Note: This is a simplified example. In practice, you should use Supabase Auth API
-- or the dashboard for proper user creation with correct authentication setup.

-- Create regular test user
-- (Use Supabase dashboard or Auth API instead)

-- Create admin test user
-- (Use Supabase dashboard or Auth API instead)

-- Create additional test user
-- (Use Supabase dashboard or Auth API instead)
```

**Important:** It's recommended to use the Supabase dashboard or Auth API rather than direct SQL manipulation for user creation.

## Admin User Setup

For the admin user (`admin@example.com`), you need to configure admin privileges:

### Method 1: User Metadata

1. **In Supabase Dashboard:**
   - Go to Authentication > Users
   - Find the `admin@example.com` user
   - Click on the user to edit
   - In the "User Metadata" section, add:
     ```json
     {
       "role": "admin"
     }
     ```

### Method 2: Custom Claims

If your app uses custom claims for roles:

1. **Update the user's app_metadata:**
   ```json
   {
     "role": "admin",
     "permissions": ["admin:read", "admin:write"]
   }
   ```

### Method 3: Database Roles

If you have a separate roles table:

1. **Create a roles table** (if not exists):
   ```sql
   CREATE TABLE user_roles (
     id UUID REFERENCES auth.users ON DELETE CASCADE,
     role TEXT NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

2. **Insert admin role:**
   ```sql
   INSERT INTO user_roles (id, role)
   VALUES (
     (SELECT id FROM auth.users WHERE email = 'admin@example.com'),
     'admin'
   );
   ```

## Verification

After creating the test users, verify they work:

### 1. Test Regular User Login
```bash
# Navigate to your app
http://localhost:3000/auth/login

# Login with: test@example.com / Password123!
# Should redirect to home page
```

### 2. Test Admin User Login
```bash
# Login with: admin@example.com / AdminPass123!
# Should redirect to home page
# Should show admin features (if implemented)
```

### 3. Test Password Reset
```bash
# Navigate to: http://localhost:3000/auth/forgot-password
# Enter: test@example.com
# Should show success message
```

## Environment Configuration

Ensure your environment is properly configured:

### 1. Supabase Configuration

In your Supabase dashboard:

1. **Auth Settings:**
   - Enable email confirmations (if desired)
   - Set up password reset templates
   - Configure redirect URLs

2. **URL Configuration:**
   - Add `http://localhost:3000/auth/callback` to allowed redirect URLs
   - Add `http://localhost:3000` to site URL

### 2. Local Environment

Check your `.env.local` file:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Troubleshooting

### Common Issues

1. **Email Verification Required:**
   - If your Supabase project requires email verification
   - Check email confirmation settings in Supabase dashboard
   - Manually confirm users in the dashboard if needed

2. **Password Policy:**
   - Ensure passwords meet your Supabase password policy
   - Default policy requires 6+ characters
   - May require specific character types

3. **Admin Features Not Working:**
   - Check your app's admin role detection logic
   - Verify metadata/claims are set correctly
   - Ensure admin routes are properly configured

4. **Users Not Appearing:**
   - Check Supabase dashboard for user creation
   - Verify authentication is working in your app
   - Check browser console for errors

### Debugging Steps

1. **Check Supabase Dashboard:**
   ```
   Authentication > Users
   ```
   Verify all test users are created and confirmed

2. **Test Authentication Flow:**
   - Try logging in manually with each test user
   - Check for any error messages
   - Verify redirects work correctly

3. **Check User Metadata:**
   - Click on admin user in dashboard
   - Verify metadata is set correctly
   - Check raw user data if needed

4. **Verify App Configuration:**
   - Ensure your app can connect to Supabase
   - Check that authentication components work
   - Test role-based access control

## Cleanup

After testing, you may want to:

1. **Keep test users** for future test runs
2. **Delete test users** if no longer needed
3. **Reset passwords** if compromised
4. **Update metadata** as needed

To delete test users:
1. Go to Supabase Dashboard > Authentication > Users
2. Find each test user
3. Click the delete button
4. Confirm deletion

## Security Notes

- **Test users should only be used in development/testing environments**
- **Never use test credentials in production**
- **Consider using separate Supabase projects for testing**
- **Regularly rotate test passwords if needed**
- **Remove test users from production databases** 