import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { getOrganisationSettings } from '@/utils/auth-helpers/settings';
import { getAllOrganisations } from '@/app/admin/users/actions';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { notFound } from 'next/navigation';
import type { AdminOrganisation } from '@/app/admin/users/actions';

export default async function OrganisationDetailsPage({ params }: { params: Promise<{ id: string }> }) {
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

  // Get organisation data
  let organisation: AdminOrganisation | undefined;
  try {
    const organisations = await getAllOrganisations();
    organisation = organisations.find(org => org.id === id);
  } catch (error) {
    console.error('Error fetching organisation:', error);
  }

  if (!organisation) {
    notFound();
  }

  const memberCount = organisation.organisation_memberships?.length || 0;
  const membersByRole = organisation.organisation_memberships?.reduce((acc, member) => {
    const role = member.role;
    if (!acc[role]) acc[role] = [];
    acc[role].push(member);
    return acc;
  }, {} as Record<string, typeof organisation.organisation_memberships>) || {};

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="mb-8">
        <Link 
          href="/admin/organisations"
          className="text-primary hover:text-primary/80 mb-4 inline-block"
        >
          ← Back to Organisations
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{organisation.name}</h1>
            <p className="text-muted-foreground text-lg">/{organisation.slug}</p>
          </div>
          <div className="flex gap-2">
            <Button asChild>
              <Link href={`/admin/organisations/${organisation.id}/manage`}>
                Manage Members
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Organisation Details */}
        <div className="bg-card p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Organisation Details</h2>
          <div className="space-y-3">
            <div>
              <span className="text-sm font-medium text-muted-foreground">Name:</span>
              <p className="text-lg">{organisation.name}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">Slug:</span>
              <p className="text-lg font-mono">/{organisation.slug}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">Created:</span>
              <p className="text-lg">{new Date(organisation.created_at).toLocaleDateString()}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">Last Updated:</span>
              <p className="text-lg">{new Date(organisation.updated_at).toLocaleDateString()}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">Total Members:</span>
              <p className="text-lg font-semibold text-primary">{memberCount}</p>
            </div>
          </div>
        </div>

        {/* Member Statistics */}
        <div className="bg-card p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Member Statistics</h2>
          <div className="space-y-3">
            {Object.entries(membersByRole).map(([role, members]) => (
              <div key={role} className="flex justify-between items-center">
                <span className="text-sm font-medium capitalize">{role}s:</span>
                <span className="text-lg font-semibold">{members?.length || 0}</span>
              </div>
            ))}
            {Object.keys(membersByRole).length === 0 && (
              <p className="text-muted-foreground">No members yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Members List */}
      <div className="mt-8">
        <div className="bg-card p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Members</h2>
          {organisation.organisation_memberships && organisation.organisation_memberships.length > 0 ? (
            <div className="space-y-4">
              {Object.entries(membersByRole).map(([role, members]) => (
                <div key={role}>
                  <h3 className="text-lg font-medium mb-3 capitalize">{role}s ({members?.length || 0})</h3>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {members?.map((membership, index) => (
                      <div key={index} className="bg-secondary/50 p-4 rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">
                            {membership.user?.full_name || 'Unknown User'}
                          </span>
                          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                            {membership.role}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          User ID: {membership.user_id}
                        </p>
                        {membership.user?.avatar_url && (
                          <div className="mt-2">
                            <img 
                              src={membership.user.avatar_url} 
                              alt="Avatar" 
                              className="w-8 h-8 rounded-full"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No members have been added to this organisation yet.</p>
              <Button asChild>
                <Link href={`/admin/organisations/${organisation.id}/manage`}>
                  Add Members
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 