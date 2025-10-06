# Admin Panel Documentation

## Overview

The admin panel provides comprehensive user and organisation management capabilities for administrators. It includes features for creating, editing, and managing users, as well as organisational management when organisations are enabled.

## Features

### User Management
- **List all users** with filtering and search capabilities
- **Create new users** with optional organisation assignment
- **Edit user details** including email, name, and role
- **Delete users** with confirmation prompts
- **Password management**:
  - Send password reset emails
  - Send magic login links
  - Set new passwords directly
- **Role management** (admin/user)
- **Organisation assignment** (when organisations are enabled)

### Organisation Management
- **List all organisations** with member counts
- **Create new organisations** with admin assignment
- **View organisation details** and member lists
- **Manage organisation memberships**

### System Settings
- **View current authentication settings**
- **View organisation feature toggles**
- **Environment information display**

## Access Requirements

To access the admin panel, a user must:
1. Be signed in to the application
2. Have the `admin` role in the `roles` table

## Navigation

When a user has admin privileges, an "Admin Panel" link appears in the main navigation bar.

## Pages Structure

```
/admin                     - Main admin dashboard
├── /users                 - User management page
│   └── /create           - Create new user form
├── /organisations        - Organisation management (if enabled)
│   └── /create          - Create new organisation form
└── /system              - System settings and configuration
```

## Server Actions

All admin operations are performed via secure server actions located in `utils/admin/actions.ts`. These actions:

- Use the Supabase service role client for elevated permissions
- Include proper authorization checks
- Handle both auth.users and public table operations
- Provide comprehensive error handling

### Key Server Actions

#### User Management
- `getAllUsers()` - Fetch all users with roles and organisations
- `createUser(data)` - Create new user with optional organisation assignment
- `updateUser(userId, data)` - Update user details and role
- `deleteUser(userId)` - Remove user from system
- `sendPasswordReset(userId)` - Send password reset email
- `sendMagicLink(userId)` - Send magic login link
- `resetUserPassword(userId, newPassword)` - Set new password directly

#### Organisation Management
- `getAllOrganisations()` - Fetch all organisations with members
- `createOrganisationForUser(name, slug, adminUserId)` - Create organisation
- `addUserToOrganisation(userId, orgId, role)` - Add user to organisation

## Security Features

### Authorization
- All admin actions verify the user has `admin` role
- Service role client is only used server-side
- Row Level Security (RLS) policies are respected

### Input Validation
- Email format validation
- Required field validation
- Organisation slug format validation
- Password strength requirements

### Error Handling
- Comprehensive error messages
- Graceful degradation on failures
- User-friendly error displays

## Configuration

### Authentication Settings
Located in `utils/auth-helpers/settings.ts`:

```typescript
// Organisation feature toggles
const allowOrganisations = true;
const allowUserCreateOrganisations = true;
const allowOrganisationInvites = true;
const allowOrganisationRoleManagement = true;
const requireOrganisationForSignup = false;
```

### Environment Variables
Required environment variables:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for admin operations
- `NEXT_PUBLIC_SITE_URL` - Site URL for email redirects

## Database Schema Requirements

The admin panel requires the following database tables:

### Users Table
```sql
-- Standard Supabase auth.users table
-- Plus public users table for profiles
```

### Roles Table
```sql
CREATE TABLE roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('admin', 'user')) DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Organisations Tables (if organisations enabled)
```sql
CREATE TABLE organisations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE organisation_memberships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organisation_id, user_id)
);
```

## Usage Examples

### Creating an Admin User

1. First, create a user through normal signup
2. Manually add an admin role in the database:
```sql
INSERT INTO roles (user_id, role) 
VALUES ('user-uuid-here', 'admin');
```

### Creating Users via Admin Panel

1. Navigate to `/admin/users`
2. Click "Create User"
3. Fill in user details
4. Optionally assign to organisation
5. Submit form

### Managing Organisations

1. Navigate to `/admin/organisations`
2. View existing organisations and their members
3. Create new organisations as needed
4. Manage memberships through organisation details

## Troubleshooting

### Common Issues

**Admin panel not visible**: Ensure user has `admin` role in roles table

**Permission errors**: Verify `SUPABASE_SERVICE_ROLE_KEY` is correctly set

**Organisation features missing**: Check `allowOrganisations` setting

**Email functions not working**: Verify `NEXT_PUBLIC_SITE_URL` is configured

### Debug Tips

1. Check browser console for client-side errors
2. Verify server logs for server action errors
3. Confirm database permissions and RLS policies
4. Test with minimal admin user setup

## Security Considerations

1. **Service Role Key**: Never expose the service role key to client-side code
2. **Admin Role**: Carefully control who gets admin role access
3. **Input Sanitization**: All user inputs are validated and sanitized
4. **Error Logging**: Sensitive errors are logged server-side only
5. **Rate Limiting**: Consider implementing rate limiting for admin actions

## Extending the Admin Panel

To add new admin features:

1. Add server actions to `utils/admin/actions.ts`
2. Create UI components in `components/admin/`
3. Add new pages under `app/admin/`
4. Update navigation in main dashboard
5. Follow existing patterns for authorization and error handling 