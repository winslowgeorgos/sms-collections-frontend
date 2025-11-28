// components/layout/client-layout-wrapper.tsx
"use client";

import { usePathname } from 'next/navigation';
import { SidebarNavigationSectionsSubheadings } from '@/components/ui/sidebarnav';
import { navItemsWithSectionsSubheadings } from '@/utils/navigation-config';

interface ClientLayoutWrapperProps {
  children: React.ReactNode;
}

export function ClientLayoutWrapper({ children }: ClientLayoutWrapperProps) {
  const pathname = usePathname();
  
  // Don't show sidebar on auth pages
  const isAuthPage = pathname?.startsWith('/login') || pathname?.startsWith('/auth');

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      <SidebarNavigationSectionsSubheadings
        items={navItemsWithSectionsSubheadings} 
        activeUrl={pathname || "/"} 
      />
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}