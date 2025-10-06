'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { updateOrganisation, deleteOrganisation } from '@/app/admin/users/actions';
import { useRouter } from 'next/navigation';
import type { AdminOrganisation } from '@/app/admin/users/actions';

interface OrganisationActionButtonsProps {
  organisation: AdminOrganisation;
}

export function OrganisationActionButtons({ organisation }: OrganisationActionButtonsProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${organisation.name}"? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      await deleteOrganisation(organisation.id);
      router.refresh();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete organisation';
      setError(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push(`/admin/organisations/${organisation.id}/edit`)}
      >
        Edit
      </Button>
      
      <Button
        variant="destructive"
        size="sm"
        onClick={handleDelete}
        disabled={isDeleting}
      >
        {isDeleting ? 'Deleting...' : 'Delete'}
      </Button>

      {error && (
        <div className="absolute top-full left-0 right-0 bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded mt-2">
          {error}
        </div>
      )}
    </>
  );
} 