# Test Suite Documentation

This test suite provides comprehensive end-to-end testing for the authentication system using Playwright.

## Test Coverage

### Authentication Flows (`auth-flows.spec.ts`)
- Complete sign-in and sign-out flow
- Authentication persistence across navigation
- Invalid sign-in attempts handling
- Password reset request flow
- Redirect behavior after authentication
- Session expiration handling
- Browser refresh during authenticated sessions
- Rapid navigation during auth flows

### Core Authentication (`auth.spec.ts`)
- Navigation to sign-in page
- Error handling with invalid credentials
- Successful sign-in redirect behavior
- Navigation to sign-up page
- Password reset form display
- Sign-up form validation
- Complete sign-up flow
- Authentication state persistence

### User Roles (`auth-roles.spec.ts`)
- Regular user restrictions (no admin features)
- Admin user privileges
- Admin route access control
- Role change reflection

### Supabase Features (`auth-supabase.spec.ts`)
- Email verification flow
- Password reset flow
- Session refresh handling
- Sign-up with password validation
- Authentication state persistence
- Invalid login attempt handling

### Navigation (`navbar-auth.spec.ts`)
- Navigation state for unauthenticated users
- Navigation state for authenticated users
- Navbar updates after sign-in/sign-out
- Navigation persistence across pages
- Auth page navigation flow

## Test Setup

### Prerequisites

1. **Install Playwright browsers:**
   ```bash
   npx playwright install
   ```

2. **Start the development server:**
   ```bash
   bun run dev
   ```
   The server should be running on `http://localhost:3000`

3. **Set up test data:**
   You need to create test users in your Supabase instance:
   - Regular user: `test@example.com` with password `Password123!`
   - Admin user: `admin@example.com` with password `AdminPass123!`
   - Additional user: `user@example.com` with password `UserPass123!`

### Environment Setup

1. **Supabase Configuration:**
   - Ensure your Supabase project is configured with the correct auth settings
   - Verify email verification is set up (for sign-up tests)
   - Configure password reset functionality
   - Set up proper redirect URLs in Supabase dashboard

2. **Local Environment:**
   - Ensure your `.env.local` file has correct Supabase credentials
   - The app should be able to connect to your Supabase instance

## Running Tests

### Run all tests:
```bash
bun run test
```

### Run specific test file:
```bash
npx playwright test tests/auth.spec.ts
```

### Run tests in headed mode (see browser):
```bash
npx playwright test --headed
```

### Run tests in specific browser:
```bash
npx playwright test --project=chromium
```

### Debug mode:
```bash
npx playwright test --debug
```

## Test Configuration

The tests are configured to:
- Run on Chromium, Firefox, and WebKit
- Take screenshots on failure
- Generate traces for debugging
- Use `http://localhost:3000` as the base URL

## Test Data Requirements

### User Accounts
The tests expect these user accounts to exist in your Supabase auth system:

1. **Regular Test User**
   - Email: `test@example.com`
   - Password: `Password123!`
   - Role: Regular user (no admin privileges)

2. **Admin Test User**
   - Email: `admin@example.com`
   - Password: `AdminPass123!`
   - Role: Admin user (with admin privileges)

3. **Additional Test User**
   - Email: `user@example.com`
   - Password: `UserPass123!`
   - Role: Regular user

### Creating Test Users

You can create these users through:
1. Your app's sign-up flow
2. Supabase dashboard
3. SQL insert statements in your database

### Admin User Setup

For admin users, you may need to:
1. Set appropriate roles in your user metadata
2. Configure your app's admin role checking logic
3. Ensure admin routes are properly protected

## Troubleshooting

### Common Issues

1. **"Executable doesn't exist" error:**
   - Run `npx playwright install` to install browser binaries

2. **"localhost:3000 not responding" error:**
   - Ensure your development server is running with `bun run dev`

3. **Authentication failures:**
   - Verify test users exist in your Supabase project
   - Check that passwords match the test data
   - Ensure Supabase configuration is correct

4. **Test timeouts:**
   - Check if your app is loading slowly
   - Verify network connections to Supabase
   - Consider increasing timeout values if needed

### Debug Tips

1. **Use headed mode** to see what's happening:
   ```bash
   npx playwright test --headed --project=chromium
   ```

2. **Use debug mode** to step through tests:
   ```bash
   npx playwright test --debug tests/auth.spec.ts
   ```

3. **Check screenshots** in `test-results/` directory after failed tests

4. **Use traces** to see detailed execution flow

## Extending Tests

To add new tests:

1. **Follow the existing patterns** in the test files
2. **Use the helper functions** in `auth-utils.ts`
3. **Add appropriate test data** if needed
4. **Update this README** with any new requirements

### Helper Functions Available

- `signIn(page, email?, password?)` - Sign in a user
- `signOut(page)` - Sign out current user
- `verifyAuthenticated(page)` - Verify user is authenticated
- `verifyNotAuthenticated(page)` - Verify user is not authenticated
- `createTestUser()` - Generate unique test user data
- `requestPasswordReset(page, email?)` - Request password reset

## Continuous Integration

For CI/CD pipelines:

1. **Install dependencies:**
   ```bash
   bun install
   npx playwright install --with-deps
   ```

2. **Set up test database/environment**

3. **Run tests:**
   ```bash
   bun run test
   ```

4. **Collect artifacts** (screenshots, traces, reports)

The test configuration is already set up for CI with appropriate retry and parallelization settings. 