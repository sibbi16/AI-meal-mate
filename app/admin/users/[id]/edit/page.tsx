import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { getAllUsers, getAllOrganisations, AdminUser } from '@/app/admin/users/actions';
import { getOrganisationSettings } from '@/utils/auth-helpers/settings';
import UserForm from '@/components/admin/UserForm';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Tables } from '@/utils/supabase/types';

interface EditUserPageProps {
  params: {
    id: string;
  };
}

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
  let organisations: Tables<'organisations'>[] = [];
  let error: string | null = null;

  try {
    users = await getAllUsers();
    const { allowOrganisations } = getOrganisationSettings();
    if (allowOrganisations) {
      organisations = await getAllOrganisations();
    }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    error = errorMessage;
  }

  const currentUser = users.find(u => u.id === id);

  if (!currentUser) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">User Not Found</h1>
          <p className="text-muted-foreground mb-6">The user you're looking for doesn't exist.</p>
          <Button asChild>
            <Link href="/admin/users">
              Back to Users
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Edit User</h1>
          <p className="text-gray-400">
            Update user information
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/users">
            ← Back to Users
          </Link>
        </Button>
      </div>

      {error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          Error loading user: {error}
        </div>
      ) : (
        <div className="bg-zinc-800 p-6 rounded-lg">
          <UserForm 
            organisations={organisations} 
            user={currentUser}
            mode="edit" 
          />
        </div>
      )}
    </div>
  );
} 