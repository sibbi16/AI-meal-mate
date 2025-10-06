'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Menu, 
  ChevronDown, 
  ChevronRight, 
  PanelLeftClose, 
  PanelLeftOpen,
  Home,
  Palette,
  Settings,
  Users,
  Building2,
  Cog,
  LogOut,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import Logo from '@/components/icons/Logo';
import DarkModeToggle from '@/components/ui/DarkModeToggle';
import { cn } from '@/utils/cn';
import { SignOut } from '@/utils/auth-helpers/server';
import { handleRequest } from '@/utils/auth-helpers/client';
import { getRedirectMethod } from '@/utils/auth-helpers/settings';
import { useRouter } from 'next/navigation';
import { useIsMobile } from '@/hooks/use-mobile';
import { RouteConfig, getAccessibleRoutes, navigationRoutes, UserRole } from '@/utils/route-protection';

interface SideNavigationProps {
  user: {
    id: string;
    email?: string;
  } | null;
  isAdmin?: boolean;
}

// Icon mapping
const iconMap = {
  Home,
  Palette,
  Settings,
  Users,
  Building2,
  Cog,
  User,
  LogOut
};

interface NavItemProps {
  route: RouteConfig;
  pathname: string;
  onNavigate?: () => void;
  level?: number;
  isCollapsed?: boolean;
}

function NavItem({ route, pathname, onNavigate, level = 0, isCollapsed = false }: NavItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isActive = pathname === route.path;
  const isParentActive = pathname.startsWith(route.path) && route.path !== '/';
  const hasChildren = route.children && route.children.length > 0;
  const IconComponent = iconMap[route.icon as keyof typeof iconMap];

  // Auto-expand if on parent route or child route
  useEffect(() => {
    if (isParentActive && hasChildren) {
      setIsExpanded(true);
    }
  }, [isParentActive, hasChildren]);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
  };

  const navItem = (
    <div className={cn("relative", level > 0 && "ml-4")}>
      <div className="flex items-center group">
        <Link
          href={route.path}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground",
            "flex-1 min-w-0",
            isActive && "bg-primary text-primary-foreground hover:bg-primary/90",
            isParentActive && !isActive && "bg-muted text-muted-foreground",
            isCollapsed && level === 0 && "justify-center px-2"
          )}
          onClick={onNavigate}
        >
          {IconComponent && (
            <IconComponent className={cn(
              "h-4 w-4 shrink-0",
              isActive && "text-primary-foreground"
            )} />
          )}
          {(!isCollapsed || level > 0) && (
            <>
              <span className="truncate">{route.label}</span>
              {isParentActive && !isActive && level === 0 && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  Active
                </Badge>
              )}
            </>
          )}
        </Link>
        {hasChildren && (!isCollapsed || level > 0) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggle}
            className={cn(
              "h-8 w-8 p-0 shrink-0",
              "opacity-0 group-hover:opacity-100 transition-opacity",
              (isExpanded || isParentActive) && "opacity-100"
            )}
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </Button>
        )}
      </div>
      
      {hasChildren && isExpanded && (!isCollapsed || level > 0) && (
        <div className="mt-1 space-y-1 border-l border-border ml-2 pl-2">
          {route.children!.map((child) => (
            <NavItem
              key={child.path}
              route={child}
              pathname={pathname}
              onNavigate={onNavigate}
              level={level + 1}
              isCollapsed={isCollapsed}
            />
          ))}
        </div>
      )}
    </div>
  );

  // Wrap top-level items in tooltip when collapsed
  if (isCollapsed && level === 0) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {navItem}
        </TooltipTrigger>
        <TooltipContent side="right" className="font-medium">
          {route.label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return navItem;
}

interface SideNavContentProps {
  user: {
    id: string;
    email?: string;
  } | null;
  isAdmin?: boolean;
  onNavigate?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

function SideNavContent({ user, isAdmin, onNavigate, isCollapsed = false, onToggleCollapse }: SideNavContentProps) {
  const pathname = usePathname();
  const router = getRedirectMethod() === 'client' ? useRouter() : null;
  
  const userRole: UserRole = isAdmin ? 'admin' : user ? 'user' : null;
  const accessibleRoutes = getAccessibleRoutes(navigationRoutes, user, userRole);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className={cn(
        "flex items-center border-b border-border p-4",
        isCollapsed ? "justify-center flex-col space-y-2" : "justify-between"
      )}>
        <Link href="/" className="flex items-center space-x-2" onClick={onNavigate}>
          <Logo />
        </Link>
        
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <DarkModeToggle />
            {onToggleCollapse && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleCollapse}
                className="h-8 w-8 p-0"
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
        
        {isCollapsed && onToggleCollapse && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="h-8 w-8 p-0"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-2">
          {accessibleRoutes.map((route) => (
            <NavItem
              key={route.path}
              route={route}
              pathname={pathname}
              onNavigate={onNavigate}
              isCollapsed={isCollapsed}
            />
          ))}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-border p-4">
        {user ? (
          <div className={cn("space-y-3", isCollapsed && "space-y-2")}>
            {!isCollapsed && (
              <>
                <div className="flex items-center space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {user.email?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.email}</p>
                    {isAdmin && (
                      <Badge variant="secondary" className="text-xs">
                        Admin
                      </Badge>
                    )}
                  </div>
                </div>
                <Separator />
              </>
            )}
            
            <form
              onSubmit={(e) => {
                handleRequest(e, SignOut, router);
                onNavigate?.();
              }}
              className="w-full"
            >
              <input type="hidden" name="pathName" value={pathname} />
              {isCollapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button type="submit" variant="ghost" size="sm" className="w-full h-8 px-2">
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    Sign out
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Button type="submit" variant="ghost" size="sm" className="w-full justify-start">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </Button>
              )}
            </form>
          </div>
        ) : (
          <div className={cn("space-y-2", isCollapsed && "space-y-1")}>
            {isCollapsed ? (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link href="/auth/login" onClick={onNavigate}>
                      <Button variant="ghost" size="sm" className="w-full h-8 px-2">
                        <User className="h-4 w-4" />
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    Sign In
                  </TooltipContent>
                </Tooltip>
              </>
            ) : (
              <>
                <Link href="/auth/login" onClick={onNavigate}>
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    <User className="h-4 w-4 mr-2" />
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/sign-up" onClick={onNavigate}>
                  <Button size="sm" className="w-full">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SideNavigation({ user, isAdmin }: SideNavigationProps) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleNavigate = () => {
    setIsOpen(false);
  };

  const handleToggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  if (isMobile) {
    return (
      <TooltipProvider>
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 items-center justify-between px-4">
            <Link href="/" className="flex items-center space-x-2">
              <Logo />
            </Link>
            <div className="flex items-center space-x-2">
              <DarkModeToggle />
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle navigation</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80 p-0">
                  <SideNavContent 
                    user={user} 
                    isAdmin={isAdmin} 
                    onNavigate={handleNavigate}
                  />
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </header>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <aside className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r bg-background transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}>
        <SideNavContent 
          user={user} 
          isAdmin={isAdmin} 
          isCollapsed={isCollapsed}
          onToggleCollapse={handleToggleCollapse}
        />
      </aside>
    </TooltipProvider>
  );
}
