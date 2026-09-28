'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api';
import {
  ArrowLeft, User, Calendar, Clock, DollarSign,
  TrendingUp, Target, Award, Activity,
  AlertCircle, CheckCircle, XCircle, BarChart3,
  RefreshCw, Download, Eye, Phone, Mail, HelpCircle,
  List,
  ExternalLink,
  Layers,
  Percent,
  Users,
  Gauge,
} from 'lucide-react';
import Link from 'next/link';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell
} from 'recharts';
import {
  PR_BUCKET_ORDER,
  PR_BUCKET_COLOR_CLASSES,
  getPRBucketMeta,
  type PRBucketMetrics,
  type PRBucketBreakdownEntry,
  type PRBucketValue,
} from '@/types';

// ============================================================
// TYPES - MATCH ACTUAL BACKEND RESPONSES
// ============================================================

// Week Metrics Type (from /loan-processor/metrics/officer/{id}/week/)
interface OfficerWeekMetrics {
  officer_id: number;
  date: string;
  week_start: string;
  week_end: string;
  week_number: number;
  year: number;
  days_passed: number;
  days_remaining: number;
  week_progress_percentage: number;
  weekly_targets: {
    week_to_date_target: number;
    upcoming_target: number;
    full_week_target: number;
    description: string;
    source: string;
  };
  // NEW: CBK "PR bucket" categorization (target/posted/commission per aging bucket)
  pr_bucket_metrics: PRBucketMetrics;
  daily_snapshots: Record<string, {
    target: number;
    cumulative_balance: number;
    collected: number;
    achievement: number;
  }>;
  week_to_date_balance: number;
  upcoming_balance: number;
  full_week_balance: number;
  weekly_installments_count: number;
  weekly_overdue_count: number;
  weekly_overdue_percentage: number;
  collected_week_to_date: number;
  paid_off_this_week: number;
  remaining_week_to_date: number;
  remaining_full_week: number;
  collection_rate_vs_week_to_date: number;
  collection_rate_vs_full_week: number;
  expected_collection_to_date: number;
  performance_vs_expected: number;
  performance_percentage: number;
  average_daily_collection: number;
  projected_weekly_collection: number;
  projected_vs_target: number;
  on_track: boolean;
  status: string;
  risk_level: string;
  collection_pace: string;
  needs_attention: boolean;
  daily_breakdown: Array<{
    date: string;
    day_name: string;
    daily_cumulative_target: number;
    cumulative_due_up_to_day: number;
    cumulative_collected_up_to_day: number;
    remaining_after_day: number;
    collected_today: number;
    paid_off_count_today: number;
    cumulative_overdue_up_to_day: number;
    target_accuracy: number;
    cumulative_achievement: number;
  }>;
  month_context: {
    monthly_target: number;
    week_share_of_month: number;
    collected_mtd: number;
  };
  call_metrics: {
    calls_made_today: number;
    successful_calls_today: number;
    call_success_rate: number;
    avg_duration: number;
  };
  promise_metrics: {
    promises_received_today: number;
    promised_amount_today: string;
    promises_fulfilled_today: number;
    fulfilled_amount_today: string;
  };
  enhanced_metrics: {
    efficiency: {
      best_collection_day: { date: string; amount: number };
      best_cumulative_day: { date: string; achievement: number };
      worst_cumulative_day: { date: string; achievement: number };
      target_accuracy_range: { min: number; max: number; average: number };
    };
  };
}

// Month Metrics Type (from /loan-processor/metrics/officer/{id}/month/)
interface OfficerMonthMetrics {
  officer_id: number;
  date: string;
  month_start: string;
  month_end: string;
  month_name: string;
  days_passed: number;
  days_in_month: number;
  month_progress_percentage: number;
  monthly_target: {
    current_month_target: number;
    total_current_balance: number;
    total_installments_count: number;
    average_installment_balance: number;
    overdue_count: number;
    overdue_percentage: number;
    paid_off_target: number;
    remaining_to_pay: number;
  };
  // NEW: CBK "PR bucket" categorization (target/posted/commission per aging bucket)
  pr_bucket_metrics: PRBucketMetrics;
  progress: {
    collected_month_to_date: number;
    remaining_balance: number;
    collection_rate: number;
    paid_off_this_month: number;
    average_daily_collection: number;
    required_daily_to_meet_target: number;
    projected_total: number;
    projected_vs_target: number;
    projected_success: boolean;
    confidence_score: number;
  };
  performance_analysis: {
    status: string;
    risk_level: string;
    expected_collection_to_date: number;
    actual_vs_expected: number;
    performance_percentage: number;
    efficiency_ratio: number;
    collection_pace: string;
    needs_attention: boolean;
    recovery_possible: boolean;
  };
  weekly_breakdown: Array<{
    week_start: string;
    week_end: string;
    week_number: number;
    target: number;
    collected: number;
    pre_payments: number;
    collection_rate: number;
    status: string;
    remaining: number;
  }>;
  peer_comparison: {
    peer_average_target: number;
    peer_average_count: number;
    peer_average_overdue_ratio: number;
    peer_average_collection_rate: number;
    peer_average_collected: number;
    percentile: number;
    rank: string;
    comparison_vs_avg: number;
    collected_vs_avg: number;
    load_comparison: { target_vs_avg: number };
  };
  trend: Array<{
    date: string;
    collected: number;
    target: number;
    cumulative_balance: number;
    pre_payments: number;
    day_name: string;
    week_number: number;
  }>;
  installments_breakdown: {
    total_assigned: number;
    current_month: number;
    current_month_paid: number;
    current_month_active: number;
    other_months: number;
    other_months_paid: number;
    paid_off_total: number;
    overdue_total: number;
  };
  indicators: {
    month_strength: string;
    collection_consistency: string;
    improvement_trend: string;
  };
  call_metrics: {
    calls_made_today: number;
    successful_calls_today: number;
    call_success_rate: number;
    avg_duration: number;
  };
  promise_metrics: {
    promises_received_today: number;
    promised_amount_today: string;
    promises_fulfilled_today: number;
    fulfilled_amount_today: string;
  };
  enhanced_metrics: {
    pre_payment: { count: number; total_posted: number; total_remained: number; collection_efficiency: number };
    discounts: { count: number; total_amount: number };
    assignment_stats: { assignments_this_month: number; currently_assigned_loans: number; total_collected_all_time: number };
    collection_efficiency: { amount_received: number; collection_rate_vs_expected: number; projected_remaining: number };
    payment_quality: { pre_payment_ratio: number; discount_ratio: number };
  };
}

