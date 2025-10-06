'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createOrganisation } from '@/app/admin/users/actions';
import { useRouter } from 'next/navigation';

// Helper function to generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function CreateOrganisationForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const name = String(formData.get('name')).trim();
    const slug = String(formData.get('slug')).trim();

    if (!name || !slug) {
      setError('Name and slug are required');
      setIsSubmitting(false);
      return;
    }

    try {
      await createOrganisation({ name, slug });
      router.push('/admin/organisations');
      router.refresh();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create organisation';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="name">Organisation Name</Label>
        <Input
          type="text"
          id="name"
          name="name"
          required
          placeholder="Acme Corporation"
          onChange={(e) => {
            const slugInput = document.getElementById('slug') as HTMLInputElement;
            if (slugInput) {
              slugInput.value = generateSlug(e.target.value);
            }
          }}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug">Organisation Slug</Label>
        <Input
          type="text"
          id="slug"
          name="slug"
          required
          pattern="[a-z0-9-]+"
          placeholder="acme-corporation"
        />
        <p className="text-sm text-muted-foreground">
          This will be used in your organisation's URL. Only lowercase letters, numbers, and hyphens are allowed.
        </p>
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full"
      >
        {isSubmitting ? 'Creating...' : 'Create Organisation'}
      </Button>
    </form>
  );
} 