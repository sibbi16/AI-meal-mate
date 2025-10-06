export type UserRole = 'admin' | 'user' | null;

export interface RouteConfig {
  path: string;
  label: string;
  icon: string;
  requiredRole?: UserRole;
  requiresAuth?: boolean;
  children?: RouteConfig[];
}

export const navigationRoutes: RouteConfig[] = [
  {
    path: '/',
    label: 'Home',
    icon: 'Home',
    requiresAuth: false
  },
  {
    path: '/design-system',
    label: 'Design System',
    icon: 'Palette',
    requiresAuth: false
  },
  {
    path: '/admin',
    label: 'Admin Panel',
    icon: 'Settings',
    requiredRole: 'admin',
    requiresAuth: true,
    children: [
      {
        path: '/admin/users',
        label: 'User Management',
        icon: 'Users',
        requiredRole: 'admin',
        requiresAuth: true
      },
      {
        path: '/admin/organisations',
        label: 'Organizations',
        icon: 'Building2',
        requiredRole: 'admin',
        requiresAuth: true
      },
      {
        path: '/admin/system',
        label: 'System',
        icon: 'Cog',
        requiredRole: 'admin',
        requiresAuth: true
      }
    ]
  }
];

export function getAccessibleRoutes(
  routes: RouteConfig[],
  user: { id: string; email?: string } | null,
  userRole: UserRole
): RouteConfig[] {
  return routes.filter(route => {
    // If route requires authentication and user is not logged in
    if (route.requiresAuth && !user) {
      return false;
    }

    // If route requires a specific role and user doesn't have it
    if (route.requiredRole && route.requiredRole !== userRole) {
      return false;
    }

    return true;
  }).map(route => ({
    ...route,
    children: route.children 
      ? getAccessibleRoutes(route.children, user, userRole)
      : undefined
  }));
}
