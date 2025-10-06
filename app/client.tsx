'use client';
import { QueryResult, UserWithRoles } from "@/utils/supabase/server";
import { useSupabaseStore } from "@/utils/supabase/hooks";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function Client({ userQueryResult }: { userQueryResult: QueryResult<UserWithRoles> }) {
  
  const { data: users } = useSupabaseStore<UserWithRoles>(userQueryResult);

  return (
    <div className="container mx-auto p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Hello {users?.[0]?.full_name || 'there'}! 👋</h1>
          <p className="text-zinc-600 dark:text-zinc-400">Welcome to your AI-powered application suite</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-2xl mb-3">
                🍽️
              </div>
              <CardTitle>Meal Mate</CardTitle>
              <CardDescription>
                Your intelligent meal planning assistant. Save recipes from images, URLs, or text, and create personalized weekly meal plans.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/meal-mate">
                <Button className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600">
                  Open Meal Mate
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow opacity-50">
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-2xl mb-3">
                🚀
              </div>
              <CardTitle>More Apps Coming Soon</CardTitle>
              <CardDescription>
                Additional AI-powered features and applications will be added here.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" disabled>
                Coming Soon
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}