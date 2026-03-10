// app/analytics/admin/page.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { apiClient } from '@/lib/api';
import { usePermissions } from '@/context/permission-context';
import {
  LayoutDashboard, TrendingUp, Users, DollarSign, Clock,
  Calendar, Download, RefreshCw, Filter, Eye,
  AlertCircle, CheckCircle, XCircle,
  Activity, Zap, Target, Award, UserCheck,
  Settings, Play, Pause, RotateCcw, Server,
  HardDrive, Database, Cpu, Globe, Shield,
  TrendingDown, TrendingUp as TrendUp, Percent,
  CreditCard, Wallet, ArrowUpCircle, ArrowDownCircle,
  BarChart3, LineChart as LineChartIcon, Table as TableIcon,
  Grid3x3, List, DownloadCloud, UploadCloud,
  GitCompare, GitMerge, Layers, Boxes,
  Sparkles, Gauge, Radio, Cable,
  FileText, FileSpreadsheet, FileBarChart,
  Briefcase, Building2, Network, Workflow,
  Plus, Edit, Trash2, Copy, ToggleLeft, ToggleRight,
  History, PlayCircle, TestTube, 
} from 'lucide-react';
import Link from 'next/link';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ScatterChart, Scatter, Treemap, Sankey, Funnel, FunnelChart, LabelList
} from 'recharts';

import { ActionGuard } from '@/components/auth/action-guard';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

// Schedule Management Types
interface ScheduleConfig {
  id: string;
  name: string;
  description: string;
  frequency: 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'custom';
  start_hour: number;
  end_hour: number;
  interval_hours: number;
  days_of_week: string;
  days_of_month: string | null;
  page_size: number;
  max_retries: number;
  filter_params: Record<string, any>;
  is_active: boolean;
  last_run: string | null;
  last_run_display: string | null;
  next_run: string | null;
  next_run_display: string | null;
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
  created_at: string;
  updated_at: string;
  created_by: number;
  created_by_details: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
  };
}

interface ScheduleExecution {
  id: string;
  config: string;
  config_name: string;
  status: 'scheduled' | 'running' | 'completed' | 'failed' | 'skipped';
  scheduled_time: string;
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
  duration_formatted: string;
  total_loans_processed: number;
  main_loans_created: number;
  main_loans_updated: number;
  installments_created: number;
  installments_updated: number;
  successful_fetches: number;
  failed_fetches: number;
  processing_speed: number | null;
  memory_usage_mb: number | null;
  error_message: string | null;
  triggered_by: 'system' | 'manual' | 'api';
}

interface ScheduleDetail extends ScheduleConfig {
  metrics: {
    total_executions: number;
    successful: number;
    failed: number;
    success_rate: number;
    avg_duration_seconds: number | null;
  };
  recent_executions: {
    count: number;
    page: number;
    page_size: number;
    total_pages: number;
    results: ScheduleExecution[];
  };
  next_run: string | null;
  last_run: string | null;
}

interface ScheduleStats {
  total_schedules: number;
  active_schedules: number;
  inactive_schedules: number;
  last_30_days: {
    executions: number;
    successful: number;
    failed: number;
    success_rate: number;
    avg_duration_seconds: number | null;
    total_loans_processed: number;
  };
  by_frequency: Array<{
    frequency: string;
    count: number;
  }>;
}

interface FrequencyOption {
  value: string;
  label: string;
  description: string;
}

interface DayOption {
  value: number;
  label: string;
}

// Existing types (keep all your existing interfaces)
interface DashboardSummary {
  loans_summary: {
    total_loans: number;
    active_loans: number;
    total_outstanding: number;
    total_disbursed: number;
    overdue_loans: number;
    loans_due_today: number;
    loans_due_this_month: number;
  };
  installments_summary: {
    total_installments: number;
    daily_installments: number;
    daily_cumulative_balance: number;
    daily_overdue: number;
    overdue: number;
    overdue_cumulative_balance: number;
    paid_off: number;
    partially_paid: number;
    total_balance: number;
    total_cumulative_balance: number;
    total_due_this_month: number;
    average_balance: number;
    average_cumulative_balance: number;
  };
  assignments_summary: {
    total_assignments: number;
    active_assignments: number;
    completed_today: number;
    average_duration: string | null;
  };
  performance_metrics: Record<string, any>;
  recent_activity: Array<{
    type: string;
    loan_id: string;
    customer_name: string;
    assigned_to?: string;
    assigned_by?: string;
    timestamp: string;
    assignment_type?: string;
    amount?: number;
    installment_id?: number;
    cumulative_balance?: number;
  }>;
}

interface OfficerPerformance {
  total_officers: number;
  metrics_date: string;
  performance_data: Array<{
    officer: {
      id: number;
      username: string;
      full_name: string;
      email: string;
    };
    metrics: {
      daily_cumulative_balance: number;
      daily_installments: number;
      daily_overdue: number;
      assigned_installments: number;
      assigned_cumulative_balance: number;
      collected_today: number;
      collected_mtd: number;
      collection_rate: number;
      resolved_today: number;
    };
    trend: {
      dates: string[];
      cumulative_balances: number[];
      collection_rates: number[];
    };
  }>;
  as_of: string;
}

interface CurrentMonthMetrics {
  date: string;
  month_start: string;
  month_end: string;
  days_in_month: number;
  days_passed: number;
  month_progress_percentage: number;
  current_month_cumulative_balance: number;
  current_month_installments_count: number;
  current_month_overdue_count: number;
  current_month_overdue_percentage: number;
  collected_month_to_date: number;
  paid_off_this_month: number;
  remaining_balance: number;
  collection_rate_mtd: number;
  expected_collection_rate: number;
  collection_vs_expected: number;
  average_installment_balance: number;
  enhanced_metrics: {
    pre_payment: {
      count: number;
      total_posted: number;
      total_remained: number;
      total_received: number;
      collection_efficiency: number;
      percentage_of_total: number;
    };
    discounts: {
      count: number;
      total_amount: number;
      percentage_of_total: number;
    };
    daily_trend: Array<{
      date: string;
      collected: number;
      pre_payments: number;
      day_name: string;
    }>;
    collection_quality: {
      reconciled_amount: number;
      reconciled_percentage: number;
      pre_payment_ratio: number;
    };
    projections: {
      projected_month_end: number;
      projected_vs_target: number;
      required_daily_to_meet: number;
      on_track: boolean;
    };
  };
}

interface CurrentWeekMetrics {
  date: string;
  week_start: string;
  week_end: string;
  week_number: number;
  year: number;
  days_passed: number;
  week_progress_percentage: number;
  weekly_target: {
    total_cumulative_balance: number;
    total_installments_count: number;
    average_installment_balance: number;
    overdue_count: number;
    overdue_percentage: number;
  };
  progress: {
    collected_week_to_date: number;
    remaining_in_week: number;
    collection_rate: number;
    paid_off_this_week: number;
    average_daily_collection: number;
    projected_weekly_collection: number;
    projected_vs_target: number;
    on_track: boolean;
  };
  daily_breakdown: Array<{
    date: string;
    day_name: string;
    due_amount: number;
    due_count: number;
    collected: number;
    paid_off_count: number;
    overdue_count: number;
    collection_rate_for_day: number;
  }>;
  enhanced_metrics: {
    pre_payment: {
      count: number;
      total_posted: number;
      total_remained: number;
      percentage_of_week: number;
    };
    discounts: {
      count: number;
      total_amount: number;
      percentage_of_week: number;
    };
    collection_quality: {
      reconciled_amount: number;
      reconciled_percentage: number;
    };
    daily_efficiency: {
      best_day: {
        date: string;
        day_name: string;
        due_amount: number;
        due_count: number;
        collected: number;
        paid_off_count: number;
        overdue_count: number;
        collection_rate_for_day: number;
      };
      worst_day: {
        date: string;
        day_name: string;
        due_amount: number;
        due_count: number;
        collected: number;
        paid_off_count: number;
        overdue_count: number;
        collection_rate_for_day: number;
      };
      average_efficiency: number;
    };
  };
}

interface LoanStatistics {
  total_loans: number;
  active_loans: number;
  assigned_loans: number;
  unassigned_loans: number;
  total_installments: number;
  active_installments: number;
  overdue_installments: number;
  current_month_cumulative_balance: number;
  current_month_installments: number;
  average_cumulative_balance: number;
  timestamp: string;
}

interface CumulativeBalanceHistory {
  period: string;
  data: {
    dates: string[];
    cumulative_balances: number[];
    installment_counts: number[];
    overdue_counts: number[];
    daily_collections: number[];
  };
}

interface JobMetrics {
  period: {
    start: string;
    end: string;
    days: number;
  };
  overall: {
    total_jobs: number;
    total_executions: number;
    successful_executions: number;
    failed_executions: number;
    overall_success_rate: number;
    total_loans_processed: number;
    avg_duration_seconds: number;
    max_duration_seconds: number;
    min_duration_seconds: number;
  };
  job_performance: Array<{
    job_id: number;
    job_name: string;
    total_runs: number;
    successful_runs: number;
    failed_runs: number;
    success_rate: number;
    total_loans_processed: number;
    avg_duration_seconds: number;
  }>;
  generated_at: string;
}

interface JobListResponse {
  count: number;
  jobs: Array<{
    id: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    total_loans: number;
    processed_loans: number;
    successful_fetches: number;
    failed_fetches: number;
    output_file: string | null;
    error_message: string | null;
    filter_params: string;
    started_at: string;
    completed_at: string | null;
    duration_seconds: number | null;
    created_at: string;
    page_size: number;
    max_retries: number;
    progress_percentage: number;
    main_loans_created: number;
    main_loans_updated: number;
    installments_created: number;
    installments_updated: number;
  }>;
}

// Enhanced analytics interfaces
interface LoanDistribution {
  by_status: Array<{ status: string; count: number; amount: number }>;
  by_type: Array<{ type: string; count: number; amount: number }>;
  by_office: Array<{ office: string; count: number; amount: number }>;
  by_officer: Array<{ officer: string; count: number; amount: number }>;
}

interface PaymentPatterns {
  daily_averages: Array<{ day: string; average: number; count: number }>;
  hourly_distribution: Array<{ hour: number; count: number; amount: number }>;
  payment_methods: Array<{ method: string; count: number; amount: number }>;
  early_vs_late: {
    early_payments: { count: number; amount: number };
    on_time: { count: number; amount: number };
    late_payments: { count: number; amount: number };
  };
}

interface PerformanceTrends {
  monthly: Array<{
    month: string;
    collection_rate: number;
    total_collected: number;
    target: number;
    overdue_rate: number;
  }>;
  quarterly: Array<{
    quarter: string;
    collection_rate: number;
    total_collected: number;
    target: number;
    overdue_rate: number;
  }>;
  yearly: Array<{
    year: string;
    collection_rate: number;
    total_collected: number;
    target: number;
    overdue_rate: number;
  }>;
}

interface RiskMetrics {
  overall_risk_score: number;
  risk_distribution: Array<{ level: string; count: number; amount: number }>;
  aging_analysis: Array<{ days: string; count: number; amount: number }>;
  concentration_risk: {
    top_borrowers: Array<{ name: string; amount: number; percentage: number }>;
    top_officers: Array<{ name: string; amount: number; percentage: number }>;
  };
  early_warning_indicators: {
    dti_ratio: number;
    payment_delay_trend: number;
    collection_efficiency_trend: number;
    risk_score_trend: number;
  };
}

