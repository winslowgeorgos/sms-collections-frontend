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
      const tokens = await apiClient.login(username, password);
      
      // In a real app, you'd decode the token to get user info
      const user = {
        id: '1',
        username,
        email: `${username}@company.com`,
      };
      
      login(tokens, user);
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed');
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
            {/* <h2 className="text-3xl font-bold text-gray-900">Choice Collections</h2> */}
            <p className="mt-2 text-sm text-gray-600">
              Sign in to your account
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded">
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
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isLoading}
              loading={isLoading}
              className="w-full"
            >
              Sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}