interface OfficerDailyHistory {
  data: Array<{
    date: string;
    daily_cumulative_balance: number;
    daily_installments: number;
    daily_overdue: number;
    collected_during_day: number;
    collected_mtd: number;
    collection_rate: number;
    calls_made: number;
    successful_calls: number;
    call_success_rate: number;
    promises_received: number;
    promised_amount: number;
    resolved: number;
    assigned_installments: number;
    assigned_cumulative_balance: number;
    daily_target: number;
    daily_target_achievement: number;
    monthly_target: number;
    monthly_target_achievement: number;
    repayments_handled: number;
  }>;
  count: number;
}

// Monthly History Type (from /loan-processor/officers/{id}/monthly-history/?year=&month=)
// NOTE: this previously did not match the real endpoint response at all (it had
// `year`/`month`/`avg_cumulative_balance`, none of which the API returns). Fixed to
// mirror the actual payload, including the new PR-bucket / percentaged-target fields.
interface OfficerMonthlyHistoryEntry {
  year_annot: number;
  month_annot: number;
  month_start_date: string;
  month_end_date: string;
  total_collected_month: number;
  total_collected_mtd_end: number;
  avg_daily_cumulative_balance: number;
  avg_collection_rate: number;
  total_resolved_month: number;
  start_cumulative_balance: number;
  end_cumulative_balance: number;
  peak_cumulative_balance: number;
  avg_daily_target: number;
  avg_daily_target_achievement: number;
  total_calls: number;
  total_promises: number;
  total_repayments: number;
  avg_assigned_installments: number;
  avg_assigned_cumulative_balance: number;
  // NEW: CBK percentaged-target / posted / commission totals for the month
  monthly_percentaged_target: number;
  monthly_posted: number;
  monthly_commission: number;
  avg_daily_percentaged_target: number;
  total_daily_posted: number;
  total_daily_commission: number;
  cumulative_balance_change: number;
  cumulative_balance_change_percentage: number;
  // NEW: per-bucket breakdown for the month
  pr_bucket_breakdown: Partial<Record<PRBucketValue, PRBucketBreakdownEntry>>;
}

interface OfficerMonthlyHistory {
  data: OfficerMonthlyHistoryEntry[];
  count: number;
}

// ============================================================
// FORMATTERS & SHARED HELPERS
// ============================================================

const formatCurrency = (value: number | null | undefined) => {
  return `KSh ${(value ?? 0).toLocaleString()}`;
};

const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString();
};