interface EfficiencyMetrics {
  officer_efficiency: Array<{
    officer: string;
    calls_made: number;
    promises: number;
    collections: number;
    conversion_rate: number;
    avg_response_time: number;
  }>;
  process_metrics: {
    avg_processing_time: number;
    avg_assignment_time: number;
    avg_collection_time: number;
    automation_rate: number;
  };
  system_performance: {
    api_response_time: number;
    job_queue_length: number;
    error_rate: number;
    uptime_percentage: number;
  };
}

interface CustomerInsights {
  customer_segments: Array<{
    segment: string;
    count: number;
    total_balance: number;
    avg_balance: number;
    collection_rate: number;
  }>;
  repeat_behavior: {
    first_time: { count: number; amount: number };
    repeat: { count: number; amount: number };
    loyal: { count: number; amount: number };
  };
  satisfaction_metrics: {
    nps_score: number;
    complaint_rate: number;
    resolution_time: number;
    feedback_score: number;
  };
}

interface ForecastData {
  next_month: {
    projected_collection: number;
    confidence_interval: { lower: number; upper: number };
    expected_overdue: number;
    risk_factors: string[];
  };
  next_quarter: {
    projected_collection: number;
    confidence_interval: { lower: number; upper: number };
    expected_overdue: number;
    risk_factors: string[];
  };
  trends: Array<{
    period: string;
    actual: number;
    forecast: number;
    lower_bound: number;
    upper_bound: number;
  }>;
}

