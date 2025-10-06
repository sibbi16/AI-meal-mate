# Enhanced Side Navigation with Route Protection

This directory contains a modern, feature-rich navigation system built with shadcn/ui components that provides:

1. **Responsive Side Navigation**: Automatically switches between desktop sidebar and mobile header with slide-out menu
2. **Collapsible Sidebar**: Desktop sidebar can be collapsed to icon-only mode with tooltips
3. **Central Route Protection**: Automatically hides navigation links based on user authentication and role
4. **Hierarchical Navigation**: Supports nested routes with expandable/collapsible sections
5. **Visual Indicators**: Clear active states, parent indicators, and admin badges
6. **Modern Design**: Built entirely with shadcn/ui components for consistency

## Components

### `Navbar.tsx`
The main navigation component that handles user authentication and role checking, then renders the `SideNavigation` component.

### `SideNavigation.tsx`
The responsive navigation component with enhanced features:
- **Desktop (≥768px)**: Fixed sidebar with collapse/expand functionality
- **Mobile (<768px)**: Header with hamburger menu and slide-out panel
- **Icons**: Lucide React icons for all navigation items
- **Active States**: Clear visual indication of current page and parent sections
- **Tooltips**: When collapsed, tooltips show full labels
- **User Profile**: Avatar, email display, and admin badge
- **Smooth Animations**: All state changes are animated

### `MainContentWrapper.tsx`
A smart wrapper component that:
- Dynamically adjusts padding based on sidebar width
- Uses ResizeObserver to track sidebar state changes
- Handles both mobile and desktop layouts seamlessly

### Route Protection (`utils/route-protection.ts`)

#### Configuration
Routes are configured in the `navigationRoutes` array with the following properties:

```typescript
interface RouteConfig {
  path: string;           // The route path
  label: string;          // Display label
  icon?: string;          // Optional icon (for future use)
  requiredRole?: UserRole; // 'admin' | 'user' | null
  requiresAuth?: boolean;  // Whether authentication is required
  children?: RouteConfig[]; // Nested routes
}
```

#### Example Configuration
```typescript
{
  path: '/admin',
  label: 'Admin Panel',
  icon: 'Settings',        // Lucide React icon name
  requiredRole: 'admin',
  requiresAuth: true,
  children: [
    {
      path: '/admin/users',
      label: 'User Management',
      icon: 'Users',
      requiredRole: 'admin',
      requiresAuth: true
    }
  ]
}
```

#### Available Icons
- `Home` - Home page
- `Palette` - Design system
- `Settings` - Admin panel
- `Users` - User management
- `Building2` - Organizations
- `Cog` - System settings
- `User` - User profile/auth
- `LogOut` - Sign out action

#### Access Control Rules
- If `requiresAuth: true` and user is not authenticated → route is hidden
- If `requiredRole` is set and user doesn't have that role → route is hidden
- Child routes inherit parent restrictions and are also filtered

## Usage

### In Layout
```tsx
import Navbar from '@/components/ui/Navbar';
import MainContentWrapper from '@/components/ui/Navbar/MainContentWrapper';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Navbar />
        <MainContentWrapper>
          {children}
        </MainContentWrapper>
      </body>
    </html>
  );
}
```

### Adding New Routes
1. Add route configuration to `utils/route-protection.ts`
2. Set appropriate `requiredRole` and `requiresAuth` properties
3. Navigation will automatically show/hide based on user permissions

### Enhanced Features

#### Collapsible Sidebar
- Click the panel toggle button to collapse/expand the sidebar
- When collapsed, shows only icons with tooltips on hover
- Maintains all functionality in collapsed state
- Smooth width transitions with content reflow

#### Visual Indicators
- **Active Route**: Primary color background for current page
- **Parent Active**: Muted background with "Active" badge for parent sections
- **Auto-Expand**: Parent sections automatically expand when navigating to child routes
- **Admin Badge**: Clearly identifies admin users in the user section

#### Mobile Responsiveness
The navigation automatically adapts based on screen size:
- **Desktop (≥768px)**: Fixed sidebar with collapse functionality
- **Mobile (<768px)**: Header with hamburger menu that opens a slide-out panel
- **Seamless Transitions**: Smooth animations between states

## Dependencies

### shadcn/ui Components
- `Button` - Interactive elements and actions
- `Sheet` - Mobile slide-out navigation panel
- `ScrollArea` - Smooth scrolling for navigation content
- `Separator` - Visual dividers
- `Avatar` & `AvatarFallback` - User profile display
- `Tooltip` - Hover information in collapsed mode
- `Badge` - Status indicators (admin, active)

### External Libraries
- `lucide-react` - Icon system
- `@/hooks/use-mobile` - Responsive behavior
- `next/navigation` - Next.js routing

## Migration from Original Navbar
The original horizontal navbar has been completely replaced with this enhanced side navigation system. Key benefits:

1. **Better Space Utilization**: Vertical navigation with collapsible option maximizes screen real estate
2. **Consistent Design**: Built entirely with shadcn/ui components that match your app's design system
3. **Enhanced UX**: Icons, animations, and clear visual hierarchy improve user experience
4. **Responsive Design**: Single component handles all screen sizes with appropriate layouts
5. **Centralized Route Protection**: Automatic permission-based filtering with zero configuration
6. **Accessibility**: Proper ARIA labels, keyboard navigation, and screen reader support
7. **Modern Features**: Collapse/expand, tooltips, active indicators, and smooth animations
8. **Maintainability**: Declarative route configuration makes adding new sections trivial

### Visual Improvements
- **Icons**: Every navigation item has a meaningful Lucide React icon
- **Active States**: Clear indication of current location with primary color highlighting
- **Parent Awareness**: Visual cues when you're in a subsection of a parent route
- **User Context**: Profile display with admin status and easy sign-out access
- **Smooth Animations**: All state changes are animated for polished feel
