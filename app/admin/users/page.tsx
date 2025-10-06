import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { getAllUsers, AdminUser } from '@/app/admin/users/actions';
import UserManagementTable from '@/components/admin/UserManagementTable';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function AdminUsersPage() {
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

  let users: AdminUser[] = [];
  let error: string | null = null;

  try {
    users = await getAllUsers();
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    error = errorMessage;
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">User Management</h1>
          <p className="text-gray-400">
            Manage all user accounts and their permissions
          </p>
        </div>
        <div className="flex gap-4">
          <Button asChild variant="outline">
            <Link href="/admin">
              ← Back to Admin
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/users/create">
              Create User
            </Link>
          </Button>
        </div>
      </div>

      {error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          Error loading users: {error}
        </div>
      ) : (
        <UserManagementTable users={users} />
      )}
    </div>
  );
} 