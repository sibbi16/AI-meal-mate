"use client"

import { cn } from "@/utils/cn"
import { requestPasswordReset } from "@/utils/auth-helpers/server"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export function ForgotPasswordForm({ className, error, error_description, status, status_description, ...props }: React.ComponentPropsWithoutRef<"div"> & { error: string, error_description: string, status: string, status_description: string }) {
  const [email, setEmail] = useState("")
  const [errorState, setErrorState] = useState<string | null>(error)
  const [success, setSuccess] = useState(!!status)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Check for URL parameters and update state accordingly
  useEffect(() => {
    const urlStatus = searchParams.get('status')
    const urlError = searchParams.get('error')
    
    if (urlStatus) {
      setSuccess(true)
    } else if (urlError) {
      setErrorState(urlError)
    }
  }, [searchParams])

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorState(null)

    try {
      const formData = new FormData()
      formData.append('email', email)
      
      const result = await requestPasswordReset(formData)
      
      // If result is a URL (redirect), navigate to it
      if (typeof result === 'string') {
        router.push(result)
      } else {
        // Should not reach here as the server action always returns a redirect
        setSuccess(true)
      }
    } catch (error: unknown) {
      setErrorState(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      {success ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{status || searchParams.get('status') || "Check Your Email"}</CardTitle>
            <CardDescription>{status_description || searchParams.get('status_description') || "Password reset instructions sent"}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              If you registered using your email and password, you will receive a password reset
              email.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Reset Your Password</CardTitle>
            <CardDescription>
              Type in your email and we&apos;ll send you a link to reset your password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                {errorState && <p className="text-sm text-red-500">{errorState}</p>}
                {error_description && <p className="text-sm text-red-500">{error_description}</p>}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Sending..." : "Send reset email"}
                </Button>
              </div>
              <div className="mt-4 text-center text-sm">
                Already have an account?{" "}
                <Link href="/auth/login" className="underline underline-offset-4">
                  Login
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
