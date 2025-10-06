'use client';

import Link from 'next/link';
import { SignOut } from '@/utils/auth-helpers/server';
import { handleRequest } from '@/utils/auth-helpers/client';
import Logo from '@/components/icons/Logo';
import { usePathname, useRouter } from 'next/navigation';
import { getRedirectMethod } from '@/utils/auth-helpers/settings';
import DarkModeToggle from '@/components/ui/DarkModeToggle';
import { Button } from '@/components/ui/button';
import s from './Navbar.module.css';
import { cn } from '@/utils/cn';

type NavlinksProps = {
  user?: {
    id: string;
    email?: string;
  } | null;
  isAdmin?: boolean;
}

export default function Navlinks({ user, isAdmin }: NavlinksProps) {
  const router = getRedirectMethod() === 'client' ? useRouter() : null;
  const pathname = usePathname();

  return (
    <div className="relative flex flex-row justify-between py-4 align-center md:py-6">
      <div className="flex items-center flex-1">
        <Link href="/" className={s.logo} aria-label="Logo">
          <Logo />
        </Link>
        <nav className="ml-6 space-x-1 lg:block">
          <Link 
            href="/" 
            className={cn(s.link, pathname === '/' && s.linkActive)}
          >
            Home
          </Link>
          <Link 
            href="/meal-mate" 
            className={cn(s.link, pathname === '/meal-mate' && s.linkActive)}
          >
            🍽️ Meal Mate
          </Link>
          <Link 
            href="/design-system" 
            className={cn(s.link, pathname === '/design-system' && s.linkActive)}
          >
            Design System
          </Link>
          {user && isAdmin && (
            <Link 
              href="/admin" 
              className={cn(s.link, pathname.startsWith('/admin') && s.linkActive)}
            >
              Admin Panel
            </Link>
          )}
        </nav>
      </div>
      <div className="flex items-center justify-end space-x-3">
        <DarkModeToggle />
        {user ? (
          <form onSubmit={(e) => handleRequest(e, SignOut, router)}>
            <input type="hidden" name="pathName" value={pathname} />
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        ) : (
          <div className="flex items-center space-x-2">
            <Link href="/auth/login">
              <Button variant="outline" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button variant="secondary" size="sm">
                Get Started
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
