'use client';

import { createClient } from '@/utils/supabase/hooks';
import { createContext, useState, useEffect, useContext } from 'react';
import { QueryResult, UserWithRoles } from '@/utils/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/utils/supabase/types';
import { SignOut } from '@/utils/auth-helpers/server';

export const AuthContext = createContext<{ 
    user: UserWithRoles | null, 
    loading: boolean,
    signOut: () => Promise<void>
}>({ 
    user: null, 
    loading: false,
    signOut: async () => {}
});

export const AuthProvider = ({ children, userQueryResult }: { children: React.ReactNode, userQueryResult?: QueryResult<UserWithRoles> }) => {
    const [user, setUser] = useState<UserWithRoles | null>(userQueryResult?.data?.[0] || null);
    const [loading, setLoading] = useState(true);
    const [supabase, setSupabase] = useState<SupabaseClient<Database> | null>(null);

    // Manual sign-out function that immediately clears the state
    const signOut = async () => {
        console.log('AuthProvider: Manual sign-out called');
        // Clear user state immediately
        setUser(null);
        
        if (supabase) {
            // Then call Supabase sign-out
            const error = await SignOut();
        }
    };

    useEffect(() => {
        // Initialize Supabase client only on the client side
        const client = createClient();
        setSupabase(client);
        
        console.log('AuthProvider: Initializing with userQueryResult:', userQueryResult?.data?.[0]?.id);
        
        // Set initial user from server-side data
        if (userQueryResult?.data?.[0]) {
            setUser(userQueryResult.data[0]);
            console.log('AuthProvider: Set initial user from server data:', userQueryResult.data[0].id);
        }
        setLoading(false);

        // Subscribe to auth state changes
        const { data: { subscription } } = client.auth.onAuthStateChange(
            async (event: string, session) => {
                console.log('AuthProvider: Auth state changed:', event, session?.user?.id);
                
                if (event === 'SIGNED_IN' && session?.user) {
                    console.log('AuthProvider: User signed in, fetching user data...');
                    // Fetch updated user data with roles when user signs in
                    try {
                        const { data: userData, error } = await client
                            .from('users')
                            .select('*, roles(*)')
                            .eq('id', session.user.id)
                            .limit(1)
                            .single();
                        
                        if (error) {
                            console.error('AuthProvider: Error fetching user data:', error);
                            setUser(null);
                        } else {
                            console.log('AuthProvider: User data fetched successfully:', userData.id);
                            setUser(userData as UserWithRoles);
                        }
                    } catch (error) {
                        console.error('AuthProvider: Error in auth state change handler:', error);
                        setUser(null);
                    }
                } else if (event === 'SIGNED_OUT') {
                    console.log('AuthProvider: User signed out, clearing user data immediately');
                    // Clear user data immediately on sign out
                    setUser(null);
                } else if (event === 'RECOVERY' && session?.user) {
                    console.log('AuthProvider: Password recovery, updating user data...');
                    // Refresh user data when password is recovered
                    try {
                        const { data: userData, error } = await client
                            .from('users')
                            .select('*, roles(*)')
                            .eq('id', session.user.id)
                            .limit(1)
                            .single();
                        
                        if (error) {
                            console.error('AuthProvider: Error fetching user data on password recovery:', error);
                        } else {
                            console.log('AuthProvider: User data updated on password recovery:', userData.id);
                            setUser(userData as UserWithRoles);
                        }
                    } catch (error) {
                        console.error('AuthProvider: Error in password recovery handler:', error);
                    }
                } else if (event === 'USER_UPDATED' && session?.user) {
                    console.log('AuthProvider: User updated, refreshing user data...');
                    // Refresh user data when user is updated
                    try {
                        const { data: userData, error } = await client
                            .from('users')
                            .select('*, roles(*)')
                            .eq('id', session.user.id)
                            .limit(1)
                            .single();
                        
                        if (error) {
                            console.error('AuthProvider: Error fetching user data on user update:', error);
                        } else {
                            console.log('AuthProvider: User data updated on user update:', userData.id);
                            setUser(userData as UserWithRoles);
                        }
                    } catch (error) {
                        console.error('AuthProvider: Error in user update handler:', error);
                    }
                }
            }
        );

        console.log('AuthProvider: Auth subscription established');

        // Cleanup subscription on unmount
        return () => {
            console.log('AuthProvider: Cleaning up auth subscription');
            subscription.unsubscribe();
        };
    }, [userQueryResult?.data]);

    console.log('AuthProvider: Current user state:', user?.id, 'Loading:', loading);

    return (
        <AuthContext.Provider value={{ user, loading, signOut }}>{children}</AuthContext.Provider>
    );
}

export const useAuthContext = () => useContext(AuthContext)

