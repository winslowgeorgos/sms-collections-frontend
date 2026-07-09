
// types/index.ts

export interface Permission {
  id: number;
  name: string;
  codename: string;
  content_type_id: number;
  content_type_name: string;
  content_type_app: string;
}

export interface Role {
  name: string;
  type: string;
  description: string;
}

export interface GroupedPermissions {
  [appName: string]: {
    [modelName: string]: Permission[];
  };
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  date_joined: string;
  last_login: string;
  groups: any[];
  group_names: string[];
  groups_detail: any[];
  user_permissions: any[];
  user_permissions_detail: any[];
  all_permissions: Permission[];
  grouped_permissions: GroupedPermissions;
  permission_codenames: string[];
  role: string;
  roles: Role[];
}

export interface PermissionChecks {
  can_view_all_loans: boolean;
  can_assign_loans: boolean;
  can_export_loans: boolean;
  can_view_installments: boolean;
  can_update_installments: boolean;
  can_view_call_logs: boolean;
  can_create_call_logs: boolean;
  can_manage_users: boolean;
  can_access_admin: boolean;
  is_superuser: boolean;
  [key: string]: boolean; // For dynamic permission checks
}

export interface SystemInfo {
  available_groups: {
    id: number;
    name: string;
    user_count: number;
  }[];
  total_permissions: number;
  total_users: number;
}

export interface Session {
  session_key: string | null;
  is_authenticated: boolean;
  last_activity: string | null;
}

export interface UserDetailsResponse {
  user: User;
  permission_checks: PermissionChecks;
  session: Session;
  system_info: SystemInfo;
  timestamp: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

// export interface User {
//   id: string;
//   username: string;
//   email: string;
// }

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface Product {
  id: string;
  product_name: string;
  product_description: string;
  product_term: number;
  default_days: number;
  is_active: boolean;
  created_at: string;
}

export interface Day {
  id: string;
  day_name: string;
  day_description: string;
  number_of_days: number;
  is_custom: boolean;
  custom_date: string | null;
  custom_rule: string | null;
  is_active: boolean;
}

export interface CustomRule {
  id: string;
  rule_name: string;
  column_name: string;
  operator: string;
  value: string;
  value_2: string | null;
  product: string;
  product_name?: string;
  is_active: boolean;
}

// types.ts - Add these types
export interface Template {
  id: string;
  template_name: string;
  products: Product[];  // Changed from single product to array
  days: Day[];         // Changed from single day to array
  product_ids?: string[];  // For form submission
  day_ids?: string[];      // For form submission
  product_names?: string[]; // For display
  day_names?: string[];     // For display
  template_desc: string;
  scheduled_datetime: string | null;
  is_active: boolean;
  is_campaign_template: boolean; // Added new field
  approved_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TemplateFormData {
  template_name: string;
  product_ids: string[];  // Changed from single product
  day_ids: string[];      // Changed from single day
  template_desc: string;
  scheduled_datetime: string;
  is_active: boolean;
  is_campaign_template: boolean; // Added new field
}

export interface SMSLog {
  id: string;
  template: string;
  template_name?: string;
  template_link?: string;
  customer_name: string;
  phone_number: string;
  message: string;
  status: 'PENDING' | 'SENT' | 'FAILED' | 'DELIVERED' | 'SUCCESS' | 'SCHEDULED';
  status_color?: string;
  error_message: string;
  sent_at: string | null;
  
  // New fields for external integration
  external_id: string | null;
  customer_id: string | null;
  loan_id: string | null;
  product_name: string | null;
  response_description: string | null;
  response_code: string | null;
  installment_number: string | null;
  message_hash: string | null;
  
  // New fields for tracking which specific product/day was used
  used_product: string | null;  // Product ID
  used_product_name: string | null;  // Product name for display
  used_day: string | null;  // Day ID
  used_day_name: string | null;  // Day name for display
  
  // New fields for campaign tracking
  is_from_campaign: boolean;
  campaign: string | null;  // Campaign ID
  campaign_name: string | null;  // Campaign name for display
  
