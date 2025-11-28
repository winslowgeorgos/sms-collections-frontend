'use client';

import React from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">Manage your application settings</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900">General Settings</h2>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">General application settings will be available here.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900">API Configuration</h2>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">API and integration settings will be available here.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">User and permission management will be available here.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}