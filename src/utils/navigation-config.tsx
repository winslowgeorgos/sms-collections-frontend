// utils/navigation-config.tsx
import { 
  BarChart3, 
  Calendar, 
  Settings, 
  FileText, 
  PieChart, 
  LayoutGrid, 
  Users,
  Shield,
  Database,
  MessageSquare,
  ChevronRight
} from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { NavItemType } from '@/utils/config';

export const navItemsWithSectionsSubheadings: Array<{ label: string; items: NavItemType[] }> = [
  {
    label: "Dashboard",
    items: [
      // {
      //   label: "Overview",
      //   href: "/dashboard",
      //   icon: BarChart3,
      // },
      {
        label: "Overview",
        href: "/analytics",
        icon: PieChart,
        badge: (
          <Badge size="sm" variant="modern">
            New
          </Badge>
        ),
      },
    ],
  },
  {
    label: "Campaign Management",
    items: [
      {
        label: "Campaigns",
        href: "/campaigns",
        icon: MessageSquare,
      },
      {
        label: "Products",
        href: "/products",
        icon: Database,
      },
      {
        label: "Days",
        href: "/days",
        icon: Calendar,
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        label: "Custom Rules",
        href: "/customrules",
        icon: Shield,
      },
      {
        label: "Logs",
        href: "/logs",
        icon: FileText,
      },
      {
        label: "Template",
        href: "/template",
        icon: LayoutGrid,
      },
      {
        label: "Settings",
        href: "/settings",
        icon: Settings,
      },
        {
        label: "Flagged Customers",
        href: "/flaggedcustomers",
        icon: Shield,
      },
    ],
  },
];

// Additional configuration for authentication
export const authNavItems = [
  {
    label: "Authentication",
    items: [
      {
        label: "Login",
        href: "/login",
        icon: Users,
      },
    ],
  },
];