import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getOrganisationSettings } from '@/utils/auth-helpers/settings';
import { Users } from 'lucide-react';

export default async function AdminDashboard() {
  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return redirect('/auth/login');
  }

  // Check if user has admin role
  const { data: roleData, error: roleError } = await supabase
    .from('roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (roleError || roleData?.role !== 'admin') {
    return redirect('/');
  }

  const { allowOrganisations } = getOrganisationSettings();

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-gray-400">
          Manage users, organisations, and system settings
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Link 
          href="/admin/users"
          className="dark:bg-zinc-800 p-6 rounded-lg border dark:border-zinc-700 hover:shadow-lg transition-colors"
        >
          <div className="mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-3">
              <Users className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-semibold">User Management</h3>
            <p className="text-gray-400 text-sm">
              Create, edit, and manage user accounts
            </p>
          </div>
        </Link>

        {allowOrganisations && (
          <Link 
            href="/admin/organisations"
            className="dark:bg-zinc-800 p-6 rounded-lg border dark:border-zinc-700 hover:shadow-lg transition-colors"
          >
            <div className="mb-4">
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold">Organisations</h3>
              <p className="text-gray-400 text-sm">
                Manage organisations and memberships
              </p>
            </div>
          </Link>
        )}

        <Link 
          href="/admin/system"
          className="dark:bg-zinc-800 p-6 rounded-lg border dark:border-zinc-700 hover:shadow-lg transition-colors"
        >
          <div className="mb-4">
            <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold">System Settings</h3>
            <p className="text-gray-400 text-sm">
              Configure authentication and features
            </p>
          </div>
        </Link>
      </div>

      <div className="mt-8 dark:dark:bg-zinc-800 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <Button asChild>
            <Link href="/admin/users/create">
              Create User
            </Link>
          </Button>
          {allowOrganisations && (
            <Button asChild variant="secondary">
              <Link href="/admin/organisations/create">
                Create Organisation
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
} 