const getRiskColor = (riskLevel: string) => {
  switch (riskLevel?.toLowerCase()) {
    case 'low': return 'text-green-600 bg-green-100';
    case 'medium': return 'text-yellow-600 bg-yellow-100';
    case 'high': return 'text-red-600 bg-red-100';
    default: return 'text-gray-600 bg-gray-100';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'ahead':
    case 'exceeding':
      return 'text-green-600 bg-green-100';
    case 'behind':
      return 'text-red-600 bg-red-100';
    case 'on_track':
      return 'text-blue-600 bg-blue-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};

// ============================================================
// SHARED UI COMPONENTS
// ============================================================

const MetricHint = ({ text }: { text: string }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-block ml-1">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="focus:outline-none"
      >
        <HelpCircle size={14} className="text-gray-400 hover:text-gray-600" />
      </button>
      {show && (
        <div className="absolute z-10 w-48 p-2 mt-1 text-xs text-white bg-gray-800 rounded-lg shadow-lg -left-24 top-4">
          {text}
          <div className="absolute w-2 h-2 bg-gray-800 transform rotate-45 -top-1 left-1/2 -ml-1"></div>
        </div>
      )}
    </div>
  );
};

// Consistent section heading used across every card in the page
const SectionTitle = ({
  icon: Icon,
  children,
  hint,
}: {
  icon?: React.ComponentType<any>;
  children: React.ReactNode;
  hint?: string;
}) => (
  <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
    {Icon && <Icon size={18} className="text-gray-400" />}
    <span className="flex items-center">
      {children}
      {hint && <MetricHint text={hint} />}
    </span>
  </h2>
);

// Consistent overview "stat" card used for the top KPI rows
const StatCard = ({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  hint,
  valueClassName,
}: {
  icon: React.ComponentType<any>;
  iconBg: string;
  iconColor: string;
  label: string;
  value: React.ReactNode;
  hint?: string;
  valueClassName?: string;
}) => (
  <Card className="rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
    <CardContent className="pt-6">
      <div className="flex items-center">
        <div className={`rounded-full ${iconBg} p-3 mr-4 shrink-0`}>
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-gray-600 flex items-center whitespace-nowrap">
            {label}
            {hint && <MetricHint text={hint} />}
          </p>
          <p className={`text-2xl font-bold truncate ${valueClassName ?? 'text-gray-900'}`}>{value}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

// Small labeled stat used inside the PR-bucket overview row and history rows
const MiniStat = ({
  label,
  value,
  tone = 'gray',
}: {
  label: string;
  value: React.ReactNode;
  tone?: 'gray' | 'green' | 'blue' | 'amber';
}) => {
  const toneClasses: Record<string, string> = {
    gray: 'bg-gray-50 border-gray-200 text-gray-900',
    green: 'bg-green-50 border-green-200 text-green-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
  };
  return (
    <div className={`rounded-lg border px-3 py-2 ${toneClasses[tone]}`}>
      <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-sm font-semibold mt-0.5">{value}</p>
    </div>
  );
};

// ============================================================
// PR BUCKET BREAKDOWN GRID
// Renders a PRBucketMetrics-shaped object (overall totals + per-bucket
// breakdown) as an overview row of stats plus one card per bucket present.
// Reused across the Month View, Week View, and each row of the History's
// Monthly Performance Summary.
// ============================================================

interface PRBucketOverallTotals {
  daily_target: number;
  monthly_target: number;
  daily_posted: number;
  monthly_posted: number;
  daily_commission: number;
  monthly_commission: number;
}

const PRBucketBreakdownGrid = ({
  breakdown,
  overall,
  title = 'PR Bucket Breakdown',
  hint,
  compact = false,
}: {
  breakdown: Partial<Record<PRBucketValue, PRBucketBreakdownEntry>> | null | undefined;
  overall?: PRBucketOverallTotals;
  title?: string;
  hint?: string;
  compact?: boolean;
}) => {
  const buckets = PR_BUCKET_ORDER.filter((b) => !!breakdown?.[b]);

  if (!breakdown || buckets.length === 0) {
    return null;
  }

  return (
    <div className={compact ? 'space-y-2' : 'space-y-4'}>
      {!compact && (
        <SectionTitle icon={Layers} hint={hint}>
          {title}
        </SectionTitle>
      )}

      {overall && (
        <div className={`grid gap-2 ${compact ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-3 gap-3'}`}>
          {!compact && <MiniStat label="Daily % Target" value={formatCurrency(overall.daily_target)} />}
          <MiniStat label={compact ? '% Target' : 'Monthly % Target'} value={formatCurrency(overall.monthly_target)} />
          {!compact && <MiniStat label="Daily Posted" value={formatCurrency(overall.daily_posted)} tone="green" />}
          <MiniStat label={compact ? 'Posted' : 'Monthly Posted'} value={formatCurrency(overall.monthly_posted)} tone="green" />
          {!compact && <MiniStat label="Daily Commission" value={formatCurrency(overall.daily_commission)} tone="blue" />}
          <MiniStat label={compact ? 'Commission' : 'Monthly Commission'} value={formatCurrency(overall.monthly_commission)} tone="blue" />
        </div>
      )}

      <div className={`grid gap-3 ${compact ? 'grid-cols-2 md:grid-cols-5' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5'}`}>
        {buckets.map((bucketValue) => {
          const entry = breakdown[bucketValue] as PRBucketBreakdownEntry;
          const meta = getPRBucketMeta(bucketValue);
          const colors = PR_BUCKET_COLOR_CLASSES[meta.color] ?? PR_BUCKET_COLOR_CLASSES.green;
          const hasCommission = entry.daily_commission > 0 || entry.monthly_commission > 0;

          return (
            <div key={bucketValue} className={`rounded-lg border ${colors.border} ${colors.bg} p-3`}>
              <div className="flex items-center gap-1.5 mb-2">
                <span className={`h-2 w-2 rounded-full ${colors.dot} shrink-0`} />
                <span className={`text-xs font-semibold ${colors.text} truncate`}>
                  {compact ? meta.shortLabel : meta.label}
                </span>
              </div>
              <dl className="space-y-1 text-[11px]">
                {!compact && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Daily Target</dt>
                    <dd className="font-medium text-gray-800">{formatCurrency(entry.daily_target)}</dd>
                  </div>
                )}
                {!compact && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Daily Posted</dt>
                    <dd className="font-medium text-gray-800">{formatCurrency(entry.daily_posted)}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-gray-500">{compact ? 'Target' : 'Monthly Target'}</dt>
                  <dd className="font-medium text-gray-800">{formatCurrency(entry.monthly_target)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">{compact ? 'Posted' : 'Monthly Posted'}</dt>
                  <dd className="font-medium text-gray-800">{formatCurrency(entry.monthly_posted)}</dd>
                </div>
                {hasCommission && (
                  <div className="flex justify-between pt-1 border-t border-gray-900/10">
                    <dt className="text-gray-500">Commission</dt>
                    <dd className="font-medium text-gray-800">
                      {formatCurrency(compact ? entry.monthly_commission : entry.daily_commission)}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function OfficerAnalyticsPage() {
  const params = useParams();
  const officerId = params.id as string;

  const [monthMetrics, setMonthMetrics] = useState<OfficerMonthMetrics | null>(null);
  const [weekMetrics, setWeekMetrics] = useState<OfficerWeekMetrics | null>(null);
  const [dailyHistory, setDailyHistory] = useState<OfficerDailyHistory | null>(null);
  const [monthlyHistory, setMonthlyHistory] = useState<OfficerMonthlyHistory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedView, setSelectedView] = useState<'month' | 'week' | 'history'>('month');

  useEffect(() => {
    if (officerId) {
      fetchAllData();
    }
  }, [officerId]);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchMonthMetrics(),
        fetchWeekMetrics(),
        fetchDailyHistory(),
        fetchMonthlyHistory()
      ]);
    } catch (error) {
      console.error('Error fetching officer data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMonthMetrics = async () => {
    try {
      const client = apiClient.getClient();
      const response = await client.get(`/loan-processor/metrics/officer/${officerId}/month/`);
      setMonthMetrics(response.data);
    } catch (error) {
      console.error('Error fetching month metrics:', error);
    }
  };

  const fetchWeekMetrics = async () => {
    try {
      const client = apiClient.getClient();
      const response = await client.get(`/loan-processor/metrics/officer/${officerId}/week/`);
      setWeekMetrics(response.data);
    } catch (error) {
      console.error('Error fetching week metrics:', error);
    }
  };

  const fetchDailyHistory = async () => {
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const client = apiClient.getClient();
      const response = await client.get(
        `/loan-processor/officers/${officerId}/daily-history/?start_date=${startDate}&end_date=${endDate}`
      );
      setDailyHistory(response.data);
    } catch (error) {
      console.error('Error fetching daily history:', error);
    }
  };

  const fetchMonthlyHistory = async () => {
    try {
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth() + 1;

      const client = apiClient.getClient();
      const response = await client.get(
        `/loan-processor/officers/${officerId}/monthly-history/?year=${year}&month=${month}`
      );
      setMonthlyHistory(response.data);
    } catch (error) {
      console.error('Error fetching monthly history:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">Loading officer analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Officer Performance Analytics</h1>
          <p className="text-gray-600">Officer ID: {officerId} &middot; As of {new Date().toLocaleDateString()}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => window.location.href = '/escalation_portal'}
            className="border-blue-300 text-blue-700 hover:bg-blue-50"
          >
            <ExternalLink size={16} className="mr-2" />
            Escalation Portal
          </Button>

          <Button
            variant="outline"
            onClick={() => window.location.href = '/escalation_portal/list'}
            className="border-purple-300 text-purple-700 hover:bg-purple-50"
          >
            <List size={16} className="mr-2" />
            Escalation Lists
          </Button>

          <Button variant="outline" onClick={fetchAllData}>
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* View Selector */}
      <div className="inline-flex items-center gap-1 rounded-lg bg-gray-200/60 p-1">
        {([
          { key: 'month', label: 'Month View' },
          { key: 'week', label: 'Week View' },
          { key: 'history', label: 'History' },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedView(tab.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              selectedView === tab.key
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* MONTH VIEW */}
      {selectedView === 'month' && monthMetrics && (
        <div className="space-y-6">
          {/* Month Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
              icon={Target}
              iconBg="bg-blue-100"
              iconColor="text-blue-600"
              label="Monthly Target"
              hint="Total cumulative balance target for the current month from all assigned installments"
              value={formatCurrency(monthMetrics.monthly_target.current_month_target)}
            />
            <StatCard
              icon={DollarSign}
              iconBg="bg-green-100"
              iconColor="text-green-600"
              label="Collected MTD"
              hint="Total amount collected from the start of the month until today"
              value={formatCurrency(monthMetrics.progress.collected_month_to_date)}
              valueClassName="text-green-600"
            />
            <StatCard
              icon={Target}
              iconBg="bg-orange-100"
              iconColor="text-orange-600"
              label="Pending Collections"
              hint="Total current outstanding balance still to be collected"
              value={formatCurrency(monthMetrics.monthly_target.total_current_balance)}
              valueClassName="text-orange-600"
            />
            <StatCard
              icon={Activity}
              iconBg="bg-purple-100"
              iconColor="text-purple-600"
              label="Collection Rate"
              hint="Percentage of monthly target collected so far (Collected / Monthly Target)"
              value={`${monthMetrics.progress.collection_rate?.toFixed(1)}%`}
            />
            <StatCard
              icon={AlertCircle}
              iconBg={
                monthMetrics.performance_analysis.risk_level === 'low' ? 'bg-green-100' :
                monthMetrics.performance_analysis.risk_level === 'medium' ? 'bg-yellow-100' :
                'bg-red-100'
              }
              iconColor={
                monthMetrics.performance_analysis.risk_level === 'low' ? 'text-green-600' :
                monthMetrics.performance_analysis.risk_level === 'medium' ? 'text-yellow-600' :
                'text-red-600'
              }
              label="Risk Level"
              hint="Overall risk assessment based on overdue percentage, collection pace, and recovery possibility"
              value={<span className="capitalize">{monthMetrics.performance_analysis.risk_level}</span>}
            />
          </div>

          {/* PR Bucket Breakdown (NEW) */}
          <Card className="rounded-xl border border-gray-200 shadow-sm">
            <CardHeader>
              <SectionTitle
                icon={Layers}
                hint="CBK loan-aging categorization: percentaged target, amounts posted, and commission earned, broken down by PR bucket"
              >
                PR Bucket Breakdown
              </SectionTitle>
            </CardHeader>
            <CardContent>
              <PRBucketBreakdownGrid
                breakdown={monthMetrics.pr_bucket_metrics?.pr_bucket_breakdown}
                overall={{
                  daily_target: monthMetrics.pr_bucket_metrics?.daily_percentaged_target,
                  monthly_target: monthMetrics.pr_bucket_metrics?.monthly_percentaged_target,
                  daily_posted: monthMetrics.pr_bucket_metrics?.daily_posted,
                  monthly_posted: monthMetrics.pr_bucket_metrics?.monthly_posted,
                  daily_commission: monthMetrics.pr_bucket_metrics?.daily_commission,
                  monthly_commission: monthMetrics.pr_bucket_metrics?.monthly_commission,
                }}
              />
            </CardContent>
          </Card>

          {/* Progress Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="rounded-xl border border-gray-200 shadow-sm">
              <CardHeader>
                <SectionTitle icon={Gauge} hint="How far into the month we are (days passed) vs collection progress">
                  Month Progress
                </SectionTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Time Progress: {monthMetrics.days_passed}/{monthMetrics.days_in_month} days</span>
                      <span>{monthMetrics.month_progress_percentage?.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${monthMetrics.month_progress_percentage}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Collection Progress</span>
                      <span>{monthMetrics.progress.collection_rate?.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: `${Math.min(monthMetrics.progress.collection_rate, 100)}%` }} />
                    </div>
                  </div>
                  <div className="pt-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                    <p><strong>Analysis:</strong> {monthMetrics.progress.collection_rate < monthMetrics.month_progress_percentage ?
                      `Collection is behind schedule by ${(monthMetrics.month_progress_percentage - monthMetrics.progress.collection_rate).toFixed(1)}%.` :
                      `Collection is ahead of schedule!`}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl border border-gray-200 shadow-sm">
              <CardHeader>
                <SectionTitle icon={TrendingUp} hint="Key performance indicators comparing expected vs actual collection">
                  Performance Snapshot
                </SectionTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <p className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusColor(monthMetrics.performance_analysis.status)}`}>
                      {monthMetrics.performance_analysis.status}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Collection Pace</p>
                    <p className="font-medium">{monthMetrics.performance_analysis.collection_pace}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Efficiency Ratio</p>
                    <p className="font-medium">{monthMetrics.performance_analysis.efficiency_ratio?.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Recovery Possible</p>
                    <p className="font-medium">{monthMetrics.performance_analysis.recovery_possible ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Weekly Breakdown Chart */}
          <Card className="rounded-xl border border-gray-200 shadow-sm">
            <CardHeader>
              <SectionTitle icon={BarChart3} hint="Shows target vs actual collected by week. 'In Progress' weeks are current, 'Completed' are past">
                Weekly Collection Performance
              </SectionTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthMetrics.weekly_breakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week_number" label={{ value: 'Week Number', position: 'insideBottom', offset: -5 }} />
                    <YAxis tickFormatter={(value: any) => `KSh ${(value / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: any) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="target" name="Weekly Target" fill="#8884d8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="collected" name="Collected" fill="#82ca9d" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Installments & Peer Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="rounded-xl border border-gray-200 shadow-sm">
              <CardHeader>
                <SectionTitle icon={List} hint="Breakdown of installments: Total assigned to officer, current month status, overdue count">
                  Installments Overview
                </SectionTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Total Assigned:</span>
                    <span className="font-medium">{monthMetrics.installments_breakdown.total_assigned}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Current Month:</span>
                    <span className="font-medium">{monthMetrics.installments_breakdown.current_month}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Current Month Paid:</span>
                    <span className="font-medium text-green-600">{monthMetrics.installments_breakdown.current_month_paid}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Active This Month:</span>
                    <span className="font-medium text-orange-600">{monthMetrics.installments_breakdown.current_month_active}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Paid Off Total:</span>
                    <span className="font-medium text-green-600">{monthMetrics.installments_breakdown.paid_off_total}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Overdue Total:</span>
                    <span className="font-medium text-red-600">{monthMetrics.installments_breakdown.overdue_total}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl border border-gray-200 shadow-sm">
              <CardHeader>
                <SectionTitle icon={Users} hint="How this officer performs compared to peers. Positive numbers mean better than average.">
                  Peer Comparison
                </SectionTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Target vs Peer Avg:</span>
                    <span className={`font-medium ${monthMetrics.peer_comparison.load_comparison.target_vs_avg >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(monthMetrics.peer_comparison.load_comparison.target_vs_avg)}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Collection Rate vs Avg:</span>
                    <span className={`font-medium ${monthMetrics.peer_comparison.comparison_vs_avg >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {monthMetrics.peer_comparison.comparison_vs_avg?.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Percentile:</span>
                    <span className="font-medium">{monthMetrics.peer_comparison.percentile}th</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Rank:</span>
                    <span className="font-medium capitalize">{monthMetrics.peer_comparison.rank}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Call & Promise Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="rounded-xl border border-gray-200 shadow-sm">
              <CardHeader>
                <SectionTitle icon={Phone} hint="Today's call activity: total calls, successful connections, average duration">
                  Call Metrics
                </SectionTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Calls Made Today</p>
                    <p className="text-xl font-bold">{monthMetrics.call_metrics.calls_made_today}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Successful Calls</p>
                    <p className="text-xl font-bold">{monthMetrics.call_metrics.successful_calls_today}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Success Rate</p>
                    <p className="text-xl font-bold">{monthMetrics.call_metrics.call_success_rate}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Avg Duration</p>
                    <p className="text-xl font-bold">{monthMetrics.call_metrics.avg_duration}s</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl border border-gray-200 shadow-sm">
              <CardHeader>
                <SectionTitle icon={Mail} hint="Payment promises received vs fulfilled today. Fulfilled shows actual collection from promises.">
                  Promise Metrics
                </SectionTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Promises Received</p>
                    <p className="text-xl font-bold">{monthMetrics.promise_metrics.promises_received_today}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Promised Amount</p>
                    <p className="text-xl font-bold text-blue-600">{formatCurrency(parseFloat(monthMetrics.promise_metrics.promised_amount_today))}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Fulfilled Count</p>
                    <p className="text-xl font-bold text-green-600">{monthMetrics.promise_metrics.promises_fulfilled_today}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Fulfilled Amount</p>
                    <p className="text-xl font-bold text-green-600">{formatCurrency(parseFloat(monthMetrics.promise_metrics.fulfilled_amount_today))}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* WEEK VIEW */}
      {selectedView === 'week' && weekMetrics && (
        <div className="space-y-6">
          {/* Week Header Info */}
          <Card className="rounded-xl border border-blue-100 shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <div>
                  <p className="text-sm text-gray-600">Week {weekMetrics.week_number} &middot; {weekMetrics.year}</p>
                  <p className="text-lg font-semibold">{formatDate(weekMetrics.week_start)} - {formatDate(weekMetrics.week_end)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Days Passed: {weekMetrics.days_passed} | Days Remaining: {weekMetrics.days_remaining}</p>
                  <p className="text-sm font-medium">Week Progress: {weekMetrics.week_progress_percentage?.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Week Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Target}
              iconBg="bg-blue-100"
              iconColor="text-blue-600"
              label="Full Week Target"
              hint="Total target for the entire week (all days included)"
              value={formatCurrency(weekMetrics.weekly_targets.full_week_target)}
            />
            <StatCard
              icon={DollarSign}
              iconBg="bg-green-100"
              iconColor="text-green-600"
              label="Collected WTD"
              hint="Total amount collected from Monday (week start) until today"
              value={formatCurrency(weekMetrics.collected_week_to_date)}
              valueClassName="text-green-600"
            />
            <StatCard
              icon={Clock}
              iconBg="bg-purple-100"
              iconColor="text-purple-600"
              label="Collection Rate"
              hint="Collected vs Week-to-Date Target"
              value={`${weekMetrics.collection_rate_vs_week_to_date?.toFixed(1)}%`}
            />
            <StatCard
              icon={Activity}
              iconBg={weekMetrics.on_track ? 'bg-green-100' : 'bg-red-100'}
              iconColor={weekMetrics.on_track ? 'text-green-600' : 'text-red-600'}
              label="Week Status"
              hint="Whether weekly collection is on track to meet target"
              value={weekMetrics.on_track ? 'On Track' : 'Behind'}
            />
          </div>

          {/* PR Bucket Breakdown (NEW) */}
          <Card className="rounded-xl border border-gray-200 shadow-sm">
            <CardHeader>
              <SectionTitle
                icon={Layers}
                hint="CBK loan-aging categorization: percentaged target, amounts posted, and commission earned, broken down by PR bucket"
              >
                PR Bucket Breakdown
              </SectionTitle>
            </CardHeader>
            <CardContent>
              <PRBucketBreakdownGrid
                breakdown={weekMetrics.pr_bucket_metrics?.pr_bucket_breakdown}
                overall={{
                  daily_target: weekMetrics.pr_bucket_metrics?.daily_percentaged_target,
                  monthly_target: weekMetrics.pr_bucket_metrics?.monthly_percentaged_target,
                  daily_posted: weekMetrics.pr_bucket_metrics?.daily_posted,
                  monthly_posted: weekMetrics.pr_bucket_metrics?.monthly_posted,
                  daily_commission: weekMetrics.pr_bucket_metrics?.daily_commission,
                  monthly_commission: weekMetrics.pr_bucket_metrics?.monthly_commission,
                }}
              />
            </CardContent>
          </Card>

          {/* Daily Breakdown Chart */}
          <Card className="rounded-xl border border-gray-200 shadow-sm">
            <CardHeader>
              <SectionTitle icon={BarChart3} hint="Daily collected amount vs cumulative target. Shows progress day by day.">
                Daily Collection Trend
              </SectionTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={weekMetrics.daily_breakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day_name" />
                    <YAxis yAxisId="left" tickFormatter={(value: any) => `KSh ${(value / 1000).toFixed(0)}k`} />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip formatter={(value: any, name: string) => {
                      if (name === 'collected_today') return formatCurrency(value);
                      if (name === 'daily_cumulative_target') return formatCurrency(value);
                      return value;
                    }} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="collected_today" name="Collected Today" fill="#82ca9d" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="left" type="monotone" dataKey="daily_cumulative_target" name="Cumulative Target" stroke="#8884d8" strokeWidth={2} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Daily Details Table */}
          <Card className="rounded-xl border border-gray-200 shadow-sm">
            <CardHeader>
              <SectionTitle icon={List} hint="Performance for each day: target, collected, overdue count, and achievement percentage">
                Daily Breakdown
              </SectionTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border border-gray-100">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Day</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Date</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Target</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Collected</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Paid Off Count</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Overdue (Cum.)</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Achievement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weekMetrics.daily_breakdown.map((day, idx) => (
                      <tr key={idx} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{day.day_name}</td>
                        <td className="py-3 px-4 text-gray-600">{formatDate(day.date)}</td>
                        <td className="py-3 px-4 text-right">{formatCurrency(day.daily_cumulative_target)}</td>
                        <td className="py-3 px-4 text-right text-green-600">{formatCurrency(day.collected_today)}</td>
                        <td className="py-3 px-4 text-right">{day.paid_off_count_today}</td>
                        <td className="py-3 px-4 text-right text-red-600">{day.cumulative_overdue_up_to_day}</td>
                        <td className="py-3 px-4 text-right">
                          <span className={`px-2 py-1 rounded-full text-xs ${day.cumulative_achievement >= 80 ? 'bg-green-100 text-green-700' : day.cumulative_achievement >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                            {day.cumulative_achievement?.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Week Projections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="rounded-xl border border-gray-200 shadow-sm">
              <CardHeader>
                <SectionTitle icon={TrendingUp} hint="Based on average daily collection so far, projected end-of-week total and variance from target">
                  Projections
                </SectionTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span>Average Daily Collection:</span>
                    <span className="font-medium">{formatCurrency(weekMetrics.average_daily_collection)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span>Projected Weekly Total:</span>
                    <span className="font-medium">{formatCurrency(weekMetrics.projected_weekly_collection)}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span>Projected vs Full Target:</span>
                    <span className={`font-medium ${weekMetrics.projected_vs_target >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(weekMetrics.projected_vs_target)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl border border-gray-200 shadow-sm">
              <CardHeader>
                <SectionTitle icon={Award} hint="Best and worst performing days based on collection amount and target achievement">
                  Efficiency Metrics
                </SectionTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span>Best Collection Day:</span>
                    <span className="font-medium text-green-600">
                      {weekMetrics.enhanced_metrics.efficiency.best_collection_day.date
                        ? formatDate(weekMetrics.enhanced_metrics.efficiency.best_collection_day.date)
                        : 'N/A'}
                      {' '}({formatCurrency(weekMetrics.enhanced_metrics.efficiency.best_collection_day.amount)})
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span>Best Achievement Day:</span>
                    <span className="font-medium">
                      {weekMetrics.enhanced_metrics.efficiency.best_cumulative_day.date
                        ? formatDate(weekMetrics.enhanced_metrics.efficiency.best_cumulative_day.date)
                        : 'N/A'}
                      {' '}({weekMetrics.enhanced_metrics.efficiency.best_cumulative_day.achievement?.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span>Target Accuracy Range:</span>
                    <span className="font-medium">
                      {weekMetrics.enhanced_metrics.efficiency.target_accuracy_range.min?.toFixed(1)}% - {weekMetrics.enhanced_metrics.efficiency.target_accuracy_range.max?.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Call & Promise Metrics for Week View */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="rounded-xl border border-gray-200 shadow-sm">
              <CardHeader>
                <SectionTitle icon={Phone}>Today's Call Metrics</SectionTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Calls Made</p>
                    <p className="text-2xl font-bold">{weekMetrics.call_metrics.calls_made_today}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Success Rate</p>
                    <p className="text-2xl font-bold">{weekMetrics.call_metrics.call_success_rate}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Avg Duration</p>
                    <p className="text-2xl font-bold">{weekMetrics.call_metrics.avg_duration}s</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl border border-gray-200 shadow-sm">
              <CardHeader>
                <SectionTitle icon={Mail}>Today's Promise Metrics</SectionTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Promises Received</p>
                    <p className="text-2xl font-bold">{weekMetrics.promise_metrics.promises_received_today}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Promised Amount</p>
                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(parseFloat(weekMetrics.promise_metrics.promised_amount_today))}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Fulfilled Count</p>
                    <p className="text-2xl font-bold text-green-600">{weekMetrics.promise_metrics.promises_fulfilled_today}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Fulfilled Amount</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(parseFloat(weekMetrics.promise_metrics.fulfilled_amount_today))}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* HISTORY VIEW */}
      {selectedView === 'history' && (
        <div className="space-y-6">
          {/* Daily Trend Chart */}
          {dailyHistory && dailyHistory.data.length > 0 && (
            <Card className="rounded-xl border border-gray-200 shadow-sm">
              <CardHeader>
                <SectionTitle icon={BarChart3} hint="Shows daily collected amount vs daily cumulative balance over time. Green bars are collections, line shows total assigned balance.">
                  Daily Collection Trend (Last 30 Days)
                </SectionTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={dailyHistory.data.slice(-30)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" tickFormatter={(value: any) => `KSh ${(value / 1000).toFixed(0)}k`} />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip formatter={(value: any) => formatCurrency(value)} />
                      <Legend />
                      <Bar yAxisId="left" dataKey="collected_during_day" name="Collected Daily" fill="#82ca9d" radius={[4, 4, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="daily_cumulative_balance" name="Cumulative Balance" stroke="#8884d8" strokeWidth={2} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Collection Rate Trend */}
          {dailyHistory && dailyHistory.data.length > 0 && (
            <Card className="rounded-xl border border-gray-200 shadow-sm">
              <CardHeader>
                <SectionTitle icon={Percent} hint="Daily collection rate percentage shows what % of the target was collected each day.">
                  Collection Rate Trend
                </SectionTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyHistory.data.slice(-30)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[0, 100]} tickFormatter={(value: any) => `${value}%`} />
                      <Tooltip formatter={(value: any) => `${value?.toFixed(1)}%`} />
                      <Legend />
                      <Line type="monotone" dataKey="collection_rate" name="Daily Collection Rate %" stroke="#ff7300" strokeWidth={2} />
                      <Line type="monotone" dataKey="daily_target_achievement" name="Daily Target Achievement %" stroke="#387908" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Call & Promise Trend */}
          {dailyHistory && dailyHistory.data.length > 0 && (
            <Card className="rounded-xl border border-gray-200 shadow-sm">
              <CardHeader>
                <SectionTitle icon={Phone} hint="Shows calls made vs successful calls over time. The gap indicates missed connections.">
                  Call Activity Trend
                </SectionTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={dailyHistory.data.slice(-30)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickFormatter={(value: any) => `${value}%`} />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="calls_made" name="Calls Made" fill="#8884d8" radius={[4, 4, 0, 0]} />
                      <Bar yAxisId="left" dataKey="successful_calls" name="Successful Calls" fill="#82ca9d" radius={[4, 4, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="call_success_rate" name="Success Rate %" stroke="#ff7300" strokeWidth={2} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Daily History Table */}
          <Card className="rounded-xl border border-gray-200 shadow-sm">
            <CardHeader>
              <SectionTitle icon={List} hint="Complete daily breakdown including collection, calls, promises, and achievement rates">
                Daily Performance Log
              </SectionTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border border-gray-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-3 px-3">Date</th>
                      <th className="text-right py-3 px-3">Collected</th>
                      <th className="text-right py-3 px-3">Cumulative Balance</th>
                      <th className="text-right py-3 px-3">Collection Rate</th>
                      <th className="text-right py-3 px-3">Calls/Success</th>
                      <th className="text-right py-3 px-3">Promises/Resolved</th>
                      <th className="text-right py-3 px-3">Target Achieved</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyHistory?.data?.slice().reverse().slice(0, 30).map((day, idx) => (
                      <tr key={idx} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                        <td className="py-3 px-3 font-medium">{formatDate(day.date)}</td>
                        <td className="py-3 px-3 text-right text-green-600">{formatCurrency(day.collected_during_day)}</td>
                        <td className="py-3 px-3 text-right">{formatCurrency(day.daily_cumulative_balance)}</td>
                        <td className="py-3 px-3 text-right">{day.collection_rate?.toFixed(1)}%</td>
                        <td className="py-3 px-3 text-right">{day.calls_made}/{day.successful_calls}</td>
                        <td className="py-3 px-3 text-right">{day.promises_received}/{day.resolved}</td>
                        <td className="py-3 px-3 text-right">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${day.daily_target_achievement >= 80 ? 'bg-green-100 text-green-700' : day.daily_target_achievement >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                            {day.daily_target_achievement?.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Summary */}
          {monthlyHistory && monthlyHistory.data.length > 0 && (
            <Card className="rounded-xl border border-gray-200 shadow-sm">
              <CardHeader>
                <SectionTitle icon={Calendar} hint="Month-over-month collection totals, collection rates, resolved counts, and PR bucket performance">
                  Monthly Performance Summary
                </SectionTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {monthlyHistory.data.map((month, idx) => (
                    <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-100 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-xs text-gray-500">
                            {month.year_annot}-{String(month.month_annot).padStart(2, '0')}
                          </p>
                          <p className="font-medium text-sm text-gray-900">
                            {formatDate(month.month_start_date)} - {formatDate(month.month_end_date)}
                          </p>
                        </div>
                        {typeof month.cumulative_balance_change_percentage === 'number' && (
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                            month.cumulative_balance_change <= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            Balance {month.cumulative_balance_change >= 0 ? '+' : ''}{month.cumulative_balance_change_percentage?.toFixed(1)}%
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <MiniStat label="Total Collected" value={formatCurrency(month.total_collected_month)} tone="green" />
                        <MiniStat label="Collected (MTD End)" value={formatCurrency(month.total_collected_mtd_end)} />
                        <MiniStat label="Collection Rate" value={`${month.avg_collection_rate?.toFixed(1)}%`} />
                        <MiniStat label="Resolved" value={month.total_resolved_month} />
                        <MiniStat label="Calls" value={month.total_calls} />
                        <MiniStat label="Promises" value={month.total_promises} />
                        <MiniStat label="Repayments" value={month.total_repayments} />
                        <MiniStat label="Daily Target Achv." value={`${month.avg_daily_target_achievement?.toFixed(1)}%`} />
                      </div>

                      <PRBucketBreakdownGrid
                        compact
                        breakdown={month.pr_bucket_breakdown}
                        overall={{
                          daily_target: month.avg_daily_percentaged_target,
                          monthly_target: month.monthly_percentaged_target,
                          daily_posted: month.total_daily_posted,
                          monthly_posted: month.monthly_posted,
                          daily_commission: month.total_daily_commission,
                          monthly_commission: month.monthly_commission,
                        }}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}