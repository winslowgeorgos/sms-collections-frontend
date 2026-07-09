// config/permissions.ts

// Define permission codenames for each section
export const PERMISSIONS = {
  DASHBOARD: {
    ADMIN: 'can_view_admin_dashboard',
    OFFICER: 'can_view_officer_dashboard',
    SMS: 'can_view_sms_dashboard',
    CALL: 'can_view_call_dashboard',
  },
  LOANS: {
    VIEW_ALL: 'view_mainloan',
    VIEW_MY: 'view_mainloan',
    VIEW_INSTALLMENTS: 'view_installment',
    ASSIGN: 'change_loanassignment',
    VIEW_ASSIGNED: 'view_loanassignment',
    VIEW_UNASSIGNED: 'view_loanassignment',
  },
  CALLS: {
    VIEW_ALL: 'view_calllog',
    VIEW_MY: 'view_calllog',
    VIEW_FOLLOW_UP: 'view_calllog',
  },
  PAYMENT_REMINDERS: {
    VIEW_ALL: 'view_paymentreminder',
  },
  CUSTOMERS: {
    VIEW_FLAGGED: 'view_flaggedcustomers',
  },
  CAMPAIGNS: {
    VIEW: 'view_customcampaign',
    MANAGE: 'change_customcampaign',
    APPROVE: 'can_approve_campaigns',
    VIEW_PRODUCTS: 'view_product',
    VIEW_DAYS: 'view_days',
    VIEW_RULES: 'view_customrule',
    VIEW_LOGS: 'view_smslog',
    VIEW_TEMPLATES: 'view_template',
  },
  SYSTEM: {
    VIEW_USERS: 'view_user',
    MANAGE_USERS: 'change_user',
    VIEW_GROUPS: 'view_group',
    MANAGE_GROUPS: 'change_group',
    VIEW_PERMISSIONS: 'view_permission',
    MANAGE_PERMISSIONS: 'change_permission',
    VIEW_JOBS: 'view_scheduledjobexecution',
    VIEW_SETTINGS: 'change_scheduledjobconfig',
  },
} as const;

// Define role-based access rules with proper typing
interface RoleConfig {
  canViewAll: boolean;
  sections: string[];
  restrictions?: Record<string, string[]>;
}

export const ROLE_PERMISSIONS: Record<string, RoleConfig> = {
  superuser: {
    canViewAll: true,
    sections: ['all'], // Superuser sees everything
    restrictions: {},
  },
  collection_admin: {
    canViewAll: false,
    sections: [
      'Dashboard',
      'Loan Management',
      'Call Management',
      'Payment Reminders',
      'Customers',
      'Campaign Management',
      'System',
    ],
    restrictions: {
      'Loan Management': ['My Loans'], // Hide specific items
        'Campaign Management': ['Products'], // Hide entire section

      'System': ['Job Monitor', 'Settings'], // Admins can see these
    },
  },
  collection_officer: {
    canViewAll: false,
    sections: [
      'Dashboard',
      'Loan Management',
      'Call Management',
      'Payment Reminders',
      'Campaign Management',
      'Customers',
    ],
    restrictions: {
    'Dashboard' : ['Collections Dashboard', 'SMS Dashboard', ], // Hide admin dashboards
      'Loan Management': ['Unassigned Loans', 'Assigned Loans'], // Hide from officers
      'Campaign Management': ['Products'], // Hide entire section
      'System': [], // Hide entire section
      
    },
  },
};

// Map permission checks from the API to our permission structure
export function mapPermissionChecks(permissionChecks: Record<string, boolean>) {
  return {
    can_view_admin_dashboard: permissionChecks.is_superuser || permissionChecks.can_access_admin,
    can_view_officer_dashboard: true, // All authenticated users can see their own analytics
    can_view_sms_dashboard: permissionChecks.can_view_customcampaign || permissionChecks.is_superuser,
    can_view_call_dashboard: permissionChecks.can_view_calllog || permissionChecks.is_superuser,
    
    // Loans
    can_view_all_loans: permissionChecks.can_view_all_loans || permissionChecks.is_superuser,
    can_view_installments: permissionChecks.can_view_installments || permissionChecks.is_superuser,
    can_assign_loans: permissionChecks.can_assign_loans || permissionChecks.is_superuser,

    
    // Calls
    can_view_all_calls: permissionChecks.can_view_call_logs || permissionChecks.is_superuser,
    can_create_calls: permissionChecks.can_create_call_logs || permissionChecks.is_superuser,
    
    // Campaigns
    can_approve_campaigns: permissionChecks.can_add_sms_collections_customrule || permissionChecks.is_superuser,
    
    // Users
    can_manage_users: permissionChecks.can_manage_users || permissionChecks.is_superuser,
    can_approve_escalations: permissionChecks.can_approve_escalations || permissionChecks.is_superuser,
    can_execute_escalations: permissionChecks.can_execute_escalations || permissionChecks.is_superuser,
    can_view_all_escalations: permissionChecks.can_view_all_escalations || permissionChecks.is_superuser,
    can_create_escalation_request: permissionChecks.can_create_escalation_request || permissionChecks.is_superuser,
    can_cancel_escalation: permissionChecks.can_cancel_escalation || permissionChecks.is_superuser,
    can_trigger_auto_escalation: permissionChecks.can_trigger_auto_escalation || permissionChecks.is_superuser,

  };
}