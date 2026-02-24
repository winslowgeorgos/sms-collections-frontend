// components/layout/client-layout-wrapper.tsx
"use client";

import { usePathname, useRouter } from 'next/navigation';
import { SidebarNavigationSectionsSubheadings } from '@/components/ui/sidebarnav';
import { navItemsWithSectionsSubheadings } from '@/utils/navigation-config';
import { navItemPermissions } from '@/utils/permission-registry';
import { useAuth } from '@/context/auth-context';
import { usePermissions } from '@/context/permission-context';
import { useMemo } from 'react';

interface ClientLayoutWrapperProps {
  children: React.ReactNode;
}

export function ClientLayoutWrapper({ children }: ClientLayoutWrapperProps) {
  const pathname = usePathname();
  const { userDetails, isLoading: authLoading } = useAuth();
  const { hasAccess, isLoading: permLoading } = usePermissions();

  // Filter navigation items based on user permissions using the registry
  const filteredNavItems = useMemo(() => {
    if (!userDetails) {
      // No user yet – return empty or original? Better to return empty until user loads.
      return [];
    }

    const isSuperuser = userDetails.user.is_superuser;

    return navItemsWithSectionsSubheadings
      .map(section => {
        // Filter items within the section
        const filteredItems = section.items.filter(item => {
          // Superuser sees everything
          if (isSuperuser) return true;

          const requirement = navItemPermissions[item.label];
          // No requirement means item is visible to everyone
          if (!requirement) return true;

          return hasAccess(requirement);
        });

        // Only return section if it has at least one item
        if (filteredItems.length === 0) {
          return null;
        }

        return {
          ...section,
          items: filteredItems,
        };
      })
      .filter(Boolean) as typeof navItemsWithSectionsSubheadings;
  }, [userDetails, hasAccess]);

  // Don't show sidebar on auth pages
  const isAuthPage = pathname?.startsWith('/login') || pathname?.startsWith('/auth');

  if (isAuthPage) {
    return <>{children}</>;
  }

  // Show loading state while auth or permissions are loading
  if (authLoading || permLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-200 border-t-accent-600" />
      </div>
    );
  }

  // If no filtered items (user has no access to any section), show minimal layout
  if (filteredNavItems.length === 0) {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
        <div className="w-64 border-r bg-white dark:bg-gray-900 p-4">
          <p className="text-sm text-gray-500">No accessible sections</p>
        </div>
        <main className="flex-1 overflow-auto">
          <div className="p-6">{children}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      <SidebarNavigationSectionsSubheadings
        items={filteredNavItems}
        activeUrl={pathname || '/'}
      />
      <main className="flex-1 overflow-auto">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}