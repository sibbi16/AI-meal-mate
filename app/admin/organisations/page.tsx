import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { getAllOrganisations, type AdminOrganisation } from '@/app/admin/users/actions';
import { getOrganisationSettings } from '@/utils/auth-helpers/settings';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import OrganisationCard from '@/components/ui/OrganisationCard';

export default async function AdminOrganisationsPage() {
  const { allowOrganisations } = getOrganisationSettings();
  
  if (!allowOrganisations) {
    return redirect('/admin');
  }

  let organisations: AdminOrganisation[] = [];
  let error = null;

  try {
    organisations = await getAllOrganisations();
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    error = errorMessage;
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Organisation Management</h1>
          <p className="text-muted-foreground">
            Manage all organisations and their members
          </p>
        </div>
        <div className="flex gap-4">
          <Button asChild variant="outline">
            <Link href="/admin">
              ← Back to Admin
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/organisations/create">
              Create Organisation
            </Link>
          </Button>
        </div>
      </div>

      {error ? (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded mb-6">
          Error loading organisations: {error}
        </div>
      ) : (
        <div className="grid gap-6">
          {organisations.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-lg border">
              <h3 className="text-xl font-semibold mb-2">No organisations yet</h3>
              <p className="text-muted-foreground mb-6">
                Create the first organisation to get started
              </p>
              <Button asChild>
                <Link href="/admin/organisations/create">
                  Create Organisation
                </Link>
              </Button>
            </div>
          ) : (
            organisations.map((org) => (
              <div key={org.id} className="bg-card p-6 rounded-lg border">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold">{org.name}</h3>
                    <p className="text-muted-foreground">/{org.slug}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Created: {new Date(org.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">
                      {org.organisation_memberships?.length || 0} members
                    </div>
                  </div>
                </div>

                {org.organisation_memberships && org.organisation_memberships.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium mb-2">Members:</h4>
                    <div className="flex flex-wrap gap-2">
                      {org.organisation_memberships.map((membership, index) => (
                        <span 
                          key={index}
                          className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded"
                        >
                          {membership.user?.full_name || 'Unknown'} ({membership.role})
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/organisations/${org.id}`}>
                      View Details
                    </Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link href={`/admin/organisations/${org.id}/manage`}>
                      Manage Members
                    </Link>
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
} 