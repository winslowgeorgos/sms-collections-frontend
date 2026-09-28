// utils/navigation-config.tsx
import {
  Calendar,
  Settings,
  FileText,
  LayoutGrid,
  Users,
  Shield,
  Database,
  MessageSquare,
  FolderOpen,
  UserCheck,
  UserPlus,
  PhoneCall,
  AlertCircle,
  TrendingUp,
  ListTodo,
  Bell,
  Activity,
  Server,
  Zap,
  Home,
  BarChart,
  ShieldAlert,
  Receipt,
  ClipboardList,
  Gavel,
  ListChecks,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { NavItemType } from '@/utils/config';
import { getCurrentUserId } from '@/utils/user_navconfig';

// NOTE: item labels are the keys used by navItemPermissions in config/permission-registry.ts —
// rename both together.
export const getNavItemsWithSections = (userId?: number | null): Array<{ label: string; items: NavItemType[] }> => {
  const myAnalyticsHref = userId ? `/analytics/officer/${userId}` : '/analytics/officer/me';

  return [
    {
      label: "Dashboard",
      items: [
        {
          label: "Collections Dashboard",
          href: "/analytics/admin",
          icon: BarChart,
          badge: (
            <Badge size="sm" variant="modern">
              Admin
            </Badge>
          ),
        },
        {
          label: "My Analytics",
          href: myAnalyticsHref,
          icon: TrendingUp,
        },
        {
          label: "SMS Dashboard",
          href: "/analytics",
          icon: Home,
        },
        {
          label: "Call Dashboard",
          href: "/call_logs",
          icon: Activity,
        },
      ],
    },
    {
      label: "Loan Management",
      items: [
        {
          label: "All Loans",
          href: "/loans",
          icon: FolderOpen,
          badge: (
            <Badge size="sm" variant="classic">
              263
            </Badge>
          ),
        },
        {
          label: "My Loans",
          href: "/loan-processor/my-loans",
          icon: UserCheck,
          badge: (
            <Badge size="sm" variant="success">
              1
            </Badge>
          ),
        },
        {
          label: "All Installments",
          href: "/installments",
          icon: Receipt,
        },
        {
          label: "My Installments",
          href: "/my_installments",
          icon: ClipboardList,
        },
        {
          label: "Assigned Loans",
          href: "/loan-processor/assigned",
          icon: Users,
          badge: (
            <Badge size="sm" variant="warning">
              1
            </Badge>
          ),
        },
        {
          label: "Unassigned Loans",
          href: "/loan-processor/unassigned",
          icon: UserPlus,
          badge: (
            <Badge size="sm" variant="error">
              276
            </Badge>
          ),
        },
      ],
    },
    {
      label: "ESCALATION MANAGEMENT",
      items: [
        {
          label: "Escalation Portal",
          href: "/escalation_portal",
          icon: Gavel,
        },
        {
          label: "Escalation Requests",
          href: "/escalation_portal/list",
          icon: ListChecks,
        },
        {
          label: "All Escalations",
          href: "/loan-processor/escalations?tab=all_escalations",
          icon: ShieldAlert,
          badge: (
            <Badge size="sm" variant="error">
              5
            </Badge>
          ),
        },
        {
          label: "My Escalations",
          href: "/loan-processor/escalations?tab=my_escalations",
          icon: ShieldAlert,
          badge: (
            <Badge size="sm" variant="warning">
              2
            </Badge>
          ),
        },
      ],
    },
    {
      label: "Call Management",
      items: [
        {
          label: "All Calls",
          href: "/call_logs/all",
          icon: PhoneCall,
        },
        {
          label: "My Calls",
          href: "/call_logs/my_calls",
          icon: UserCheck,
        },
        {
          label: "follow_up Tasks",
          href: "/call_logs/follow_up",
          icon: ListTodo,
          badge: (
            <Badge size="sm" variant="warning">
              Pending
            </Badge>
          ),
        },
      ],
    },
    {
      label: "Payment Reminders",
      items: [
        {
          label: "All Reminders",
          href: "/payment-reminders",
          icon: Bell,
        },
      ],
    },
    {
      label: "Repayments",
      items: [
        {
          label: "All Repayments",
          href: "/repayments/all",
          icon: Server,
        },
        {
          label: "My Repayments",
          href: "/repayments/my-payments",
          icon: Zap,
        },
      ],
    },
    {
      label: "Customers",
      items: [
        {
          label: "Flagged Customers",
          href: "/flaggedcustomers",
          icon: AlertCircle,
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
        {
          label: "Custom Rules",
          href: "/customrules",
          icon: Shield,
        },
        {
          label: "SMS Logs",
          href: "/logs",
          icon: FileText,
        },
        {
          label: "Templates",
          href: "/template",
          icon: LayoutGrid,
        },
        {
          label: "Template Variable Manual",
          href: "/template/sms-template-manual",
          icon: FileText,
        },
      ],
    },
    {
      label: "System",
      items: [
        {
          label: "User Management",
          href: "/admin/users",
          icon: Users,
        },
        {
          label: "Group Management",
          href: "/admin/groups",
          icon: UserCheck,
        },
        {
          label: "Permission Management",
          href: "/admin/permissions",
          icon: Shield,
        },
        {
          label: "Job Monitor",
          href: "/analytics/jobs",
          icon: Server,
          badge: (
            <Badge size="sm" variant="classic">
              Admin
            </Badge>
          ),
        },
        {
          label: "Settings",
          href: "/settings",
          icon: Settings,
        },
      ],
    },
  ];
};

// For backward compatibility, export a default version that tries to get the current user ID
export const navItemsWithSectionsSubheadings = getCurrentUserId().then(userId => getNavItemsWithSections(userId));

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

// Route configuration for easy reference
export const routeConfig = {
  // Dashboard routes
  dashboard: "/dashboard",
  adminDashboard: "/analytics/admin",
  officerAnalytics: (id: string | number) => `/analytics/officer/${id}`,

  // Loan routes
  loans: "/loans",
  myLoans: "/loan-processor/my-loans",
  assignedLoans: "/loan-processor/assigned",
  unassignedLoans: "/loan-processor/unassigned",
  loanDetails: (id: string) => `/loans/${id}`,

  // Installment routes
  installments: "/installments",
  myInstallments: "/my_installments",
  installmentDetails: (id: string) => `/installments/${id}`,

  // Escalation routes
  escalationPortal: "/escalation_portal",
  escalationList: "/escalation_portal/list",

  // Call log routes
  callLogs: "/call_logs",
  allCalls: "/call_logs/all",
  myCalls: "/call_logs/my_calls",
  followUpTasks: "/call_logs/follow_up",
  callLogDetails: (id: string) => `/call_logs/${id}`,

  // Payment reminder routes
  paymentReminders: "/payment-reminders",
  paymentReminderDetails: (id: string) => `/payment-reminders/${id}`,

  // Analytics routes
  jobMonitor: "/analytics/jobs",
  smsAnalytics: "/sms-analytics",
  loanStatistics: "/loan-processor/loan_statistics",
  officerPerformance: "/loan-processor/officer-performance",

  // Other routes
  flaggedCustomers: "/flaggedcustomers",
  collectionStatus: "/collection-status",
  campaigns: "/campaigns",
  products: "/products",
  days: "/days",
  customRules: "/customrules",
  smsLogs: "/logs",
  templates: "/templates",
  settings: "/settings",
  login: "/login",
} as const;