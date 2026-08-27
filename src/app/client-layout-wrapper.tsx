// components/layout/client-layout-wrapper.tsx
"use client";

import { usePathname } from 'next/navigation';
import { SidebarNavigationSectionsSubheadings } from '@/components/ui/sidebarnav';
import { getNavItemsWithSections } from '@/utils/navigation-config';
import { navItemPermissions } from '@/utils/permission-registry';
import { useAuth } from '@/context/auth-context';
import { usePermissions } from '@/context/permission-context';
import { useMemo, useState, useRef, useEffect } from 'react';
import NotificationBell from '@/components/notifications/NotificationBell';
import { User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ClientLayoutWrapperProps {
  children: React.ReactNode;
}

export function ClientLayoutWrapper({ children }: ClientLayoutWrapperProps) {
  const pathname = usePathname();
  const { userDetails, isLoading: authLoading, logout } = useAuth();
  const { hasAccess, isLoading: permLoading } = usePermissions();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter navigation items based on user ID and permissions
  const filteredNavItems = useMemo(() => {
    if (!userDetails) return [];

    const userId = userDetails.user?.id ? Number(userDetails.user.id) : null;
    const baseNavItems = getNavItemsWithSections(userId);
    const isSuperuser = userDetails.user.is_superuser;

    return baseNavItems
      .map(section => {
        const filteredItems = section.items.filter(item => {
          if (isSuperuser) return true;
          const requirement = navItemPermissions[item.label];
          if (!requirement) return true;
          return hasAccess(requirement);
        });
        if (filteredItems.length === 0) return null;
        return { ...section, items: filteredItems };
      })
      .filter(Boolean) as typeof baseNavItems;
  }, [userDetails, hasAccess]);

  const isAuthPage = pathname?.startsWith('/login') || pathname?.startsWith('/auth');
  if (isAuthPage) return <>{children}</>;

  if (authLoading || permLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-200 border-t-accent-600" />
      </div>
    );
  }

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
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header with Notification Bell */}
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-3 flex justify-between items-center">
          <div className="flex items-center">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              {pathname?.split('/')[1]?.replace(/-/g, ' ') || 'Dashboard'}
            </h2>
          </div>
          <div className="flex items-center space-x-4">
            <NotificationBell />
            {/* Custom User Dropdown */}
            <div className="relative" ref={menuRef}>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <User className="h-5 w-5" />
              </Button>
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {userDetails?.user?.first_name} {userDetails?.user?.last_name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {userDetails?.user?.email}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      setUserMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}