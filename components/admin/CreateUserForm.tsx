'use client';

import UserForm from './UserForm';
import { AdminUser } from '@/app/admin/users/actions';

interface Organisation {
  id: string;
  name: string;
  slug: string;
}

interface CreateUserFormProps {
  organisations: Organisation[];
}

export default function CreateUserForm({ organisations }: CreateUserFormProps) {
  return (
    <UserForm 
      organisations={organisations} 
      mode="create" 
    />
  );
}