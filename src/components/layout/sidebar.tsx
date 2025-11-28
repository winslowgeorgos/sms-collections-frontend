'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Megaphone,
  FileText, 
  Settings,
  BarChart3
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Templates', href: '/templates', icon: MessageSquare },
  { name: 'Campaigns', href: '/campaigns', icon: Megaphone },
  { name: 'SMS Logs', href: '/logs', icon: FileText },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();

  return (
    <div className="w-64 bg-primary-800 text-white">
      <div className="flex items-center justify-center h-16 bg-primary-900">
        <h1 className="text-xl font-bold">SMS Collections</h1>
      </div>
      <nav className="mt-8">
        <div className="px-4 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-accent-600 text-white'
                    : 'text-primary-100 hover:bg-primary-700 hover:text-white'
                }`}
              >
                <Icon size={20} className="mr-3" />
                {item.name}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};