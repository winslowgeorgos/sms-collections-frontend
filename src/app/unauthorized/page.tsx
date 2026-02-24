// app/unauthorized/page.tsx
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="max-w-md w-full text-center">
        {/* Lock Icon */}
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-red-100 dark:bg-red-900/20 p-4">
            <ShieldAlert className="h-12 w-12 text-red-600 dark:text-red-400" />
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Access Denied
        </h1>

        {/* Message */}
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
          You don’t have permission to view this page. If you believe this is a mistake, please contact your administrator.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/analytics"
            className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-green bg-accent-600 hover:bg-accent-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500 transition-colors"
          >
            Go to Dashboard
          </Link>
      
        </div>

        {/* Optional subtle note */}
        <p className="mt-8 text-sm text-gray-500 dark:text-gray-400">
          Error 403 – Forbidden
        </p>
      </div>
    </div>
  );
}