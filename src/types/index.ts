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

export interface Template {
  id: string;
  template_name: string;
  product: string;
  product_name?: string;
  day: string;
  day_name?: string;
  template_desc: string;
  scheduled_datetime: string | null;
  is_active: boolean;
  created_at: string;
}

export interface SMSLog {
  id: string;
  template: string;
  template_name?: string;
  customer_name: string;
  phone_number: string;
  message: string;
  status: 'PENDING' | 'SENT' | 'FAILED' | 'DELIVERED' | 'SUCCESS' | 'SCHEDULED';
  status_color?: string;
  error_message: string;
  sent_at: string | null;
  customer_id: string | null;
  loan_id: string | null;
  product_name: string | null;
  installment_number: string | null;
  created_at: string;
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

export interface TemplateFormData {
  template_name: string;
  product: string;
  day: string;
  template_desc: string;
  scheduled_datetime: string;
  is_active: boolean;
}

export interface CampaignFormData {
  campaign_name: string;
  template_content: string;
  customer_file: File | null;
  scheduled_date: string;
  is_active: boolean;
}