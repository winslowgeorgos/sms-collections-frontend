// components/layout/sidebar.tsx
'use client';

import { useAuth } from '@/context/auth-context';
import { usePermissions } from '@/context/permission-context';
import { getNavItemsWithSections } from '@/utils/navigation-config';
// Use the same registry file as client-layout-wrapper.tsx (the one with the new labels).
import { navItemPermissions } from '@/utils/permission-registry';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NavItemType } from '@/utils/config';

type NavSection = { label: string; items: NavItemType[] };

interface SidebarProps {
  collapsed?: boolean;
}

export function Sidebar({ collapsed = false }: SidebarProps) {
  const pathname = usePathname() || '/';
  const { userDetails } = useAuth();
  const { hasAccess, isLoading } = usePermissions();

  const userId = userDetails?.user?.id ?? null;
  const isSuperuser = !!userDetails?.user?.is_superuser;

  // Build the nav synchronously for the logged-in user, then filter by permission.
  const filteredNavItems = useMemo<NavSection[]>(() => {
    if (!userDetails) return [];

    return getNavItemsWithSections(userId)
      .map((section): NavSection | null => {
        const items = section.items.filter((item) => {
          if (isSuperuser) return true;
          const requirement = navItemPermissions[item.label];
          if (!requirement) return true; // unregistered items are visible to everyone
          return hasAccess(requirement);
        });
        return items.length > 0 ? { ...section, items } : null;
      })
      .filter((section): section is NavSection => section !== null);
  }, [userDetails, userId, isSuperuser, hasAccess]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-200 border-t-accent-600" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col border-r bg-white dark:bg-gray-900">
      <div className="flex h-16 items-center px-4">
        <span className="text-lg font-bold">Logo</span>
      </div>
      <nav className="flex-1 space-y-4 px-2 py-4">
        {filteredNavItems.map((section) => (
          <SidebarSection
            key={section.label}
            label={section.label}
            items={section.items}
            collapsed={collapsed}
            pathname={pathname}
          />
        ))}
      </nav>
    </div>
  );
}

interface SidebarSectionProps {
  label: string;
  items: NavItemType[];
  collapsed: boolean;
  pathname: string;
}

function SidebarSection({ label, items, collapsed, pathname }: SidebarSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (collapsed) {
    return (
      <div className="space-y-1">
        {items.map((item) => (
          <NavItemCollapsed key={item.href} item={item} pathname={pathname} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={() => setIsExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-3 text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-700"
      >
        <span>{label}</span>
        {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>

      {isExpanded && (
        <div className="space-y-1">
          {items.map((item) => (
            <NavItem key={item.href} item={item} pathname={pathname} />
          ))}
        </div>
      )}
    </div>
  );
}

interface NavItemProps {
  item: NavItemType;
  pathname: string;
}

/** Match on the path only — hrefs like "/loan-processor/escalations?tab=all" carry a query string. */
function isActivePath(pathname: string, href: string): boolean {
  const path = href.split('?')[0];
  return pathname === path || pathname.startsWith(path + '/');
}

function NavItem({ item, pathname }: NavItemProps) {
  const isActive = isActivePath(pathname, item.href);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors',
        isActive ? 'bg-accent-50 text-accent-700' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
      )}
    >
      <div className="flex items-center gap-3">
        {Icon && <Icon className="h-4 w-4" />}
        <span>{item.label}</span>
      </div>
      {item.badge && <div>{item.badge}</div>}
    </Link>
  );
}

function NavItemCollapsed({ item, pathname }: NavItemProps) {
  const isActive = isActivePath(pathname, item.href);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center justify-center rounded-md p-2 transition-colors',
        isActive ? 'bg-accent-50 text-accent-700' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
      )}
      title={item.label}
    >
      {Icon && <Icon className="h-5 w-5" />}
    </Link>
  );
}