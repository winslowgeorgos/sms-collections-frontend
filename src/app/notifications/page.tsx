'use client';

import React from 'react';
import NotificationLog from '@/components/notifications/NotificationLog';

export default function NotificationsPage() {
  return (
    <div className="min-h-screen bg-gray-50/50 p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        <NotificationLog />
      </div>
    </div>
  );
}
