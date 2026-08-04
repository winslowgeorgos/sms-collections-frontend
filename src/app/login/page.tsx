'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { apiClient } from '@/lib/api';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Image from "next/image";

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Step 1: Get authentication tokens
      const loginResponse = await apiClient.login(username, password);
      
      // hydrate apiClient in-memory tokens so subsequent requests carry auth headers
      if (typeof (apiClient as any).setTokens === 'function') {
        await (apiClient as any).setTokens(loginResponse);
      }

      // Step 2: Fetch user details and permissions
      const userDetails = await apiClient.getUserDetails();
      
      // Step 3: Extract session seed from response payloads
      const sessionSeed =
        (loginResponse as any)?.session_seed ||
        (userDetails as any)?.session_seed ||
        (userDetails as any)?.user?.session_seed;

      // Step 4: Initialize encryption vault and context state
      await login(loginResponse, userDetails, sessionSeed);

      
      const user = userDetails?.user;
      if (user?.role === 'collection_officer' && user?.id) {
        router.push(`/analytics/officer/${user.id}`);
        return;
      }
      
      // Step 4: Redirect to dashboard
      router.push('/analytics/admin');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.response?.data?.detail || err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="overflow-hidden flex items-center justify-center">
            <Image
              src="/assets/images/clear_black_choice_logo.png"
              alt="Company Logo"
              width={300}
              height={200}
              className="object-contain"
            />
          </div>
          <div className="text-center">
            <p className="mt-2 text-sm text-gray-600">
              Sign in to your account
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
            
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-accent-500 focus:border-accent-500"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-accent-500 focus:border-accent-500"
                disabled={isLoading}
              />
              <div className="flex items-center justify-end">
               <div className="text-sm">
                 <a href="/forgot-password" 
                 className="font-medium text-indigo-600 hover:text-indigo-500" >Forgot your password?</a>
               </div>
             </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isLoading}
              loading={isLoading}
              className="w-full"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}