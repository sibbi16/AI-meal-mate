'use client'

import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/providers/auth-provider'

export function LogoutButton() {
  const router = useRouter()
  const { signOut } = useAuthContext()

  const logout = async () => {
    await signOut()
    router.push('/auth/login')
  }

  return <Button onClick={logout}>Logout</Button>
}
