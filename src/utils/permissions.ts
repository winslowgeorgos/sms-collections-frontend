// config/permissions.ts

// Define permission codenames for each section.
// NOTE: codenames must match the Django permission codenames EXACTLY (case-sensitive),
// including 'can_view_installmets_list_page' and 'can_view_PR_Buckets' as defined on the backend.
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
  INSTALLMENTS: {
    VIEW_LIST_PAGE: 'can_view_installmets_list_page',
    VIEW_MY_LIST_PAGE: 'can_view_my_installments_list_page',
  },
  // CBK PR-bucket figures — gate every place these values are rendered.
  PR_METRICS: {
    VIEW_TARGET: 'can_view_target',
    VIEW_COMMISSION: 'can_view_commission',
    VIEW_POSTED_PR_AMOUNT: 'can_view_posted_pr_amount',
    VIEW_PR_BUCKETS: 'can_view_PR_Buckets',
  },
  ESCALATIONS: {
    VIEW_ALL: 'can_view_all_escalations',
    CREATE_REQUEST: 'can_create_escalation_request',
    APPROVE: 'can_approve_escalations',
    EXECUTE: 'can_execute_escalations',
    CANCEL: 'can_cancel_escalation',
    TRIGGER_AUTO: 'can_trigger_auto_escalation',
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
      'ESCALATION MANAGEMENT',
      'Call Management',
      'Payment Reminders',
      'Customers',
      'Campaign Management',
      'System',
    ],
    restrictions: {
      'Loan Management': ['My Loans'], // Hide specific items
      'Campaign Management': ['Products'],
      'System': ['Job Monitor', 'Settings'],
    },
  },
  collection_officer: {
    canViewAll: false,
    sections: [
      'Dashboard',
      'Loan Management',
      'ESCALATION MANAGEMENT',
      'Call Management',
      'Payment Reminders',
      'Campaign Management',
      'Customers',
    ],
    restrictions: {
      'Dashboard': ['Collections Dashboard', 'SMS Dashboard'], // Hide admin dashboards
      'Loan Management': ['Unassigned Loans', 'Assigned Loans'], // Hide from officers
      'Campaign Management': ['Products'],
      'System': [],
    },
  },
};

// Map permission checks from the API to our permission structure
export function mapPermissionChecks(permissionChecks: Record<string, boolean>) {
  const su = !!permissionChecks.is_superuser;
  return {
    can_view_admin_dashboard: su || permissionChecks.can_access_admin,
    can_view_officer_dashboard: true, // All authenticated users can see their own analytics
    can_view_sms_dashboard: permissionChecks.can_view_customcampaign || su,
    can_view_call_dashboard: permissionChecks.can_view_calllog || su,

    // Loans
    can_view_all_loans: permissionChecks.can_view_all_loans || su,
    can_view_installments: permissionChecks.can_view_installments || su,
    can_assign_loans: permissionChecks.can_assign_loans || su,

    // Installment list pages
    can_view_installmets_list_page: permissionChecks.can_view_installmets_list_page || su,
    can_view_my_installments_list_page: permissionChecks.can_view_my_installments_list_page || su,

    // PR bucket figures
    can_view_target: permissionChecks.can_view_target || su,
    can_view_commission: permissionChecks.can_view_commission || su,
    can_view_posted_pr_amount: permissionChecks.can_view_posted_pr_amount || su,
    can_view_PR_Buckets: permissionChecks.can_view_PR_Buckets || su,

    // Calls
    can_view_all_calls: permissionChecks.can_view_call_logs || su,
    can_create_calls: permissionChecks.can_create_call_logs || su,

    // Campaigns
    can_approve_campaigns: permissionChecks.can_add_sms_collections_customrule || su,

    // Users
    can_manage_users: permissionChecks.can_manage_users || su,

    // Escalations
    can_approve_escalations: permissionChecks.can_approve_escalations || su,
    can_execute_escalations: permissionChecks.can_execute_escalations || su,
    can_view_all_escalations: permissionChecks.can_view_all_escalations || su,
    can_create_escalation_request: permissionChecks.can_create_escalation_request || su,
    can_cancel_escalation: permissionChecks.can_cancel_escalation || su,
    can_trigger_auto_escalation: permissionChecks.can_trigger_auto_escalation || su,
  };
}