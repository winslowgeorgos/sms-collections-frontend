"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItemType } from "@/utils/config";
import Image from "next/image";
import { useAuth } from "@/context/auth-context"; // Adjust path to your AuthContext location

// Fallback icons using Lucide React
import { 
  BarChart3, 
  Calendar, 
  CheckSquare, 
  ChevronRight, 
  FileText, 
  PieChart, 
  LayoutGrid, 
  Users,
  LogOut
} from 'lucide-react';

interface SidebarNavigationSectionsSubheadingsProps {
  items: Array<{ label: string; items: NavItemType[] }>;
  activeUrl: string;
}

// Fallback icon mapping
const iconComponents: { [key: string]: React.ComponentType<any> } = {
  BarChartSquare02: BarChart3,
  Calendar: Calendar,
  CheckDone01: CheckSquare,
  ChevronRight: ChevronRight,
  File05: FileText,
  PieChart03: PieChart,
  Rows01: LayoutGrid,
  Users01: Users,
};

export function SidebarNavigationSectionsSubheadings({
  items,
  activeUrl,
}: SidebarNavigationSectionsSubheadingsProps) {
  const pathname = usePathname();
  
  // Use user state and logout function directly from AuthContext
  const { user, logout } = useAuth();

  const getIconComponent = (icon: any) => {
    if (typeof icon === 'function') {
      return icon;
    }
    
    if (typeof icon === 'string' && iconComponents[icon]) {
      return iconComponents[icon];
    }
    
    return LayoutGrid;
  };

  const handleLogout = async () => {
    try {
      // Cleanly triggers AuthContext logout -> apiClient.logoutUser()
      await logout();
    } catch (error) {
      console.error("Error during sidebar logout:", error);
    }
  };

  return (
    <div className="flex h-full w-64 flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
      {/* Logo Section */}
      <div className="flex h-16 items-center justify-between border-b border-gray-200 dark:border-gray-800 px-6">
        <div className="flex items]-center gap-2">
<div className="h-8 w-8 rounded-lg overflow-hidden flex items-center justify-center">
  <Image
    src="/assets/images/clogo.png"
    alt="Company Logo"
    width={32}
    height={32}
    className="object-contain"
  />
</div>
          <span className="text-xl font-semibold text-gray-900 dark:text-white">
            Collections
          </span>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto py-6 px-4">
        <nav className="space-y-8">
          {items.map((section, sectionIndex) => (
            <div key={section.label} className="space-y-3">
              <h3 className="px-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {section.label}
              </h3>
              <ul className="space-y-1">
                {section.items.map((item, itemIndex) => {
                  const rawHref = item.href as unknown;
                  let resolvedHref = typeof rawHref === 'function'
                    ? rawHref(user) 
                    : item.href;

                  if (resolvedHref && typeof resolvedHref === 'object') {
                    resolvedHref = String(resolvedHref);
                  }

                  const finalHref = typeof resolvedHref === 'string' 
                    ? resolvedHref.replace('[object Promise]', user?.id ? String(user.id) : '') 
                    : '#';

                  const isActive = pathname === finalHref;
                  const IconComponent = getIconComponent(item.icon);
                  
                  return (
                    <li key={item.label}>
                      <Link
                        href={finalHref}
                        className={cn(
                          "group flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ease-in-out transform hover:scale-[1.02]",
                          isActive
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 shadow-sm border border-blue-100 dark:border-blue-800"
                            : "text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                        )}
                        style={{
                          animationDelay: `${(sectionIndex * 100) + (itemIndex * 50)}ms`,
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "flex items-center justify-center transition-all duration-200",
                              isActive
                                ? "text-blue-600 dark:text-blue-400 transform scale-110"
                                : "text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 group-hover:scale-110"
                            )}
                          >
                            <IconComponent size={20} />
                          </div>
                          <span className="transition-all duration-200">
                            {item.label}
                          </span>
                        </div>
                        {item.badge && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            {item.badge}
                          </div>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      {/* User & Logout Section */}
      <div className="border-t border-gray-200 dark:border-gray-800 p-4">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200 cursor-pointer group">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
            <span className="text-white text-xs font-medium">
              {user?.username ? user.username.charAt(0).toUpperCase() : 'U'} </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              <em>User Name: </em> {user ? user?.username : "Guest"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
             <em> Role: </em> {user ? (user as any)?.role : "N/A"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 wrap">
             <em> Email: </em> {user ? user?.email : "N/A"}
            </p>
          </div>
        </div>
        
        {/* Logout Button */}
        <button 
          onClick={handleLogout}
          className="mt-2 w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-700 dark:text-gray-300 dark:hover:bg-red-900/20 dark:hover:text-red-300 transition-all duration-200 ease-in-out group transform hover:scale-[1.02]"
        >
          <div className="flex items-center justify-center w-5 h-5">
            <LogOut className="w-4 h-4 text-current" />
          </div>
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}