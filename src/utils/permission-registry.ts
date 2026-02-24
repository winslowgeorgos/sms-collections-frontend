// config/permission-registry.ts
// Central place to define what permission(s) each route and navigation item requires.

export type PermissionRequirement =
  | string                // single permission
  | string[]              // any of these
  | { permissions: string | string[]; requireAll?: boolean }; // fine control

// Route-based permissions (exact paths or patterns like '/loans/[id]')
export const routePermissions: Record<string, PermissionRequirement> = {
  // Dashboard
  '/analytics/admin': 'can_view_admin_dashboard',
  '/analytics/officer/[id]': 'can_view_myanalytics', // always true
  '/analytics': 'can_view_sms_analytics',
  '/call_logs': 'can_view_call_analytics',

  // Loans
  '/loans': 'can_view_allmainloan_page',
  '/loans/[id]': 'can_view_loandetails',          // use mapped flag (user has it)
  '/installments/[id]': 'can_view_installment_page', // user has it
  '/loan-processor/unassigned':  'can_view_unassigned_page',
  '/loan-processor/assigned': 'can_view_assigned_page',

  // Call logs
  '/call_logs/all': 'can_view_all_call_logs',
  '/call_logs/my_calls': 'can_view_mycall_logs',
  '/call_logs/follow_up': 'can_view_followup_page',

  // Payment reminders
  '/payment-reminders': 'view_paymentreminder',
  '/repayments/all': 'can_view_all_repayments',
  '/repayments/my-payments': 'view_my_repayments',

  // Customers
  '/flaggedcustomers': 'view_flaggedcustomers',

  // Campaigns
  '/campaigns': 'view_customcampaign',
  '/products': 'view_product',
  '/days': 'view_days',
  '/customrules': 'view_customrule',
  '/logs': 'view_smslog',
  '/template': 'view_template',

  // System
  '/admin/users': ['view_user', 'change_user'],
  '/admin/groups': ['view_group', 'change_group'],
  '/admin/permissions': ['view_permission', 'change_permission'],
  '/analytics/jobs': 'view_scheduledjobexecution',
  '/settings': 'change_scheduledjobconfig',
};

// Navigation item permissions (by label)
export const navItemPermissions: Record<string, PermissionRequirement> = {
  'Collections Dashboard': 'can_view_admin_dashboard',
  'My Analytics': 'can_view_myanalytics',
  'SMS Dashboard': 'can_view_sms_analytics',
  'Call Dashboard': 'can_view_call_analytics',
  'All Loans': 'can_view_allmainloan_page',
  'My Loans': 'can_view_myloans_page',
  'Assigned Loans': 'can_view_assigned_page',
  'Unassigned Loans': { permissions: ['can_view_unassigned_page'], requireAll: true },
  'All Calls': 'can_view_all_call_logs',
  'My Calls': 'can_view_mycall_logs',
  'follow_up Tasks': 'can_view_followup_page',
  'All Reminders': 'view_paymentreminder',
  'All Repayments': 'can_view_all_repayments',
  'My Repayments': 'view_my_repayments',
  'Flagged Customers': 'view_flaggedcustomers',
  'Campaigns': 'view_customcampaign',
  'Products': 'view_product',
  'Days': 'view_days',
  'Custom Rules': 'view_customrule',
  'SMS Logs': 'view_smslog',
  'Templates': 'view_template',
  'User Management': ['view_user', 'change_user'],
  'Group Management': ['view_group', 'change_group'],
  'Permission Management': ['view_permission', 'change_permission'],
  'Job Monitor': 'view_scheduledjobexecution',
  'Settings': 'change_scheduledjobconfig',
};