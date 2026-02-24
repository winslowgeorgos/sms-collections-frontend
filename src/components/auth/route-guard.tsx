// components/auth/route-guard.tsx
'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { usePermissions } from '@/context/permission-context';
import { navItemPermissions, routePermissions, PermissionRequirement } from '@/utils/permission-registry';


// Helper to match dynamic routes like /loans/123
function findMatchingRoute(path: string): PermissionRequirement | undefined {
  // Add patterns as needed
  if (path.startsWith('/loans/') && path.split('/').length === 3) {
    return routePermissions['/loans/[id]'];
  }
  if (path.startsWith('/installments/') && path.split('/').length === 3) {
    return routePermissions['/installments/[id]'];
  }
  // Add more patterns here (e.g., /campaigns/123, /users/123)
  return undefined;
}

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { hasAccess, isLoading } = usePermissions();

  useEffect(() => {

      if (
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/auth') ||
    pathname === '/unauthorized'
  ) {
    return;
  }

    if (isLoading) return;

    // Try exact match first, then fallback to pattern match
    const requirement = routePermissions[pathname] ?? findMatchingRoute(pathname);

    if (requirement) {
      const allowed = hasAccess(requirement);
      if (!allowed) {
        router.push('/unauthorized');
      }
    }
    // If no requirement, allow access
  }, [pathname, isLoading, hasAccess, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-200 border-t-accent-600" />
      </div>
    );
  }

  return <>{children}</>;
}