// Cooldown response interface
interface CooldownStatus {
  trigger_key: string;
  description: string;
  cooldown_minutes: number;
  is_active: boolean;
  last_triggered_at?: string;
  minutes_since_last?: number;
  minutes_remaining?: number;
  next_allowed_at?: string;
  can_bypass: boolean;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'];

export default function AdminAnalyticsDashboard() {
  // State management
  const [activeTab, setActiveTab] = useState('overview');

  const { hasAccess } = usePermissions();

  const canAccessSchedules = hasAccess('change_scheduledjobconfig');
  const canSkipCooldown = hasAccess('skip_schedule_cooldown');
  
  // Schedule Management State
  const [schedules, setSchedules] = useState<ScheduleConfig[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleDetail | null>(null);
  const [scheduleStats, setScheduleStats] = useState<ScheduleStats | null>(null);
  const [frequencyOptions, setFrequencyOptions] = useState<FrequencyOption[]>([]);
  const [dayOptions, setDayOptions] = useState<DayOption[]>([]);
  const [cooldownStatus, setCooldownStatus] = useState<CooldownStatus | null>(null);
  
  // Existing state
  const [dashboardData, setDashboardData] = useState<DashboardSummary | null>(null);
  const [officerPerformance, setOfficerPerformance] = useState<OfficerPerformance | null>(null);
  const [currentMonthMetrics, setCurrentMonthMetrics] = useState<CurrentMonthMetrics | null>(null);
  const [currentWeekMetrics, setCurrentWeekMetrics] = useState<CurrentWeekMetrics | null>(null);
  const [loanStats, setLoanStats] = useState<LoanStatistics | null>(null);
  const [balanceHistory, setBalanceHistory] = useState<CumulativeBalanceHistory | null>(null);
  const [jobMetrics, setJobMetrics] = useState<JobMetrics | null>(null);
  const [recentJobs, setRecentJobs] = useState<JobListResponse | null>(null);

  const [loanDistribution, setLoanDistribution] = useState<LoanDistribution | null>(null);
  const [paymentPatterns, setPaymentPatterns] = useState<PaymentPatterns | null>(null);
  const [performanceTrends, setPerformanceTrends] = useState<PerformanceTrends | null>(null);
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null);
  const [efficiencyMetrics, setEfficiencyMetrics] = useState<EfficiencyMetrics | null>(null);
  const [customerInsights, setCustomerInsights] = useState<CustomerInsights | null>(null);
  const [forecastData, setForecastData] = useState<ForecastData | null>(null);

  // Pagination State for Schedules
  const [schedulePagination, setSchedulePagination] = useState({
    page: 1,
    page_size: 20,
    total_pages: 1,
    total_count: 0
  });

  // UI State
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [selectedView, setSelectedView] = useState<'chart' | 'table' | 'grid'>('chart');
  
  // Modal States
  const [isTriggerJobModalOpen, setIsTriggerJobModalOpen] = useState(false);
  const [isJobDetailsModalOpen, setIsJobDetailsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isScheduleDetailModalOpen, setIsScheduleDetailModalOpen] = useState(false);
  const [isDeleteScheduleModalOpen, setIsDeleteScheduleModalOpen] = useState(false);
  
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel' | 'pdf'>('csv');
  const [scheduleFormData, setScheduleFormData] = useState<Partial<ScheduleConfig>>({
    name: '',
    description: '',
    frequency: 'weekdays',
    start_hour: 7,
    end_hour: 22,
    interval_hours: 2,
    days_of_week: '1,2,3,4,5',
    days_of_month: '',
    page_size: 100,
    max_retries: 3,
    filter_params: {},
    is_active: true
  });
  
  const [triggerFormData, setTriggerFormData] = useState({
    force_refresh: false,
    page_size: 100,
    max_retries: 3,
    name: '',
    registration_number: '',
    identity_num: '',
    loan_statuses: '',
    repeat_client: '',
    loan_type: '',
    office_id: '',
    apply_time_begin: '',
    apply_time_end: '',
    force: false,
    skip_cooldown: false
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scheduleFilter, setScheduleFilter] = useState({
    active: '',
    frequency: '',
    search: ''
  });

  useEffect(() => {
    fetchAllData();
    fetchSchedules();
    fetchScheduleStats();
    fetchFrequencyOptions();
  }, [selectedTimeRange, schedulePagination.page, schedulePagination.page_size]);

  // ============================================================================
  // API Fetch Functions
  // ============================================================================

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchDashboardSummary(),
        fetchOfficerPerformance(),
        fetchCurrentMonthMetrics(),
        fetchCurrentWeekMetrics(),
        fetchLoanStatistics(),
        fetchBalanceHistory(),
        fetchJobMetrics(),
        fetchRecentJobs(),
        fetchLoanDistribution(),
        fetchPaymentPatterns(),
        fetchPerformanceTrends(),
        fetchRiskMetrics(),
        fetchEfficiencyMetrics(),
        fetchCustomerInsights(),
        fetchForecastData()
      ]);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Schedule Management API Calls
// Update these functions in your page.tsx

const fetchSchedules = async (filters?: { active?: string; frequency?: string; search?: string }) => {
  try {
    const client = apiClient.getClient();
    const params = new URLSearchParams({
      page: schedulePagination.page.toString(),
      page_size: schedulePagination.page_size.toString()
    });
    
    if (filters?.active) params.append('active', filters.active);
    if (filters?.frequency) params.append('frequency', filters.frequency);
    if (filters?.search) params.append('search', filters.search);
    if (scheduleFilter.active) params.append('active', scheduleFilter.active);
    if (scheduleFilter.frequency) params.append('frequency', scheduleFilter.frequency);
    if (scheduleFilter.search) params.append('search', scheduleFilter.search);
    
    // CORRECT URL - note: no /schedules/ in the path
    const response = await client.get(`/loan-processor/schedules/?${params.toString()}`);
    
    if (response.data.results) {
      setSchedules(response.data.results);
      setSchedulePagination(prev => ({
        ...prev,
        total_count: response.data.count,
        total_pages: Math.ceil(response.data.count / prev.page_size)
      }));
    } else {
      setSchedules(response.data);
    }
  } catch (error) {
    console.error('Error fetching schedules:', error);
  }
};

const fetchScheduleDetail = async (id: string, isSetModalClosed : boolean | null) => {
  try {
    const client = apiClient.getClient();
    // CORRECT URL - note: /loan-processor/{id}/schedule-detail/
    const response = await client.get(`/loan-processor/${id}/schedule-detail/`);
    setSelectedSchedule(response.data);
    isSetModalClosed === null || isSetModalClosed === false ? setIsScheduleDetailModalOpen(true) : setIsScheduleDetailModalOpen(false);
  } catch (error) {
    console.error('Error fetching schedule detail:', error);
  }
};

const handleUpdateSchedule = async () => {
  if (!selectedSchedule) return;
  setIsSubmitting(true);
  try {
    const client = apiClient.getClient();
    // CORRECT URL - note: /loan-processor/{id}/update-schedule/
    await client.put(`/loan-processor/${selectedSchedule.id}/update-schedule/`, scheduleFormData);
    await fetchSchedules();
    await fetchScheduleDetail(selectedSchedule.id, true);
    setIsScheduleModalOpen(false);
  } catch (error: any) {
    console.error('Error updating schedule:', error);
    alert(error.response?.data?.message || 'Failed to update schedule');
  } finally {
    setIsSubmitting(false);
  }
};

const handleDeleteSchedule = async () => {
  if (!selectedSchedule) return;
  setIsSubmitting(true);
  try {
    const client = apiClient.getClient();
    // CORRECT URL - note: /loan-processor/{id}/delete-schedule/
    await client.delete(`/loan-processor/${selectedSchedule.id}/delete-schedule/`);
    await fetchSchedules();
    await fetchScheduleStats();
    setIsDeleteScheduleModalOpen(false);
    setIsScheduleDetailModalOpen(false);
  } catch (error: any) {
    console.error('Error deleting schedule:', error);
    alert(error.response?.data?.message || 'Failed to delete schedule');
  } finally {
    setIsSubmitting(false);
  }
};

const handleToggleSchedule = async (id: string, currentActive: boolean) => {
  try {
    const client = apiClient.getClient();
    // CORRECT URL - note: /loan-processor/{id}/toggle-schedule/
    await client.post(`/loan-processor/${id}/toggle-schedule/`);
    await fetchSchedules();
    if (selectedSchedule?.id === id) {
      fetchScheduleDetail(id, true);
    }
  } catch (error: any) {
    console.error('Error toggling schedule:', error);
    alert(error.response?.data?.message || 'Failed to toggle schedule');
  }
};

const handleDuplicateSchedule = async (id: string) => {
  try {
    const client = apiClient.getClient();
    // CORRECT URL - note: /loan-processor/{id}/duplicate-schedule/
    const response = await client.post(`/loan-processor/${id}/duplicate-schedule/`);
    await fetchSchedules();
    alert(`Schedule duplicated as "${response.data.schedule.name}"`);
  } catch (error: any) {
    console.error('Error duplicating schedule:', error);
    alert(error.response?.data?.message || 'Failed to duplicate schedule');
  }
};

const handleTestSchedule = async (id: string) => {
  try {
    const client = apiClient.getClient();
    // CORRECT URL - note: /loan-processor/{id}/test-schedule/
    const response = await client.post(`/loan-processor/${id}/test-schedule/`);
    
    const output = response.data.output;
    alert(`Test completed. Check console for output.`);
    console.log('Test output:', output);
  } catch (error: any) {
    console.error('Error testing schedule:', error);
    alert(error.response?.data?.error || 'Failed to test schedule');
  }
};

const fetchExecutionHistory = async (id: string, page = 1) => {
  try {
    const client = apiClient.getClient();
    // CORRECT URL - note: /loan-processor/{id}/execution-history/
    const response = await client.get(`/loan-processor/${id}/execution-history/?page=${page}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching execution history:', error);
    return null;
  }
};

  const fetchScheduleStats = async () => {
    try {
      const client = apiClient.getClient();
      const response = await client.get('/loan-processor/schedule-stats/');
      setScheduleStats(response.data);
    } catch (error) {
      console.error('Error fetching schedule stats:', error);
    }
  };

  const fetchFrequencyOptions = async () => {
    try {
      const client = apiClient.getClient();
      const response = await client.get('/loan-processor/frequency-options/');
      setFrequencyOptions(response.data.frequencies);
      setDayOptions(response.data.days_of_week);
    } catch (error) {
      console.error('Error fetching frequency options:', error);
    }
  };

  const checkCooldown = async (type: 'run_all' | 'config_id' | 'config_name', value?: string) => {
    try {
      const client = apiClient.getClient();
      const params = new URLSearchParams();
      if (type === 'run_all') params.append('run_all', 'true');
      if (type === 'config_id' && value) params.append('config_id', value);
      if (type === 'config_name' && value) params.append('config_name', value);
      
      const response = await client.get(`/loan-processor/check-cooldown/?${params.toString()}`);
      setCooldownStatus(response.data);
      return response.data;
    } catch (error) {
      console.error('Error checking cooldown:', error);
      return null;
    }
  };

  // Existing fetch functions
  const fetchDashboardSummary = async () => {
    try {
      const client = apiClient.getClient();
      const response = await client.get('/loan-processor/dashboard/');
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard summary:', error);
    }
  };

  const fetchOfficerPerformance = async () => {
    try {
      const client = apiClient.getClient();
      const response = await client.get('/loan-processor/officer-performance/');
      setOfficerPerformance(response.data);
    } catch (error) {
      console.error('Error fetching officer performance:', error);
    }
  };

  const fetchCurrentMonthMetrics = async () => {
    try {
      const client = apiClient.getClient();
      const response = await client.get('/loan-processor/metrics/current-month/');
      setCurrentMonthMetrics(response.data);
    } catch (error) {
      console.error('Error fetching current month metrics:', error);
    }
  };

  const fetchCurrentWeekMetrics = async () => {
    try {
      const client = apiClient.getClient();
      const response = await client.get('/loan-processor/metrics/current-week/');
      setCurrentWeekMetrics(response.data);
    } catch (error) {
      console.error('Error fetching current week metrics:', error);
    }
  };

  const fetchLoanStatistics = async () => {
    try {
      const client = apiClient.getClient();
      const response = await client.get('/loan-processor/loan_statistics/');
      setLoanStats(response.data);
    } catch (error) {
      console.error('Error fetching loan statistics:', error);
    }
  };

  const fetchBalanceHistory = async () => {
    try {
      const days = selectedTimeRange === '7d' ? 7 : selectedTimeRange === '30d' ? 30 : selectedTimeRange === '90d' ? 90 : 365;
      const client = apiClient.getClient();
      const response = await client.get(`/loan-processor/cumulative_balance_history/?days=${days}`);
      setBalanceHistory(response.data);
    } catch (error) {
      console.error('Error fetching balance history:', error);
    }
  };

  const fetchJobMetrics = async () => {
    try {
      const days = selectedTimeRange === '7d' ? 7 : selectedTimeRange === '30d' ? 30 : selectedTimeRange === '90d' ? 90 : 365;
      const client = apiClient.getClient();
      const response = await client.get(`/loan-processor/job-metrics/?period=daily&days=${days}`);
      setJobMetrics(response.data);
    } catch (error) {
      console.error('Error fetching job metrics:', error);
    }
  };

  const fetchRecentJobs = async () => {
    try {
      const client = apiClient.getClient();
      const response = await client.get('/loan-processor/list_jobs/?status=all&limit=10');
      setRecentJobs(response.data);
    } catch (error) {
      console.error('Error fetching recent jobs:', error);
    }
  };

  const fetchLoanDistribution = async () => {
    try {
      const client = apiClient.getClient();
      const response = await client.get('/loan-processor/analytics/loan-distribution/');
      setLoanDistribution(response.data);
    } catch (error) {
      console.error('Error fetching loan distribution:', error);
    }
  };

  const fetchPaymentPatterns = async () => {
    try {
      const client = apiClient.getClient();
      const response = await client.get('/loan-processor/analytics/payment-patterns/');
      setPaymentPatterns(response.data);
    } catch (error) {
      console.error('Error fetching payment patterns:', error);
    }
  };

  const fetchPerformanceTrends = async () => {
    try {
      const client = apiClient.getClient();
      const response = await client.get('/loan-processor/analytics/performance-trends/');
      setPerformanceTrends(response.data);
    } catch (error) {
      console.error('Error fetching performance trends:', error);
    }
  };

  const fetchRiskMetrics = async () => {
    try {
      const client = apiClient.getClient();
      const response = await client.get('/loan-processor/analytics/risk-metrics/');
      setRiskMetrics(response.data);
    } catch (error) {
      console.error('Error fetching risk metrics:', error);
    }
  };

  const fetchEfficiencyMetrics = async () => {
    try {
      const client = apiClient.getClient();
      const response = await client.get('/loan-processor/analytics/efficiency-metrics/');
      setEfficiencyMetrics(response.data);
    } catch (error) {
      console.error('Error fetching efficiency metrics:', error);
    }
  };

  const fetchCustomerInsights = async () => {
    try {
      const client = apiClient.getClient();
      const response = await client.get('/loan-processor/analytics/customer-insights/');
      setCustomerInsights(response.data);
    } catch (error) {
      console.error('Error fetching customer insights:', error);
    }
  };

  const fetchForecastData = async () => {
    try {
      const client = apiClient.getClient();
      const response = await client.get('/loan-processor/analytics/forecast/');
      setForecastData(response.data);
    } catch (error) {
      console.error('Error fetching forecast data:', error);
    }
  };

  // ============================================================================
  // Action Handlers
  // ============================================================================

  const handleCreateSchedule = async () => {
    setIsSubmitting(true);
    try {
      const client = apiClient.getClient();
      await client.post('/loan-processor/create-schedule/', scheduleFormData);
      await fetchSchedules();
      await fetchScheduleStats();
      setIsScheduleModalOpen(false);
      resetScheduleForm();
    } catch (error: any) {
      console.error('Error creating schedule:', error);
      alert(error.response?.data?.message || 'Failed to create schedule');
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleTriggerJob = async () => {
    setIsSubmitting(true);
    try {
      const client = apiClient.getClient();
      
      // Check cooldown first
      const cooldown = await checkCooldown('run_all');
      if (cooldown?.is_active && !triggerFormData.skip_cooldown && !triggerFormData.force) {
        alert(`Cooldown active. Please wait ${cooldown.minutes_remaining} minutes or use force/skip_cooldown.`);
        setIsSubmitting(false);
        return;
      }

      const payload: any = {
        run_all: true,
        force: triggerFormData.force,
        skip_cooldown: triggerFormData.skip_cooldown,
        skip_repayments: false,
        page_size: triggerFormData.page_size,
        max_retries: triggerFormData.max_retries,
      };
      
      if (triggerFormData.name) payload.name = triggerFormData.name;
      if (triggerFormData.registration_number) payload.registration_number = triggerFormData.registration_number;
      if (triggerFormData.identity_num) payload.identity_num = triggerFormData.identity_num;
      if (triggerFormData.loan_statuses) payload.loan_statuses = triggerFormData.loan_statuses;
      if (triggerFormData.repeat_client) payload.repeat_client = parseInt(triggerFormData.repeat_client);
      if (triggerFormData.loan_type) payload.loan_type = parseInt(triggerFormData.loan_type);
      if (triggerFormData.office_id) payload.office_id = triggerFormData.office_id;
      if (triggerFormData.apply_time_begin) payload.apply_time_begin = new Date(triggerFormData.apply_time_begin).toISOString();
      if (triggerFormData.apply_time_end) payload.apply_time_end = new Date(triggerFormData.apply_time_end).toISOString();

      const response = await client.post('/loan-processor/trigger-scheduled-command/', payload);
      
      const message = response.data.status_flags?.length 
        ? `Job triggered! Flags: ${response.data.status_flags.join(', ')}`
        : 'Job triggered successfully!';
      
      alert(message);
      setIsTriggerJobModalOpen(false);
      fetchRecentJobs();
      resetTriggerForm();
    } catch (error: any) {
      console.error('Error triggering job:', error);
      if (error.response?.status === 429) {
        alert(error.response.data.message);
      } else {
        alert(error.response?.data?.error || 'Failed to trigger job. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTriggerSpecificJob = async (type: 'config_id' | 'config_name', value: string) => {
    setIsSubmitting(true);
    try {
      const client = apiClient.getClient();
      
      // Check cooldown
      const cooldown = await checkCooldown(type, value);
      if (cooldown?.is_active && !triggerFormData.skip_cooldown && !triggerFormData.force) {
        alert(`Cooldown active. Please wait ${cooldown.minutes_remaining} minutes.`);
        setIsSubmitting(false);
        return;
      }

      const payload: any = {
        [type]: value,
        force: triggerFormData.force,
        skip_cooldown: triggerFormData.skip_cooldown,
        skip_repayments: false
      };

      const response = await client.post('/loan-processor/trigger-scheduled-command/', payload);
      alert(`Job triggered successfully!`);
      fetchRecentJobs();
    } catch (error: any) {
      console.error('Error triggering job:', error);
      if (error.response?.status === 429) {
        alert(error.response.data.message);
      } else {
        alert(error.response?.data?.error || 'Failed to trigger job');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearCooldown = async (type: 'run_all' | 'config_id' | 'config_name', value?: string) => {
    if (!confirm('Are you sure you want to clear the cooldown? This action is logged.')) return;
    
    try {
      const client = apiClient.getClient();
      const payload: any = {};
      if (type === 'run_all') payload.run_all = true;
      if (type === 'config_id' && value) payload.config_id = value;
      if (type === 'config_name' && value) payload.config_name = value;
      
      await client.post('/loan-processor/clear-cooldown/', payload);
      alert('Cooldown cleared successfully');
      if (type === 'run_all') {
        checkCooldown('run_all');
      }
    } catch (error: any) {
      console.error('Error clearing cooldown:', error);
      alert(error.response?.data?.error || 'Failed to clear cooldown');
    }
  };

  const handleTriggerRepaymentProcessing = async () => {
    setIsSubmitting(true);
    try {
      const client = apiClient.getClient();
      const response = await client.post('/loan-processor/trigger_repayment_processing/');
      alert(response.data.message);
      setIsTriggerJobModalOpen(false);
      fetchRecentJobs();
    } catch (error) {
      console.error('Error triggering repayment processing:', error);
      alert('Failed to trigger repayment processing. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateMetrics = async () => {
    try {
      const client = apiClient.getClient();
      const response = await client.post('/loan-processor/generate_metrics_now/');
      alert(response.data.message);
      fetchAllData();
    } catch (error) {
      console.error('Error generating metrics:', error);
    }
  };

  const handleExportData = async () => {
    try {
      const client = apiClient.getClient();
      const response = await client.get(`/loan-processor/analytics/export/?format=${exportFormat}&period=${selectedTimeRange}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `analytics-export-${new Date().toISOString().split('T')[0]}.${exportFormat}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setIsExportModalOpen(false);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Failed to export data. Please try again.');
    }
  };

  // Utility functions
  const resetScheduleForm = () => {
    setScheduleFormData({
      name: '',
      description: '',
      frequency: 'weekdays',
      start_hour: 7,
      end_hour: 22,
      interval_hours: 2,
      days_of_week: '1,2,3,4,5',
      days_of_month: '',
      page_size: 100,
      max_retries: 3,
      filter_params: {},
      is_active: true
    });
  };

  const resetTriggerForm = () => {
    setTriggerFormData({
      force_refresh: false,
      page_size: 100,
      max_retries: 3,
      name: '',
      registration_number: '',
      identity_num: '',
      loan_statuses: '',
      repeat_client: '',
      loan_type: '',
      office_id: '',
      apply_time_begin: '',
      apply_time_end: '',
      force: false,
      skip_cooldown: false
    });
  };

  const editSchedule = (schedule: ScheduleConfig) => {
    setScheduleFormData({
      name: schedule.name,
      description: schedule.description || '',
      frequency: schedule.frequency,
      start_hour: schedule.start_hour,
      end_hour: schedule.end_hour,
      interval_hours: schedule.interval_hours,
      days_of_week: schedule.days_of_week,
      days_of_month: schedule.days_of_month || '',
      page_size: schedule.page_size,
      max_retries: schedule.max_retries,
      filter_params: schedule.filter_params || {},
      is_active: schedule.is_active
    });
    fetchScheduleDetail(schedule.id, true)
    setIsScheduleModalOpen(true);
  };

  const formatCurrency = (value: number) => `KSh ${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  const formatNumber = (value: number) => value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const formatPercent = (value: number) => `${value.toFixed(1)}%`;
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();
  const formatDateTime = (dateString: string) => new Date(dateString).toLocaleString();
  const formatDuration = (seconds: number) => {
    if (!seconds) return 'N/A';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`;
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'scheduled': return 'bg-purple-100 text-purple-800';
      case 'skipped': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getRiskColor = (score: number) => {
    if (score < 30) return 'text-green-600 bg-green-100';
    if (score < 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">Loading analytics dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Collections Dashboard</h1>
          <p className="text-gray-600 mt-2">Comprehensive analytics and insights for collections performance</p>
        </div>

        <div className="flex space-x-3">
          {/* Time Range Selector */}
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            {(['7d', '30d', '90d', '1y'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setSelectedTimeRange(range)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  selectedTimeRange === range
                    ? 'bg-white text-gray-900 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {range === '7d' ? '7D' : range === '30d' ? '30D' : range === '90d' ? '90D' : '1Y'}
              </button>
            ))}
          </div>

          {/* View Toggle */}
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setSelectedView('chart')}
              className={`p-2 rounded-md transition-colors ${
                selectedView === 'chart' ? 'bg-white text-gray-900 shadow' : 'text-gray-600'
              }`}
              title="Chart View"
            >
              <BarChart3 size={16} />
            </button>
            <button
              onClick={() => setSelectedView('table')}
              className={`p-2 rounded-md transition-colors ${
                selectedView === 'table' ? 'bg-white text-gray-900 shadow' : 'text-gray-600'
              }`}
              title="Table View"
            >
              <TableIcon size={16} />
            </button>
            <button
              onClick={() => setSelectedView('grid')}
              className={`p-2 rounded-md transition-colors ${
                selectedView === 'grid' ? 'bg-white text-gray-900 shadow' : 'text-gray-600'
              }`}
              title="Grid View"
            >
              <Grid3x3 size={16} />
            </button>
          </div>

          {/* Action Buttons */}
          <ActionGuard requirement="can_export_data" fallback={null}>
            <Button variant="outline" onClick={() => setIsExportModalOpen(true)}>
              <DownloadCloud size={20} className="mr-2" />
              Export
            </Button>
          </ActionGuard>
          <ActionGuard requirement="can_generate_metrics" fallback={null}>
            <Button variant="outline" onClick={handleGenerateMetrics}>
              <Zap size={20} className="mr-2" />
              Generate
            </Button>
          </ActionGuard>
          <ActionGuard requirement="can_trigger_scheduled_job" fallback={null}>
            <Button variant="outline" onClick={() => setIsTriggerJobModalOpen(true)}>
              <Play size={20} className="mr-2" />
              Trigger Job
            </Button>
          </ActionGuard>
          <ActionGuard requirement="can_trigger_repayment_processing" fallback={null}>
            <Button variant="outline" onClick={handleTriggerRepaymentProcessing} disabled={isSubmitting}>
              <Play size={20} className="mr-2" />
              Trigger Repayment
            </Button>
          </ActionGuard>
          <Button variant="outline" onClick={fetchAllData}>
            <RefreshCw size={20} className="mr-2" />
            Refresh
          </Button>
        </div>
      </div>


      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 lg:grid-cols-6 gap-2">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <LayoutDashboard size={16} />
            <span>Overview</span>
          </TabsTrigger>
          { canAccessSchedules && (

            <TabsTrigger value="schedules" className="flex items-center space-x-2">
            <Calendar size={16} />
            <span>Schedules</span>
              </TabsTrigger>
            )}
        
          <TabsTrigger value="performance" className="flex items-center space-x-2">
            <TrendingUp size={16} />
            <span>Performance</span>
          </TabsTrigger>
          <TabsTrigger value="risk" className="flex items-center space-x-2">
            <Shield size={16} />
            <span>Risk Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="efficiency" className="flex items-center space-x-2">
            <Gauge size={16} />
            <span>Efficiency</span>
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center space-x-2">
            <Sparkles size={16} />
            <span>Insights & Forecast</span>
          </TabsTrigger>
        </TabsList>

        {/* Schedules Tab */}
        <TabsContent value="schedules" className="space-y-6">
          
      {/* Schedule Stats Cards */}
      {scheduleStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="rounded-full bg-blue-100 p-3 mr-4">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Schedules</p>
                  <p className="text-2xl font-bold">{scheduleStats.total_schedules}</p>
                  <p className="text-xs text-gray-500">
                    Active: {scheduleStats.active_schedules} · Inactive: {scheduleStats.inactive_schedules}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="rounded-full bg-green-100 p-3 mr-4">
                  <Activity className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Executions (30d)</p>
                  <p className="text-2xl font-bold">{scheduleStats.last_30_days.executions}</p>
                  <p className="text-xs text-gray-500">
                    Success: {formatPercent(scheduleStats.last_30_days.success_rate)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="rounded-full bg-purple-100 p-3 mr-4">
                  <Database className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Loans Processed</p>
                  <p className="text-2xl font-bold">{formatNumber(scheduleStats.last_30_days.total_loans_processed)}</p>
                  <p className="text-xs text-gray-500">Last 30 days</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="rounded-full bg-yellow-100 p-3 mr-4">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Avg Duration</p>
                  <p className="text-2xl font-bold">
                    {formatDuration(scheduleStats.last_30_days.avg_duration_seconds || 0)}
                  </p>
                  <p className="text-xs text-gray-500">Per execution</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold flex items-center">
                  <Calendar className="mr-2 h-5 w-5 text-blue-600" />
                  Job Schedules
                </h2>
                <div className="flex space-x-2">
                  {/* Filters */}
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="Search schedules..."
                      value={scheduleFilter.search}
                      onChange={(e) => {
                        setScheduleFilter(prev => ({ ...prev, search: e.target.value }));
                        setSchedulePagination(prev => ({ ...prev, page: 1 }));
                        fetchSchedules({ ...scheduleFilter, search: e.target.value });
                      }}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                    />
                    <select
                      value={scheduleFilter.active}
                      onChange={(e) => {
                        setScheduleFilter(prev => ({ ...prev, active: e.target.value }));
                        setSchedulePagination(prev => ({ ...prev, page: 1 }));
                        fetchSchedules({ ...scheduleFilter, active: e.target.value });
                      }}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">All Status</option>
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                    <select
                      value={scheduleFilter.frequency}
                      onChange={(e) => {
                        setScheduleFilter(prev => ({ ...prev, frequency: e.target.value }));
                        setSchedulePagination(prev => ({ ...prev, page: 1 }));
                        fetchSchedules({ ...scheduleFilter, frequency: e.target.value });
                      }}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">All Frequencies</option>
                      {frequencyOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <ActionGuard requirement="change_scheduledjobconfig" fallback={null}>
                    <Button onClick={() => {
                      resetScheduleForm();
                      setIsScheduleModalOpen(true);
                    }}>
                      <Plus size={16} className="mr-2" />
                      New Schedule
                    </Button>
                  </ActionGuard>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Name</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Frequency</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Schedule</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Next Run</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Runs</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Success Rate</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Status</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedules.map((schedule) => (
                      <tr key={schedule.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <button
                            onClick={() => fetchScheduleDetail(schedule.id, false)}
                            className="text-blue-600 hover:text-blue-800 font-medium text-left"
                          >
                            {schedule.name}
                          </button>
                          {schedule.description && (
                            <p className="text-xs text-gray-500 mt-1">{schedule.description}</p>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                            {frequencyOptions.find(f => f.value === schedule.frequency)?.label || schedule.frequency}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <div>{schedule.start_hour}:00 - {schedule.end_hour}:00</div>
                          <div className="text-xs text-gray-500">Every {schedule.interval_hours}h</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm">{schedule.next_run_display || 'N/A'}</div>
                          {schedule.next_run && (
                            <div className="text-xs text-gray-500">{formatDateTime(schedule.next_run)}</div>
                          )}
                        </td>
                        <td className="text-right py-3 px-4">
                          <span className="font-medium">{schedule.total_runs}</span>
                        </td>
                        <td className="text-right py-3 px-4">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            schedule.total_runs > 0 
                              ? (schedule.successful_runs / schedule.total_runs) >= 0.9 
                                ? 'bg-green-100 text-green-800'
                                : (schedule.successful_runs / schedule.total_runs) >= 0.7
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {schedule.total_runs > 0 
                              ? formatPercent((schedule.successful_runs / schedule.total_runs) * 100)
                              : 'N/A'}
                          </span>
                        </td>
                        <td className="text-center py-3 px-4">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            schedule.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {schedule.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="text-center py-3 px-4">
                          <div className="flex justify-center space-x-2">
                            <ActionGuard requirement="change_scheduledjobconfig" fallback={null}>
                              <button
                                onClick={() => handleToggleSchedule(schedule.id, schedule.is_active)}
                                className="p-1 hover:bg-gray-100 rounded"
                                title={schedule.is_active ? 'Deactivate' : 'Activate'}
                              >
                                {schedule.is_active ? (
                                  <Pause size={16} className="text-yellow-600" />
                                ) : (
                                  <Play size={16} className="text-green-600" />
                                )}
                              </button>
                              <button
                                onClick={() => editSchedule(schedule)}
                                className="p-1 hover:bg-gray-100 rounded"
                                title="Edit"
                              >
                                <Edit size={16} className="text-blue-600" />
                              </button>
                              <button
                                onClick={() => handleDuplicateSchedule(schedule.id,)}
                                className="p-1 hover:bg-gray-100 rounded"
                                title="Duplicate"
                              >
                                <Copy size={16} className="text-purple-600" />
                              </button>
                              <button
                                onClick={() => handleTestSchedule(schedule.id)}
                                className="p-1 hover:bg-gray-100 rounded"
                                title="Test (Dry Run)"
                              >
                                <TestTube size={16} className="text-orange-600" />
                              </button>
                              <button
                                onClick={() => {
                                  fetchScheduleDetail(schedule.id, false);
                                  setIsDeleteScheduleModalOpen(true);
                                }}
                                className="p-1 hover:bg-gray-100 rounded"
                                title="Delete"
                              >
                                <Trash2 size={16} className="text-red-600" />
                              </button>
                            </ActionGuard>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {schedulePagination.total_pages > 1 && (
                <div className="flex justify-between items-center mt-4">
                  <div className="text-sm text-gray-600">
                    Showing {((schedulePagination.page - 1) * schedulePagination.page_size) + 1} to{' '}
                    {Math.min(schedulePagination.page * schedulePagination.page_size, schedulePagination.total_count)} of{' '}
                    {schedulePagination.total_count} results
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSchedulePagination(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={schedulePagination.page <= 1}
                    >
                      Previous
                    </Button>
                    <span className="px-3 py-1 text-sm">
                      Page {schedulePagination.page} of {schedulePagination.total_pages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSchedulePagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={schedulePagination.page >= schedulePagination.total_pages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cooldown Status */}
          {cooldownStatus && cooldownStatus.is_active && (
            <Card className="bg-yellow-50">
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-yellow-600 mr-2" />
                    <span className="text-yellow-800">
                      Cooldown active for {cooldownStatus.description}: {cooldownStatus.minutes_remaining} minutes remaining
                    </span>
                  </div>
                  {cooldownStatus.can_bypass && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleClearCooldown('run_all')}
                    >
                      Clear Cooldown
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="rounded-full bg-blue-100 p-3 mr-4">
                    <DollarSign className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Current Month Target</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(currentMonthMetrics?.current_month_cumulative_balance || 0)}
                    </p>
                    <p className="text-xs text-gray-500">
                      Collected: {formatCurrency(currentMonthMetrics?.collected_month_to_date || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="rounded-full bg-red-100 p-3 mr-4">
                    <AlertCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Assigned Loans</p>
                    <p className="text-2xl font-bold">{formatNumber(loanStats?.assigned_loans || 0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="rounded-full bg-green-100 p-3 mr-4">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Collection Rate (MTD)</p>
                    <p className="text-2xl font-bold">
                      {formatPercent(currentMonthMetrics?.collection_rate_mtd || 0)}
                    </p>
                    <p className="text-xs text-gray-500">
                      vs Expected: {formatPercent(currentMonthMetrics?.expected_collection_rate || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="rounded-full bg-purple-100 p-3 mr-4">
                    <Target className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Month Progress</p>
                    <p className="text-2xl font-bold">
                      {formatPercent(currentMonthMetrics?.month_progress_percentage || 0)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {currentMonthMetrics?.days_passed || 0}/{currentMonthMetrics?.days_in_month || 0} days
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Month & Week Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Month Metrics */}
            {currentMonthMetrics && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold flex items-center">
                      <Calendar className="mr-2 h-5 w-5 text-blue-600" />
                      Current Month Performance
                    </h2>
                    <span className={`px-3 py-1 text-sm rounded-full ${
                      currentMonthMetrics?.enhanced_metrics?.projections?.on_track 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {currentMonthMetrics?.enhanced_metrics?.projections?.on_track ? 'On Track' : 'Behind Target'}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Collection Progress</span>
                        <span className="font-medium">
                          {formatCurrency(currentMonthMetrics?.collected_month_to_date)} / {formatCurrency(currentMonthMetrics?.current_month_cumulative_balance)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full ${
                            currentMonthMetrics?.collection_rate_mtd >= currentMonthMetrics?.expected_collection_rate
                              ? 'bg-green-600'
                              : currentMonthMetrics?.collection_rate_mtd >= currentMonthMetrics?.expected_collection_rate * 0.7
                              ? 'bg-yellow-600'
                              : 'bg-red-600'
                          }`}
                          style={{ width: `${Math.min(currentMonthMetrics?.collection_rate_mtd, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Key Metrics Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500">Remaining Balance</p>
                        <p className="text-lg font-semibold">{formatCurrency(currentMonthMetrics?.remaining_balance)}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500">Prepayments Unreconciled</p>
                        <p className="text-lg font-semibold">{formatCurrency(currentMonthMetrics?.enhanced_metrics?.pre_payment?.total_remained)}</p>
                      </div>
                    </div>

                    {/* Enhanced Metrics */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-2 bg-blue-50 rounded-lg">
                        <p className="text-xs text-blue-600">Pre-payments</p>
                        <p className="font-semibold">{formatCurrency(currentMonthMetrics?.enhanced_metrics?.pre_payment?.total_received)}</p>
                        <p className="text-xs text-blue-500">{currentMonthMetrics?.enhanced_metrics?.pre_payment?.percentage_of_total?.toFixed(1)}%</p>
                      </div>
                      <div className="text-center p-2 bg-purple-50 rounded-lg">
                        <p className="text-xs text-purple-600">Discounts</p>
                        <p className="font-semibold">{formatCurrency(currentMonthMetrics?.enhanced_metrics?.discounts?.total_amount)}</p>
                        <p className="text-xs text-purple-500">{currentMonthMetrics?.enhanced_metrics?.discounts?.percentage_of_total?.toFixed(1)}%</p>
                      </div>
                      <div className="text-center p-2 bg-green-50 rounded-lg">
                        <p className="text-xs text-green-600">Reconciled</p>
                        <p className="font-semibold">{formatPercent(currentMonthMetrics?.enhanced_metrics?.collection_quality?.reconciled_percentage)}</p>
                      </div>
                    </div>

                    {/* Daily Trend Mini Chart */}
                    <div className="h-24">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={currentMonthMetrics?.enhanced_metrics?.daily_trend?.slice(-7)}>
                          <Area type="monotone" dataKey="collected" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                          <Area type="monotone" dataKey="pre_payments" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.3} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Projections */}
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-blue-800 mb-2">Month End Projection</p>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-blue-700">Projected Collection</span>
                          <span className="font-medium">{formatCurrency(currentMonthMetrics?.enhanced_metrics?.projections?.projected_month_end)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-blue-700">vs Target</span>
                          <span className={`font-medium ${currentMonthMetrics?.enhanced_metrics?.projections?.projected_vs_target >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(currentMonthMetrics?.enhanced_metrics?.projections?.projected_vs_target)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-blue-700">Daily Required</span>
                          <span className="font-medium">{formatCurrency(currentMonthMetrics?.enhanced_metrics?.projections?.required_daily_to_meet)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Week Metrics */}
            {currentWeekMetrics && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold flex items-center">
                      <Activity className="mr-2 h-5 w-5 text-green-600" />
                      Current Week Performance
                    </h2>
                    <span className={`px-3 py-1 text-sm rounded-full ${
                      currentWeekMetrics?.progress?.on_track ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      Week {currentWeekMetrics?.week_number} - {currentWeekMetrics?.progress?.on_track ? 'On Track' : 'Behind'}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Week Progress */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500">Week Target</p>
                        <p className="text-lg font-semibold">{formatCurrency(currentWeekMetrics?.weekly_target?.total_cumulative_balance)}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500">Collected</p>
                        <p className="text-lg font-semibold text-green-600">{formatCurrency(currentWeekMetrics?.progress?.collected_week_to_date)}</p>
                      </div>
                    </div>

                    {/* Collection Rate */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Collection Rate</span>
                        <span className="font-medium">{formatPercent(currentWeekMetrics?.progress?.collection_rate)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${Math.min(currentWeekMetrics?.progress?.collection_rate, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Best/Worst Days */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-green-50 p-2 rounded">
                        <p className="text-xs text-green-700">Best Day</p>
                        <p className="font-medium text-sm">{currentWeekMetrics?.enhanced_metrics?.daily_efficiency?.best_day?.day_name}</p>
                        <p className="text-xs text-green-600">
                          {formatPercent(currentWeekMetrics?.enhanced_metrics?.daily_efficiency?.best_day?.collection_rate_for_day)}
                        </p>
                      </div>
                      <div className="bg-red-50 p-2 rounded">
                        <p className="text-xs text-red-700">Worst Day</p>
                        <p className="font-medium text-sm">{currentWeekMetrics?.enhanced_metrics?.daily_efficiency?.worst_day?.day_name}</p>
                        <p className="text-xs text-red-600">
                          {formatPercent(currentWeekMetrics?.enhanced_metrics?.daily_efficiency?.worst_day?.collection_rate_for_day)}
                        </p>
                      </div>
                    </div>

                    {/* Daily Breakdown List */}
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Daily Breakdown</p>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {currentWeekMetrics?.daily_breakdown?.map((day) => (
                          <div key={day?.date} className="flex items-center justify-between text-sm p-1 hover:bg-gray-50 rounded">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium w-20">{day?.day_name}</span>
                              <span className="text-xs text-gray-500">{day?.date}</span>
                            </div>
                            <div className="flex items-center space-x-3">
                              <span className="text-gray-600 text-xs">{formatCurrency(day?.due_amount)}</span>
                              <span className={day?.collected > 0 ? 'text-green-600 font-medium' : 'text-gray-400'}>
                                {formatCurrency(day?.collected)}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                day?.collection_rate_for_day >= 80 ? 'bg-green-100 text-green-800' :
                                day?.collection_rate_for_day >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {formatPercent(day?.collection_rate_for_day)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Week Projection */}
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-purple-800">Projected Weekly</span>
                        <span className="font-medium">{formatCurrency(currentWeekMetrics?.progress?.projected_weekly_collection)}</span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-sm text-purple-800">vs Target</span>
                        <span className={`font-medium ${
                          currentWeekMetrics?.progress?.projected_vs_target >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(currentWeekMetrics?.progress?.projected_vs_target)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Loan Distribution Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <h3 className="text-md font-semibold">Loan Status Distribution</h3>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Active', value: loanStats?.active_loans || 0 },
                          { name: 'Overdue', value: dashboardData?.loans_summary?.overdue_loans || 0 },
                          { name: 'Assigned', value: loanStats?.assigned_loans || 0 },
                          { name: 'Unassigned', value: loanStats?.unassigned_loans || 0 }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                        label
                      >
                        {COLORS.map((color, index) => (
                          <Cell key={`cell-${index}`} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Active Loans</p>
                    <p className="font-semibold">{formatNumber(loanStats?.active_loans || 0)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Overdue %</p>
                    <p className="font-semibold text-red-600">
                      {formatPercent((dashboardData?.loans_summary?.overdue_loans || 0) / (loanStats?.total_loans || 1) * 100)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-md font-semibold">Installment Status</h3>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Paid Off', value: dashboardData?.installments_summary?.paid_off || 0 },
                          { name: 'Partially Paid', value: dashboardData?.installments_summary?.partially_paid || 0 },
                          { name: 'Overdue', value: dashboardData?.installments_summary?.overdue || 0 },
                          { name: 'Current', value: (dashboardData?.installments_summary?.total_installments || 0) - 
                            (dashboardData?.installments_summary?.paid_off || 0) - 
                            (dashboardData?.installments_summary?.partially_paid || 0) - 
                            (dashboardData?.installments_summary?.overdue || 0) }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                        label
                      >
                        {COLORS.map((color, index) => (
                          <Cell key={`cell-${index}`} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-md font-semibold">Collection Quality</h3>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Reconciled', value: currentMonthMetrics?.enhanced_metrics?.collection_quality?.reconciled_amount || 0 },
                          { name: 'Pre-payments', value: currentMonthMetrics?.enhanced_metrics?.pre_payment?.total_received || 0 },
                          { name: 'Regular', value: (currentMonthMetrics?.collected_month_to_date || 0) - 
                            (currentMonthMetrics?.enhanced_metrics?.pre_payment?.total_received || 0) }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                        label
                      >
                        {COLORS.map((color, index) => (
                          <Cell key={`cell-${index}`} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cumulative Balance Trend */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Cumulative Balance Trend</h2>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {balanceHistory && balanceHistory?.data?.dates?.length > 0 && (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={balanceHistory?.data?.dates?.map((date, index) => ({
                      date,
                      balance: balanceHistory?.data?.cumulative_balances[index],
                      installments: balanceHistory?.data?.installment_counts[index],
                      overdue: balanceHistory?.data?.overdue_counts[index],
                      collections: balanceHistory?.data?.daily_collections?.[index] || 0
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip 
                        formatter={(value: any, name: string) => {
                          if (name === 'balance' || name === 'collections') return formatCurrency(value);
                          return value;
                        }}
                      />
                      <Legend />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="balance"
                        name="Cumulative Balance"
                        stroke="#8884d8"
                        strokeWidth={2}
                      />
                      <Bar
                        yAxisId="right"
                        dataKey="installments"
                        name="Installments"
                        fill="#82ca9d"
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="overdue"
                        name="Overdue"
                        stroke="#ff7300"
                      />
                      <Bar
                        yAxisId="right"
                        dataKey="collections"
                        name="Daily Collections"
                        fill="#0088FE"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Officer Performance Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center">
                  <Users className="mr-2 h-5 w-5 text-blue-600" />
                  Officer Performance
                </h2>
                <p className="text-sm text-gray-500">As of {formatDateTime(officerPerformance?.as_of || '')}</p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Officer</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Assigned Balance</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Today's Due</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Collected MTD</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Collection Rate</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Assigned Inst.</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {officerPerformance?.performance_data?.map((perf) => (
                      <tr key={perf?.officer?.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                              <span className="text-sm font-medium text-blue-600">
                                {perf?.officer?.username?.charAt(0)?.toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{perf?.officer?.full_name || perf?.officer?.username}</p>
                              <p className="text-xs text-gray-500">{perf?.officer?.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="text-right py-3 px-4 font-medium">
                          {formatCurrency(perf?.metrics?.assigned_cumulative_balance)}
                        </td>
                        <td className="text-right py-3 px-4">
                          {formatCurrency(perf?.metrics?.daily_cumulative_balance)}
                        </td>
                        <td className="text-right py-3 px-4 text-green-600">
                          {formatCurrency(perf?.metrics?.collected_mtd)}
                        </td>
                        <td className="text-right py-3 px-4">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            perf?.metrics?.collection_rate >= 70 ? 'bg-green-100 text-green-800' :
                            perf?.metrics?.collection_rate >= 40 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {formatPercent(perf?.metrics?.collection_rate)}
                          </span>
                        </td>
                        <td className="text-right py-3 px-4">
                          {perf?.metrics?.assigned_installments}
                        </td>
                        <td className="text-right py-3 px-4">
                          <Link href={`/analytics/officer/${perf?.officer?.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye size={16} className="mr-2" />
                              View
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          {/* Performance Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Collection Rate Trends</h2>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={performanceTrends?.monthly || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis yAxisId="left" domain={[0, 100]} />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="collection_rate"
                        name="Collection Rate %"
                        stroke="#8884d8"
                        strokeWidth={2}
                      />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="overdue_rate"
                        name="Overdue Rate %"
                        stroke="#ff7300"
                        strokeWidth={2}
                      />
                      <Bar
                        yAxisId="right"
                        dataKey="total_collected"
                        name="Amount Collected"
                        fill="#82ca9d"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Officer Performance Comparison</h2>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={officerPerformance?.performance_data?.map(p => ({
                      name: p?.officer?.username,
                      collection_rate: p?.metrics?.collection_rate,
                      collected: p?.metrics?.collected_mtd,
                      assigned: p?.metrics?.assigned_cumulative_balance
                    })) || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis yAxisId="left" domain={[0, 100]} />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="right" dataKey="collected" name="Collected" fill="#8884d8" />
                      <Bar yAxisId="right" dataKey="assigned" name="Assigned" fill="#82ca9d" />
                      <Line yAxisId="left" type="monotone" dataKey="collection_rate" name="Rate %" stroke="#ff7300" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Patterns */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <h3 className="text-md font-semibold">Payment Day Distribution</h3>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={paymentPatterns?.daily_averages || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="average" name="Average Collection" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-md font-semibold">Hourly Payment Pattern</h3>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={paymentPatterns?.hourly_distribution || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" name="Payment Count" stroke="#8884d8" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-md font-semibold">Payment Methods</h3>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentPatterns?.payment_methods || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={60}
                        fill="#8884d8"
                        dataKey="amount"
                        nameKey="method"
                        label
                      >
                        {COLORS.map((color, index) => (
                          <Cell key={`cell-${index}`} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-1">
                  {paymentPatterns?.payment_methods?.map((method, index) => (
                    <div key={method?.method} className="flex justify-between text-sm">
                      <span className="text-gray-600">{method?.method}</span>
                      <span className="font-medium">{formatCurrency(method?.amount)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Early vs Late Payments */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Payment Timeliness Analysis</h2>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-700">Early Payments</p>
                  <p className="text-2xl font-bold text-green-600">{formatNumber(paymentPatterns?.early_vs_late?.early_payments?.count || 0)}</p>
                  <p className="text-sm text-green-600">{formatCurrency(paymentPatterns?.early_vs_late?.early_payments?.amount || 0)}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-700">On Time</p>
                  <p className="text-2xl font-bold text-blue-600">{formatNumber(paymentPatterns?.early_vs_late?.on_time?.count || 0)}</p>
                  <p className="text-sm text-blue-600">{formatCurrency(paymentPatterns?.early_vs_late?.on_time?.amount || 0)}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-sm text-red-700">Late Payments</p>
                  <p className="text-2xl font-bold text-red-600">{formatNumber(paymentPatterns?.early_vs_late?.late_payments?.count || 0)}</p>
                  <p className="text-sm text-red-600">{formatCurrency(paymentPatterns?.early_vs_late?.late_payments?.amount || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Risk Analytics Tab */}
        <TabsContent value="risk" className="space-y-6">
          {/* Risk Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Overall Risk Score</p>
                  <p className={`text-3xl font-bold ${getRiskColor(riskMetrics?.overall_risk_score || 0)}`}>
                    {riskMetrics?.overall_risk_score?.toFixed(0) || 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500">out of 100</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600">DTI Ratio</p>
                  <p className="text-3xl font-bold">{formatPercent(riskMetrics?.early_warning_indicators?.dti_ratio || 0)}</p>
                  <p className="text-xs text-gray-500">Debt to Income</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Payment Delay</p>
                  <p className={`text-3xl font-bold ${(riskMetrics?.early_warning_indicators?.payment_delay_trend || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {(riskMetrics?.early_warning_indicators?.payment_delay_trend || 0) > 0 ? '+' : ''}
                    {formatPercent(riskMetrics?.early_warning_indicators?.payment_delay_trend || 0)}
                  </p>
                  <p className="text-xs text-gray-500">vs last month</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Risk Trend</p>
                  <p className={`text-3xl font-bold ${(riskMetrics?.early_warning_indicators?.risk_score_trend || 0) < 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(riskMetrics?.early_warning_indicators?.risk_score_trend || 0) > 0 ? '+' : ''}
                    {formatPercent(riskMetrics?.early_warning_indicators?.risk_score_trend || 0)}
                  </p>
                  <p className="text-xs text-gray-500">month over month</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Risk Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Risk Level Distribution</h2>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={riskMetrics?.risk_distribution || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="amount"
                        nameKey="level"
                        label
                      >
                        {riskMetrics?.risk_distribution?.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={
                              entry?.level === 'Low' ? '#00C49F' :
                              entry?.level === 'Medium' ? '#FFBB28' :
                              entry?.level === 'High' ? '#FF8042' : '#FF6B6B'
                            } 
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Aging Analysis</h2>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={riskMetrics?.aging_analysis || []} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="days" type="category" />
                      <Tooltip formatter={(value: any) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="amount" name="Amount" fill="#8884d8" />
                      <Bar dataKey="count" name="Count" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Concentration Risk */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <h3 className="text-md font-semibold">Top Borrowers</h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {riskMetrics?.concentration_risk?.top_borrowers?.map((borrower, index) => (
                    <div key={borrower?.name} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-700 w-6">{index + 1}.</span>
                        <span className="text-sm text-gray-600">{borrower?.name}</span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm font-medium">{formatCurrency(borrower?.amount)}</span>
                        <span className="text-xs text-gray-500 w-12 text-right">{borrower?.percentage?.toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-md font-semibold">Top Officers by Portfolio</h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {riskMetrics?.concentration_risk?.top_officers?.map((officer, index) => (
                    <div key={officer?.name} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-700 w-6">{index + 1}.</span>
                        <span className="text-sm text-gray-600">{officer?.name}</span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm font-medium">{formatCurrency(officer?.amount)}</span>
                        <span className="text-xs text-gray-500 w-12 text-right">{officer?.percentage?.toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Efficiency Tab */}
        <TabsContent value="efficiency" className="space-y-6">
          {/* System Performance */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="rounded-full bg-blue-100 p-3 mr-4">
                    <Server className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">API Response</p>
                    <p className="text-2xl font-bold">{efficiencyMetrics?.system_performance?.api_response_time?.toFixed(0) || 0}ms</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="rounded-full bg-yellow-100 p-3 mr-4">
                    <Clock className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Queue Length</p>
                    <p className="text-2xl font-bold">{efficiencyMetrics?.system_performance?.job_queue_length || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="rounded-full bg-green-100 p-3 mr-4">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Error Rate</p>
                    <p className="text-2xl font-bold">{formatPercent(efficiencyMetrics?.system_performance?.error_rate || 0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="rounded-full bg-purple-100 p-3 mr-4">
                    <Activity className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Uptime</p>
                    <p className="text-2xl font-bold">{formatPercent(efficiencyMetrics?.system_performance?.uptime_percentage || 100)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Officer Efficiency */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Officer Efficiency Metrics</h2>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Officer</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Calls Made</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Promises</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Collections</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Conversion Rate</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Avg Response</th>
                    </tr>
                  </thead>
                  <tbody>
                    {efficiencyMetrics?.officer_efficiency?.map((officer) => (
                      <tr key={officer?.officer} className="hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{officer?.officer}</td>
                        <td className="text-right py-3 px-4">{formatNumber(officer?.calls_made)}</td>
                        <td className="text-right py-3 px-4">{formatNumber(officer?.promises)}</td>
                        <td className="text-right py-3 px-4 text-green-600">{formatCurrency(officer?.collections)}</td>
                        <td className="text-right py-3 px-4">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            officer?.conversion_rate >= 50 ? 'bg-green-100 text-green-800' :
                            officer?.conversion_rate >= 30 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {formatPercent(officer?.conversion_rate)}
                          </span>
                        </td>
                        <td className="text-right py-3 px-4">{officer?.avg_response_time?.toFixed(0)} min</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Process Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-600">Avg Processing Time</p>
                <p className="text-2xl font-bold">{formatDuration(efficiencyMetrics?.process_metrics?.avg_processing_time || 0)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-600">Avg Assignment Time</p>
                <p className="text-2xl font-bold">{formatDuration(efficiencyMetrics?.process_metrics?.avg_assignment_time || 0)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-600">Avg Collection Time</p>
                <p className="text-2xl font-bold">{formatDuration(efficiencyMetrics?.process_metrics?.avg_collection_time || 0)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-600">Automation Rate</p>
                <p className="text-2xl font-bold text-green-600">{formatPercent(efficiencyMetrics?.process_metrics?.automation_rate || 0)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Job Performance */}
          {jobMetrics && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Job Performance Metrics</h2>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total Executions</p>
                    <p className="text-2xl font-bold">{formatNumber(jobMetrics?.overall?.total_executions)}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Success Rate</p>
                    <p className="text-2xl font-bold text-green-600">{formatPercent(jobMetrics?.overall?.overall_success_rate)}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Loans Processed</p>
                    <p className="text-2xl font-bold">{formatNumber(jobMetrics?.overall?.total_loans_processed)}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {jobMetrics?.job_performance?.map((job) => (
                    <div key={job?.job_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{job?.job_name}</p>
                        <p className="text-xs text-gray-500">{job?.total_runs} runs · {formatNumber(job?.total_loans_processed)} loans</p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-600">{formatDuration(job?.avg_duration_seconds)}</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          job?.success_rate >= 90 ? 'bg-green-100 text-green-800' :
                          job?.success_rate >= 70 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {formatPercent(job?.success_rate)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Insights & Forecast Tab */}
        <TabsContent value="insights" className="space-y-6">
          {/* Customer Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <h3 className="text-md font-semibold">Customer Segments</h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {customerInsights?.customer_segments?.map((segment) => (
                    <div key={segment?.segment} className="space-y-2">
                      <div className="flex justify-between">
                        <span className="font-medium">{segment?.segment}</span>
                        <span className="text-sm text-gray-600">{formatNumber(segment?.count)} customers</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Balance</span>
                        <span>{formatCurrency(segment?.total_balance)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${
                            segment?.collection_rate >= 70 ? 'bg-green-600' :
                            segment?.collection_rate >= 40 ? 'bg-yellow-600' : 'bg-red-600'
                          }`}
                          style={{ width: `${segment?.collection_rate}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-md font-semibold">Customer Loyalty</h3>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'First Time', value: customerInsights?.repeat_behavior?.first_time?.count || 0 },
                          { name: 'Repeat', value: customerInsights?.repeat_behavior?.repeat?.count || 0 },
                          { name: 'Loyal', value: customerInsights?.repeat_behavior?.loyal?.count || 0 }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        fill="#8884d8"
                        dataKey="value"
                        label
                      >
                        {COLORS.map((color, index) => (
                          <Cell key={`cell-${index}`} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                  <div>
                    <p className="text-xs text-gray-500">First Time</p>
                    <p className="font-semibold">{formatNumber(customerInsights?.repeat_behavior?.first_time?.count || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Repeat</p>
                    <p className="font-semibold">{formatNumber(customerInsights?.repeat_behavior?.repeat?.count || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Loyal</p>
                    <p className="font-semibold">{formatNumber(customerInsights?.repeat_behavior?.loyal?.count || 0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-md font-semibold">Satisfaction Metrics</h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">NPS Score</span>
                    <span className={`text-lg font-semibold ${
                      (customerInsights?.satisfaction_metrics?.nps_score || 0) >= 50 ? 'text-green-600' :
                      (customerInsights?.satisfaction_metrics?.nps_score || 0) >= 0 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {customerInsights?.satisfaction_metrics?.nps_score || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Complaint Rate</span>
                    <span className="text-lg font-semibold">{formatPercent(customerInsights?.satisfaction_metrics?.complaint_rate || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Resolution Time</span>
                    <span className="text-lg font-semibold">{formatDuration(customerInsights?.satisfaction_metrics?.resolution_time || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Feedback Score</span>
                    <span className="text-lg font-semibold">{(customerInsights?.satisfaction_metrics?.feedback_score || 0)?.toFixed(1)}/10</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Forecast */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Next Month Forecast</h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-600 mb-1">Projected Collection</p>
                    <p className="text-3xl font-bold text-blue-700">{formatCurrency(forecastData?.next_month?.projected_collection || 0)}</p>
                    <p className="text-xs text-blue-500 mt-1">
                      Range: {formatCurrency(forecastData?.next_month?.confidence_interval?.lower || 0)} - {formatCurrency(forecastData?.next_month?.confidence_interval?.upper || 0)}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Expected Overdue</p>
                      <p className="text-xl font-semibold text-red-600">{formatCurrency(forecastData?.next_month?.expected_overdue || 0)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Confidence Level</p>
                      <p className="text-xl font-semibold">95%</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Risk Factors</p>
                    <ul className="list-disc list-inside space-y-1">
                      {forecastData?.next_month?.risk_factors?.map((factor, index) => (
                        <li key={index} className="text-sm text-gray-600">{factor}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Next Quarter Forecast</h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm text-purple-600 mb-1">Projected Collection</p>
                    <p className="text-3xl font-bold text-purple-700">{formatCurrency(forecastData?.next_quarter?.projected_collection || 0)}</p>
                    <p className="text-xs text-purple-500 mt-1">
                      Range: {formatCurrency(forecastData?.next_quarter?.confidence_interval?.lower || 0)} - {formatCurrency(forecastData?.next_quarter?.confidence_interval?.upper || 0)}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Expected Overdue</p>
                      <p className="text-xl font-semibold text-red-600">{formatCurrency(forecastData?.next_quarter?.expected_overdue || 0)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Confidence Level</p>
                      <p className="text-xl font-semibold">85%</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Risk Factors</p>
                    <ul className="list-disc list-inside space-y-1">
                      {forecastData?.next_quarter?.risk_factors?.map((factor, index) => (
                        <li key={index} className="text-sm text-gray-600">{factor}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Forecast Trend */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Forecast vs Actual Trend</h2>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={forecastData?.trends || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip formatter={(value: any) => formatCurrency(value)} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="upper_bound"
                      name="Upper Bound"
                      stroke="#8884d8"
                      fill="#8884d8"
                      fillOpacity={0.1}
                    />
                    <Area
                      type="monotone"
                      dataKey="lower_bound"
                      name="Lower Bound"
                      stroke="#82ca9d"
                      fill="#82ca9d"
                      fillOpacity={0.1}
                    />
                    <Line
                      type="monotone"
                      dataKey="actual"
                      name="Actual"
                      stroke="#ff7300"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="forecast"
                      name="Forecast"
                      stroke="#8884d8"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ============================================================================
          MODALS
          ============================================================================ */}

      {/* Schedule Modal (Create/Edit) */}
      <Modal
        isOpen={isScheduleModalOpen}
        onClose={() => {
          setIsScheduleModalOpen(false);
          resetScheduleForm();
        }}
        title={selectedSchedule ? 'Edit Schedule' : 'Create New Schedule'}
        size="lg"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              Configure job schedule parameters. All times are in 24-hour format.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                value={scheduleFormData.name}
                onChange={(e) => setScheduleFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g., Weekday Loan Processing"
                required
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={scheduleFormData.description}
                onChange={(e) => setScheduleFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={2}
                placeholder="Optional description"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Frequency *
              </label>
              <select
                value={scheduleFormData.frequency}
                onChange={(e) => setScheduleFormData(prev => ({ 
                  ...prev, 
                  frequency: e.target.value as any 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                {frequencyOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {frequencyOptions.find(f => f.value === scheduleFormData.frequency)?.description}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Interval (hours)
              </label>
              <input
                type="number"
                value={scheduleFormData.interval_hours}
                onChange={(e) => setScheduleFormData(prev => ({ 
                  ...prev, 
                  interval_hours: parseInt(e.target.value) 
                }))}
                min="1"
                max="24"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Hour (0-23)
              </label>
              <input
                type="number"
                value={scheduleFormData.start_hour}
                onChange={(e) => setScheduleFormData(prev => ({ 
                  ...prev, 
                  start_hour: parseInt(e.target.value) 
                }))}
                min="0"
                max="23"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Hour (0-23)
              </label>
              <input
                type="number"
                value={scheduleFormData.end_hour}
                onChange={(e) => setScheduleFormData(prev => ({ 
                  ...prev, 
                  end_hour: parseInt(e.target.value) 
                }))}
                min="0"
                max="23"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Days of Week
              </label>
              <input
                type="text"
                value={scheduleFormData.days_of_week}
                onChange={(e) => setScheduleFormData(prev => ({ 
                  ...prev, 
                  days_of_week: e.target.value 
                }))}
                placeholder="1,2,3,4,5 (1=Monday)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              <p className="text-xs text-gray-500 mt-1">
                Comma-separated (1=Monday, 7=Sunday)
              </p>
            </div>

            {scheduleFormData.frequency === 'monthly' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Days of Month
                </label>
                <input
                  type="text"
                  value={scheduleFormData.days_of_month || ''}
                  onChange={(e) => setScheduleFormData(prev => ({ 
                    ...prev, 
                    days_of_month: e.target.value 
                  }))}
                  placeholder="1,15,30"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Page Size
              </label>
              <input
                type="number"
                value={scheduleFormData.page_size}
                onChange={(e) => setScheduleFormData(prev => ({ 
                  ...prev, 
                  page_size: parseInt(e.target.value) 
                }))}
                min="10"
                max="1000"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Retries
              </label>
              <input
                type="number"
                value={scheduleFormData.max_retries}
                onChange={(e) => setScheduleFormData(prev => ({ 
                  ...prev, 
                  max_retries: parseInt(e.target.value) 
                }))}
                min="1"
                max="10"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div className="col-span-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={scheduleFormData.is_active}
                  onChange={(e) => setScheduleFormData(prev => ({ 
                    ...prev, 
                    is_active: e.target.checked 
                  }))}
                  className="rounded border-gray-300"
                />
                <span className="text-sm font-medium text-gray-700">Active</span>
              </label>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter Parameters (JSON)
              </label>
              <textarea
                value={JSON.stringify(scheduleFormData.filter_params, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    setScheduleFormData(prev => ({ ...prev, filter_params: parsed }));
                  } catch {
                    // Invalid JSON - ignore
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
                rows={4}
                placeholder="{}"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsScheduleModalOpen(false);
                resetScheduleForm();
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={selectedSchedule ? handleUpdateSchedule : handleCreateSchedule}
              disabled={isSubmitting || !scheduleFormData.name}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? 'Saving...' : (selectedSchedule ? 'Update' : 'Create')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Schedule Detail Modal */}
      <Modal
        isOpen={isScheduleDetailModalOpen}
        onClose={() => {
          setIsScheduleDetailModalOpen(false);
          setSelectedSchedule(null);
        }}
        title="Schedule Details"
        size="lg"
      >
        {selectedSchedule && (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold">{selectedSchedule.name}</h3>
                {selectedSchedule.description && (
                  <p className="text-gray-600 mt-1">{selectedSchedule.description}</p>
                )}
              </div>
              <span className={`px-3 py-1 text-sm rounded-full ${
                selectedSchedule.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {selectedSchedule.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-xs text-blue-600">Total Runs</p>
                <p className="text-2xl font-bold text-blue-700">{selectedSchedule?.metrics?.total_executions ?? 0}</p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-xs text-green-600">Success Rate</p>
                <p className="text-2xl font-bold text-green-700">{formatPercent(selectedSchedule?.metrics?.success_rate ?? 'N/A')}</p>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <p className="text-xs text-purple-600">Avg Duration</p>
                <p className="text-2xl font-bold text-purple-700">
                  {formatDuration(selectedSchedule?.metrics?.avg_duration_seconds || 0)}
                </p>
              </div>
            </div>

            {/* Schedule Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Frequency</p>
                <p className="font-medium">
                  {frequencyOptions.find(f => f.value === selectedSchedule.frequency)?.label || selectedSchedule.frequency}
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Time Window</p>
                <p className="font-medium">{selectedSchedule.start_hour}:00 - {selectedSchedule.end_hour}:00</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Interval</p>
                <p className="font-medium">Every {selectedSchedule.interval_hours} hours</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Days</p>
                <p className="font-medium">
                  {selectedSchedule.days_of_week.split(',').map(d => {
                    const day = dayOptions.find(opt => opt.value === parseInt(d));
                    return day?.label.slice(0, 3);
                  }).join(', ')}
                </p>
              </div>
            </div>

            {/* Next/Last Run */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Last Run</p>
                <p className="font-medium">{selectedSchedule.last_run_display || 'Never'}</p>
                {selectedSchedule.last_run && (
                  <p className="text-xs text-gray-500">{formatDateTime(selectedSchedule.last_run)}</p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-600">Next Run</p>
                <p className="font-medium">{selectedSchedule.next_run_display || 'Not scheduled'}</p>
                {selectedSchedule.next_run && (
                  <p className="text-xs text-gray-500">{formatDateTime(selectedSchedule.next_run)}</p>
                )}
              </div>
            </div>

            {/* Filter Parameters */}
            {Object.keys(selectedSchedule.filter_params || {}).length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Filter Parameters</p>
                <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-32">
                  {JSON.stringify(selectedSchedule.filter_params, null, 2)}
                </pre>
              </div>
            )}

            {/* Recent Executions */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Recent Executions</p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {selectedSchedule.recent_executions?.results?.map((exec) => (
                  <div key={exec.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div>
                      <p className="text-sm">{formatDateTime(exec.scheduled_time)}</p>
                      <p className="text-xs text-gray-500">
                        {exec.total_loans_processed} loans · {exec.duration_formatted}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(exec.status)}`}>
                      {exec.status}
                    </span>
                  </div>
                ))}
              </div>
              {selectedSchedule.recent_executions?.total_pages > 1 && (
                <div className="mt-2 text-xs text-gray-500">
                  Showing page {selectedSchedule.recent_executions.page} of {selectedSchedule.recent_executions.total_pages}
                </div>
              )}
            </div>

            {/* Metadata */}
            <div className="text-xs text-gray-500 border-t pt-4">
              <p>Created by: {selectedSchedule.created_by_details?.username || 'Unknown'}</p>
              <p>Created: {formatDateTime(selectedSchedule.created_at)}</p>
              <p>Last updated: {formatDateTime(selectedSchedule.updated_at)}</p>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteScheduleModalOpen}
        onClose={() => setIsDeleteScheduleModalOpen(false)}
        title="Delete Schedule"
        size="sm"
      >
        {selectedSchedule && (
          <div className="space-y-4">
            <p className="text-gray-600">
              Are you sure you want to delete schedule <span className="font-bold">"{selectedSchedule.name}"</span>?
            </p>
            <p className="text-sm text-red-600">
              This action cannot be undone. All execution history will be preserved but the schedule will be removed.
            </p>
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setIsDeleteScheduleModalOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button onClick={handleDeleteSchedule} disabled={isSubmitting} className="bg-red-600 hover:bg-red-700">
                {isSubmitting ? 'Deleting...' : 'Delete Schedule'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Trigger Job Modal */}
      <Modal
        isOpen={isTriggerJobModalOpen}
        onClose={() => {
          setIsTriggerJobModalOpen(false);
          resetTriggerForm();
        }}
        title="Trigger Loan Processing Job"
        size="lg"
        isLoading={isSubmitting}
      >
        <div className="space-y-4">
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Shield className="h-5 w-5 text-yellow-600 mr-2" />
              <p className="text-sm text-yellow-800">
                This will trigger a manual loan processing job. All filters are optional.
              </p>
            </div>
          </div>

          {/* Cooldown Warning */}
          {cooldownStatus?.is_active && (
            <div className="bg-orange-50 p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 text-orange-600 mr-2" />
                  <span className="text-sm text-orange-800">
                    Cooldown active: {cooldownStatus.minutes_remaining} minutes remaining
                  </span>
                </div>
                {cooldownStatus.can_bypass && (
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={triggerFormData.skip_cooldown}
                      onChange={(e) => setTriggerFormData(prev => ({ 
                        ...prev, 
                        skip_cooldown: e.target.checked 
                      }))}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-orange-700">Bypass cooldown</span>
                  </label>
                )}
              </div>
            </div>
          )}

          {/* Force Options */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={triggerFormData.force}
                  onChange={(e) => setTriggerFormData(prev => ({ ...prev, force: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <span className="text-sm font-medium text-gray-700">Force (Bypass Schedule)</span>
              </label>
              <p className="text-xs text-gray-500 ml-6">
                Run regardless of schedule window
              </p>
            </div>
            {canSkipCooldown && (
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={triggerFormData.skip_cooldown}
                  onChange={(e) => setTriggerFormData(prev => ({ ...prev, skip_cooldown: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <span className="text-sm font-medium text-gray-700">Skip Cooldown</span>
              </label>
              <p className="text-xs text-gray-500 ml-6">
                Bypass 10-minute cooldown (admin only)
              </p>
            </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Page Size
              </label>
              <input
                type="number"
                value={triggerFormData.page_size}
                onChange={(e) => setTriggerFormData(prev => ({ ...prev, page_size: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                min="10"
                max="1000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Retries
              </label>
              <input
                type="number"
                value={triggerFormData.max_retries}
                onChange={(e) => setTriggerFormData(prev => ({ ...prev, max_retries: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                min="1"
                max="10"
              />
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Optional Filters</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={triggerFormData.name}
                  onChange={(e) => setTriggerFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., John Doe"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Registration Number
                </label>
                <input
                  type="text"
                  value={triggerFormData.registration_number}
                  onChange={(e) => setTriggerFormData(prev => ({ ...prev, registration_number: e.target.value }))}
                  placeholder="e.g., KCA123A"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Identity Number
                </label>
                <input
                  type="text"
                  value={triggerFormData.identity_num}
                  onChange={(e) => setTriggerFormData(prev => ({ ...prev, identity_num: e.target.value }))}
                  placeholder="e.g., 12345678"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Loan Statuses
                </label>
                <input
                  type="text"
                  value={triggerFormData.loan_statuses}
                  onChange={(e) => setTriggerFormData(prev => ({ ...prev, loan_statuses: e.target.value }))}
                  placeholder="e.g., 1002,1003"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Repeat Client
                </label>
                <input
                  type="number"
                  value={triggerFormData.repeat_client}
                  onChange={(e) => setTriggerFormData(prev => ({ ...prev, repeat_client: e.target.value }))}
                  placeholder="0 or 1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  min="0"
                  max="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Loan Type
                </label>
                <input
                  type="number"
                  value={triggerFormData.loan_type}
                  onChange={(e) => setTriggerFormData(prev => ({ ...prev, loan_type: e.target.value }))}
                  placeholder="e.g., 0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Office ID
                </label>
                <input
                  type="text"
                  value={triggerFormData.office_id}
                  onChange={(e) => setTriggerFormData(prev => ({ ...prev, office_id: e.target.value }))}
                  placeholder="e.g., 0b8048171e800000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Apply Time Begin
                </label>
                <input
                  type="datetime-local"
                  value={triggerFormData.apply_time_begin}
                  onChange={(e) => setTriggerFormData(prev => ({ ...prev, apply_time_begin: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Apply Time End
                </label>
                <input
                  type="datetime-local"
                  value={triggerFormData.apply_time_end}
                  onChange={(e) => setTriggerFormData(prev => ({ ...prev, apply_time_end: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={() => setIsTriggerJobModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleTriggerJob} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
              {isSubmitting ? 'Triggering...' : 'Trigger Job'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Export Modal */}
      <Modal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Export Analytics Data"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Choose export format and options</p>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setExportFormat('csv')}
                className={`p-3 border rounded-lg text-center ${
                  exportFormat === 'csv' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <FileText size={24} className="mx-auto mb-1 text-gray-600" />
                <span className="text-xs">CSV</span>
              </button>
              <button
                onClick={() => setExportFormat('excel')}
                className={`p-3 border rounded-lg text-center ${
                  exportFormat === 'excel' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <FileSpreadsheet size={24} className="mx-auto mb-1 text-green-600" />
                <span className="text-xs">Excel</span>
              </button>
              <button
                onClick={() => setExportFormat('pdf')}
                className={`p-3 border rounded-lg text-center ${
                  exportFormat === 'pdf' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <FileBarChart size={24} className="mx-auto mb-1 text-red-600" />
                <span className="text-xs">PDF</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Period</label>
            <select 
              className="w-full px-3 py-2 border border-gray-300 rounded-md" 
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value as any)}
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">Last Year</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={() => setIsExportModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleExportData} className="bg-blue-600 hover:bg-blue-700">
              <DownloadCloud size={16} className="mr-2" />
              Export
            </Button>
          </div>
        </div>
      </Modal>

      {/* Job Details Modal */}
      {selectedJob && (
        <Modal
          isOpen={isJobDetailsModalOpen}
          onClose={() => {
            setIsJobDetailsModalOpen(false);
            setSelectedJob(null);
          }}
          title="Job Details"
          size="md"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className={`px-2 py-1 text-sm rounded-full ${getStatusColor(selectedJob?.status)}`}>
                {selectedJob?.status}
              </span>
              <span className="text-xs text-gray-500">Job ID: {selectedJob?.id}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Started At</p>
                <p className="font-medium">{formatDateTime(selectedJob?.started_at)}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Completed At</p>
                <p className="font-medium">
                  {selectedJob?.completed_at ? formatDateTime(selectedJob?.completed_at) : 'N/A'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Duration</p>
                <p className="text-lg font-semibold">
                  {selectedJob?.duration_seconds ? formatDuration(selectedJob?.duration_seconds) : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Progress</p>
                <p className="text-lg font-semibold">{selectedJob?.progress_percentage?.toFixed(1)}%</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Loan Processing Stats</p>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-gray-50 p-2 rounded">
                  <p className="text-xs text-gray-500">Total</p>
                  <p className="font-medium">{selectedJob?.total_loans}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <p className="text-xs text-gray-500">Processed</p>
                  <p className="font-medium">{selectedJob?.processed_loans}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <p className="text-xs text-gray-500">Success</p>
                  <p className="font-medium text-green-600">{selectedJob?.successful_fetches}</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Updates</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Main Loans</p>
                  <p className="font-medium">Created: {selectedJob?.main_loans_created}</p>
                  <p className="font-medium">Updated: {selectedJob?.main_loans_updated}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Installments</p>
                  <p className="font-medium">Created: {selectedJob?.installments_created}</p>
                  <p className="font-medium">Updated: {selectedJob?.installments_updated}</p>
                </div>
              </div>
            </div>

            {selectedJob?.filter_params && selectedJob?.filter_params !== '{}' && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Applied Filters</p>
                <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-32">
                  {JSON.stringify(JSON.parse(selectedJob?.filter_params?.replace(/'/g, '"')), null, 2)}
                </pre>
              </div>
            )}

            {selectedJob?.error_message && (
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-sm font-medium text-red-800 mb-1">Error Message</p>
                <p className="text-xs text-red-700">{selectedJob?.error_message}</p>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button variant="outline" onClick={() => setIsJobDetailsModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}