  created_at: string;
  updated_at: string;
  created_by: string | null;
  is_active: boolean;
}

export interface CustomCampaign {
  id: string;
  campaign_name: string;
  template_content: string;
  customer_file: string;
  scheduled_date: string;
  sent_count: number;
  failed_count: number;
  is_active: boolean;
  created_at: string;
}

export interface CollectionsTemplate {
  id: string;
  template_name: string;
  product: {
    id: string;
    name: string;
    description: string;
    default_days: number;
  };
  day: {
    id: string;
    number_of_days: number;
    name: string;
    description: string;
    is_custom: boolean;
    custom_date: string | null;
  };
  rules: CustomRule[];
  template_desc: string;
  is_active: boolean;
  scheduled_datetime: string | null;
}

// export interface TemplateFormData {
//   template_name: string;
//   product: string;
//   day: string;
//   template_desc: string;
//   scheduled_datetime: string;
//   is_active: boolean;
// }

export interface CampaignFormData {
  campaign_name: string;
  template_content: string;
  customer_file: File | null;
  scheduled_date: string;
  is_active: boolean;
}

// types/flagged-customer.ts
export interface FlaggedCustomer {
  id: string;
  phone_number: string;
  customer_name: string;
  reason_for_flagging: string;
  is_active: boolean;
  created_by?: {
    id: string;
    username: string;
  };
  updated_by?: {
    id: string;
    username: string;
  };
  approved_by?: {
    id: string;
    username: string;
  };
  created_at: string;
  updated_at: string;
  created_by_username?: string;
  updated_by_username?: string;
  approved_by_username?: string;
}

// types/index.ts - Add these to your existing types


// types/index.ts - Update MyLoan interface if it exists separately

export interface Loan {
  id: string;
  loan_id: string;
  customer_id: string;
  customer_name: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  full_customer_name: string;
  phone_number: string;
  identity_num: string;
  registration_number: string;
  apply_amount: string;
  total_amount: string;
  disburse_amount: string;
  total_paid: string;
  total_outstanding: string;
  installments_numbers: number;
  paid_installments: number;
  due_installments: number;
  disburse_time: string;
  due_date: string;
  status: number;
  status_text: string;
  current_assigned_officer: number | null;
  current_assigned_officer_details: OfficerDetails | null;
  assigned_by: number | null;
  assigned_by_details: OfficerDetails | null;
  assigned_at: string | null;
  previous_assigned_officer_ids: number[];
  has_current_month_installment: boolean;
  current_month_installments_count: number;
  current_month_total_due: string;
  current_month_cumulative_balance: string;
  is_overdue_status: boolean;
  days_overdue_count: number;
  is_active: boolean;
  active_installment_id: number;
  paybill_number: string;
  loan_provider_name: string;
  current_month_installment_due_date: string;
  created_at: string;
  updated_at: string;
  last_sync_at: string;
  
  // ============ ESCALATION/REPOSSESSION FIELDS ============
  to_repossess: boolean;
  actual_repossessed: boolean;
  repossession_status: string;
  repossession_status_display: string;
  collection_condition: string;
  collection_condition_display: string;
  repossession_marked_at: string | null;
  repossession_completed_at: string | null;
  auto_escalated_at: string | null;
  repossession_notes: string | null;
}

export interface OfficerDetails {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
}

export interface AssignmentMetrics {
  total_assigned_loans: number;
  total_assigned_cumulative_balance: number;
  average_assigned_balance: number;
}

export interface UnAssignmentMetrics {
  total_unassigned_loans: number;
  total_unassigned_cumulative_balance: number;
  average_unassigned_balance: number;
}

export interface AssignedLoan extends Loan {
  current_assigned_officer: number;
  current_assigned_officer_details: OfficerDetails;
  assigned_by: number;
  assigned_by_details: OfficerDetails;
  assigned_at: string;
}

export interface UnassignedLoan extends Loan {
  current_assigned_officer: null;
  current_assigned_officer_details: null;
  assigned_by: null;
  assigned_by_details: null;
  assigned_at: null;
}

export interface MyLoan extends Loan {
  current_assigned_officer: number;
  current_assigned_officer_details: OfficerDetails;
  assigned_by: number;
  assigned_by_details: OfficerDetails;
  assigned_at: string;
}

export interface CallLog {
  id: string;
  main_loan: string;
  installment?: string;
  call_time: string;
  duration_seconds: number;
  phone_number_used: string;
  contact_person: string;
  outcome: string;
  notes?: string;
  customer_attitude: string;
  follow_up_required: boolean;
  follow_up_date?: string;
  created_by_username?: string;
}

export interface PaymentReminder {
  id: string;
  call_log: string;
  main_loan: string;
  installment?: string;
  promised_amount: number;
  promised_date: string;
  payment_method: string;
  follow_up_call_required: boolean;
  status: 'pending' | 'paid' | 'cancelled' | 'overdue';
  notified: boolean;
  notified_at?: string;
  actual_paid_amount?: number;
  actual_paid_date?: string;
  created_at: string;
  updated_at: string;
}
export interface EscalationRecord {
  loan_id: string;
  customer_name: string;
  phone_number: string;
  registration_number: string;
  cumulative_balance: number;
  days_overdue: number;
  to_repossess: boolean;
  repossession_status: string;
  repossession_status_display: string;
  collection_condition: string;
  collection_condition_display: string;
  assigned_officer: string;
  escalation_date: string;
  is_auto_escalated: boolean;
}

export interface EscalationSummary {
  total_escalated: number;
  total_cumulative_balance: number;
  avg_days_overdue: number;
}

export interface EscalationApiResponse {
  loans: EscalationRecord[];
  total_count: number;
  summary: EscalationSummary;
}