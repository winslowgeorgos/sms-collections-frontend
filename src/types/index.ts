export interface User {
  id: string;
  username: string;
  email: string;
}

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