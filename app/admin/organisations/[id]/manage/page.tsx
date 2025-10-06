import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { getOrganisationSettings } from '@/utils/auth-helpers/settings';
import { getOrganisationById, getAllUsers, type AdminUser } from '@/app/admin/users/actions';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ManageMembersForm } from '@/components/admin/ManageMembersForm';
import { MemberList } from '@/components/admin/MemberList';
import type { AdminOrganisation } from '@/app/admin/users/actions';

interface ManageMembersPageProps {
  params: {
    id: string;
  };
}

export default async function ManageMembersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { allowOrganisations } = getOrganisationSettings();
  
  if (!allowOrganisations) {
    return redirect('/admin');
  }

  // Verify admin access
  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    redirect('/auth/login');
  }

  // Check if user has admin role
  const { data: roleData, error: roleError } = await supabase
    .from('roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (roleError || roleData?.role !== 'admin') {
    redirect('/admin');
  }

  // Get organisation and users data
  let organisation: AdminOrganisation | null = null;
  let users: AdminUser[] = [];
  let error = null;

  try {
    [organisation, users] = await Promise.all([
      getOrganisationById(id),
      getAllUsers()
    ]);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    error = errorMessage;
  }

  if (!organisation) {
    notFound();
  }

  // Filter out users who are already members
  const existingMemberIds = organisation.organisation_memberships?.map(m => m.user_id) || [];
  const availableUsers = users.filter(user => !existingMemberIds.includes(user.id));

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="mb-8">
        <Link 
          href={`/admin/organisations/${organisation.id}`}
          className="text-primary hover:text-primary/80 mb-4 inline-block"
        >
          ← Back to Organisation
        </Link>
        <h1 className="text-3xl font-bold mb-2">Manage Members</h1>
        <p className="text-muted-foreground">
          Add, edit, and remove members from {organisation.name}
        </p>
      </div>

      {error ? (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded mb-6">
          Error loading data: {error}
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Add New Members */}
          <div className="bg-card p-6 rounded-lg border">
            <h2 className="text-xl font-semibold mb-4">Add New Members</h2>
            <ManageMembersForm 
              organisation={organisation} 
              availableUsers={availableUsers}
            />
          </div>

          {/* Current Members */}
          <div className="bg-card p-6 rounded-lg border">
            <h2 className="text-xl font-semibold mb-4">Current Members</h2>
            <MemberList 
              organisation={organisation}
              memberCount={organisation.organisation_memberships?.length || 0}
            />
          </div>
        </div>
      )}
    </div>
  );
} 