import Link from 'next/link';
import { Tables } from '@/utils/supabase/types';
import { Card, CardContent, CardFooter, CardHeader } from './card';
import { Badge } from './badge';
import { Button } from './button';

type Organisation = Tables<'organisations'>;

interface OrganisationCardProps {
  organisation: Organisation;
  role: string;
}

export default function OrganisationCard({ organisation, role }: OrganisationCardProps) {
  const isAdmin = role === 'admin';

  return (
    <Card className="hover:shadow-md transition-all duration-200 hover:border-accent">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="text-xl font-semibold text-foreground leading-tight">
              {organisation.name}
            </h3>
            <p className="text-muted-foreground text-sm font-mono">
              /{organisation.slug}
            </p>
          </div>
          <Badge 
            variant={isAdmin ? 'secondary' : 'secondary'}
            className="text-xs"
          >
            {role}
          </Badge>
        </div>
      </CardHeader>

      <div className="flex gap-2">
        <Button asChild variant="outline" className="flex-1">
          <Link href={`/organisations/${organisation.id}`}>
            View Details
          </Link>
        </Button>
        {isAdmin && (
          <Button asChild className="flex-1">
            <Link href={`/organisations/${organisation.id}/manage`}>
              Manage
            </Link>
          </Button>
        )}
      </div>
    </Card>
  );
} 