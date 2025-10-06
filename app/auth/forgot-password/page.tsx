import { ForgotPasswordForm } from './forgot-password-form'

export default async function Page({ searchParams }: { searchParams: Promise<{ error: string, error_description: string, status: string, status_description: string }> }) {
  const params = await searchParams;
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <ForgotPasswordForm 
          error={params.error} 
          error_description={params.error_description}
          status={params.status}
          status_description={params.status_description}
        />
      </div>
    </div>
  )
}