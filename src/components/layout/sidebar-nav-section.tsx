// components/layout/sidebar-nav-section.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NavItemType } from '@/utils/config';

interface SidebarNavSectionProps {
  label: string;
  items: NavItemType[];
  collapsed?: boolean;
}

export function SidebarNavSection({ label, items, collapsed = false }: SidebarNavSectionProps) {
  const pathname = usePathname();
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
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-3 text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-700"
      >
        <span>{label}</span>
        {isExpanded ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
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

function NavItem({ item, pathname }: { item: NavItemType; pathname: string }) {
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-accent-50 text-accent-700'
          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
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

function NavItemCollapsed({ item, pathname }: { item: NavItemType; pathname: string }) {
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center justify-center rounded-md p-2 transition-colors',
        isActive
          ? 'bg-accent-50 text-accent-700'
          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
      )}
      title={item.label}
    >
      {Icon && <Icon className="h-5 w-5" />}
    </Link>
  );
}