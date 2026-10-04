// components/installments/shared.tsx
// Shared types, formatters, badges, summary panel and table columns for the
// "All Installments" (/installments) and "My Installments" (/my_installments)
// pages. Kept in one place so both pages stay in sync with the
// InstallmentDetailSerializer / InstallmentViewSet contract.
//
// PR BUCKETS -- LIVE vs STATIC MONTHLY
//   pr_bucket                -> LIVE bucket, recalculated daily as the installment ages.
//   static_monthly_pr_bucket -> captured at the first update of the month and frozen
//                               until next month. Target, posted and commission for the
//                               month are all calculated against THIS bucket, and the
//                               backend's pr_bucket_summary is grouped by it.
'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle, XCircle, Clock, AlertCircle, Flag,
  Users, TrendingUp, Wallet, PieChart, CalendarClock, Percent, Banknote
} from 'lucide-react';
import { usePRVisibility, NO_PR_VISIBILITY, type PRVisibility } from '@/hooks/user-pr-visibility';

// ============================================================================
// TYPES -- mirrors InstallmentDetailSerializer / InstallmentViewSet responses
// ============================================================================

export interface OfficerBasic {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
}

export interface PRBucketConfigInfo {
  id: string;
  bucket_code: string;
  team: string;
  target_percentage: number;
  commission_percentage: number;
  is_active: boolean;
}

export interface PaymentProgress {
  percentage: number;
  repaid: number;
  total: number;
  status: 'paid_off' | 'partial' | 'unpaid';
}

export interface Installment {
  id: string;
  installment_id: number;
  plan_id: string | null;
  plan_type: string;
  plan_type_display: string;
  main_loan: string;
  loan_id: string;
  customer_name: string;
  phone_number: string;
  registration_number: string;
  identity_num: string;
  loan_status: number;
  loan_status_text: string;
  loan_due_date: string | null;
  loan_is_overdue: boolean;
  loan_assigned_officer_details: OfficerBasic | null;
  total_amount: string;
  repaid: string;
  balance: string;
  cumulative_balance: string;
  due_date: string;
  start_date: string | null;
  actual_repay_date: string | null;
  days_until_due: number;
  days_until_due_display: string;
  is_overdue: boolean;
  is_current_month: boolean;
  paid_off: boolean;
  partially_paid: boolean;
  principal_due: string;
  principal_paid: string;
  interest_due: string;
  interest_paid: string;
  penalty_due: string;
  penalty_paid: string;
  tracking_fees_due: string;
  tracking_fees_paid: string;
  loan_maintenance_fee_due: string;
  loan_maintenance_fee_paid: string;
  other_charges_due: string;
  other_charges_paid: string;
  early_settlement_interest_due: string;
  early_settlement_interest_paid: string;
  assigned_officer: number | null;
  assigned_officer_details: OfficerBasic | null;
  status: number;
  status_text: string;
  is_active: boolean;
  payment_progress: PaymentProgress | null;
  created_at: string;
  updated_at: string;
  actual_installment_due_days: number;
  /** LIVE bucket -- moves daily as the installment ages. */
  pr_bucket: string | null;
  pr_bucket_display?: string | null;
  /** STATIC bucket for the month -- the one target/posted/commission are calculated against. */
  static_monthly_pr_bucket: string | null;
  static_monthly_pr_bucket_display?: string | null;
  static_monthly_pr_bucket_updated_at?: string | null;
  pr_bucket_team: string | null;
  pr_bucket_team_display?: string | null;
  percentaged_target: string | null;
  percentaged_target_updated_at: string | null;
  installment_commission: string | null;
  commission_baseline_repaid: string | null;
  commission_baseline_at: string | null;
  monthly_repaid_amount: number;
  /** Config for static_monthly_pr_bucket (falls back to the live bucket until the static one is captured). */
  pr_bucket_config: PRBucketConfigInfo | null;
}

export interface InstallmentSummary {
  total_installments: number;
  total_balance: number;
  total_cumulative_balance: number;
  current_month_cumulative_balance: number;
  current_month_count: number;
  total_overdue: number;
  total_current_month: number;
  total_paid_off: number;
  total_amount_due: number;
  total_repaid: number;
  total_commission: number;
  total_percentaged_target: number;
  /** RepaymentRecord amount posted within the posted_period window, for the loans in this group. */
  total_posted: number;
}

/** Keyed by static_monthly_pr_bucket (plus 'unassigned' for installments with none). */
export type PRBucketSummaryMap = Record<string, InstallmentSummary>;

export interface InstallmentsResponse {
  summary: InstallmentSummary;
  pr_bucket_summary: PRBucketSummaryMap;
  /** Window total_posted was summed over (follows due_date_after/_before, else this month). */
  posted_period?: { start: string; end: string };
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  results: Installment[];
}

export const EMPTY_SUMMARY: InstallmentSummary = {
  total_installments: 0,
  total_balance: 0,
  total_cumulative_balance: 0,
  current_month_cumulative_balance: 0,
  current_month_count: 0,
  total_overdue: 0,
  total_current_month: 0,
  total_paid_off: 0,
  total_amount_due: 0,
  total_repaid: 0,
  total_commission: 0,
  total_percentaged_target: 0,
  total_posted: 0,
};

// ============================================================================
// CONSTANTS -- mirrors backend PRBucket / PRBucketTeam choices
// ============================================================================

export const PR_BUCKETS: { value: string; label: string; color: string }[] = [
  { value: 'CURRENT', label: 'Current (Not Yet Due)', color: 'green' },
  { value: 'PR30', label: '1-30 Days', color: 'amber' },
  { value: 'PR31_60', label: '31-60 Days', color: 'orange' },
  { value: 'PR61_90', label: '61-90 Days', color: 'red' },
  { value: 'PR90_PLUS', label: '90+ Days', color: 'rose' },
];

export const PR_BUCKET_TEAMS: { value: string; label: string }[] = [
  { value: 'collections', label: 'Collections' },
  { value: 'auctioneer', label: 'Auctioneer' },
  { value: 'third_party', label: 'Third Party' },
  { value: 'legal', label: 'Legal' },
];

/**
 * Query param to filter the list by the SAME bucket the summary cards are grouped by.
 * Use this (not `pr_bucket`, which is the live bucket) when a bucket card is clicked,
 * otherwise the filtered rows won't match the card's counts.
 */
export const PR_BUCKET_FILTER_PARAM = 'static_monthly_pr_bucket';

const PR_BUCKET_ORDER = ['CURRENT', 'PR30', 'PR31_60', 'PR61_90', 'PR90_PLUS', 'unassigned'];

export function prBucketLabel(bucketKey: string): string {
  if (bucketKey === 'unassigned') return 'No Bucket';
  return PR_BUCKETS.find(b => b.value === bucketKey)?.label || bucketKey;
}

// Sorts a pr_bucket_summary map into the canonical CURRENT -> PR90_PLUS -> unassigned order.
export function sortedBucketEntries(
  prBucketSummary: PRBucketSummaryMap | undefined | null
): [string, InstallmentSummary][] {
  if (!prBucketSummary) return [];
  return Object.entries(prBucketSummary).sort(
    ([a], [b]) => PR_BUCKET_ORDER.indexOf(a) - PR_BUCKET_ORDER.indexOf(b)
  );
}

/** Bucket used for this month's target/commission -- static, falling back to live until captured. */
export const effectivePRBucket = (row: Pick<Installment, 'static_monthly_pr_bucket' | 'pr_bucket'>) =>
  row.static_monthly_pr_bucket ?? row.pr_bucket;

// ============================================================================
// PERFORMANCE RATE -- same formula as the backend's percentaged_performance_rate:
// (amount posted / percentaged target) * 100. Undefined when there is no target,
// so the UI shows "—" instead of a misleading 0%.
// ============================================================================

export const prPerformanceRate = (
  posted: string | number | null | undefined,
  target: string | number | null | undefined
): number | undefined => {
  const t = parseFloat(String(target ?? '0')) || 0;
  if (t <= 0) return undefined;
  const p = parseFloat(String(posted ?? '0')) || 0;
  return (p / t) * 100;
};

/** 70% / 40% thresholds, matching the analytics dashboard's rate pills. */
const performanceRateTone = (rate: number) =>
  rate >= 70
    ? { pill: 'bg-green-100 text-green-800', bar: 'bg-green-500' }
    : rate >= 40
      ? { pill: 'bg-yellow-100 text-yellow-800', bar: 'bg-yellow-500' }
      : { pill: 'bg-red-100 text-red-800', bar: 'bg-red-500' };

export const PerformanceRateBadge = ({ rate, showBar = false }: { rate: number | undefined; showBar?: boolean }) => {
  if (rate === undefined) return <span className="text-xs text-gray-300" title="No percentaged target">—</span>;
  const tone = performanceRateTone(rate);
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-medium ${tone.pill}`}
        title="Performance rate = posted this month ÷ percentaged target × 100"
      >
        {rate.toFixed(1)}%
      </span>
      {showBar && (
        <span className="block h-1 w-16 overflow-hidden rounded-full bg-gray-200" aria-hidden="true">
          <span className={`block h-full ${tone.bar}`} style={{ width: `${Math.min(Math.max(rate, 0), 100)}%` }} />
        </span>
      )}
    </span>
  );
};

// ============================================================================
// FORMATTERS
// ============================================================================

export const formatCurrency = (value: string | number | undefined | null) => {
  const amount = parseFloat(String(value ?? '0')) || 0;
  return `KSh ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatCurrencyCompact = (value: string | number | undefined | null) => {
  const amount = parseFloat(String(value ?? '0')) || 0;
  return `KSh ${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
};

export const formatDate = (value: string | null | undefined) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const officerFullName = (officer: OfficerBasic | null | undefined) => {
  if (!officer) return null;
  const name = `${officer.first_name || ''} ${officer.last_name || ''}`.trim();
  return name || officer.username;
};

// ============================================================================
// STATUS / PR BUCKET BADGES
// (a zero-or-negative cumulative balance always reads as "Paid")
// ============================================================================

export const InstallmentStatusBadge = ({ installment }: { installment: Installment }) => {
  const isClosedByZeroBalance = parseFloat(installment.cumulative_balance) <= 0;
  const isPaid = installment.paid_off || isClosedByZeroBalance;

  if (isPaid) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <CheckCircle className="w-3 h-3 mr-1" />
        Paid
      </span>
    );
  }
  if (installment.is_overdue) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <XCircle className="w-3 h-3 mr-1" />
        Overdue
      </span>
    );
  }
  if (installment.is_current_month) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        <Clock className="w-3 h-3 mr-1" />
        Current Month
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
      Upcoming
    </span>
  );
};

const PR_BUCKET_COLOR_CLASSES: Record<string, string> = {
  green: 'bg-green-100 text-green-800 border-green-200',
  amber: 'bg-amber-100 text-amber-800 border-amber-200',
  orange: 'bg-orange-100 text-orange-800 border-orange-200',
  red: 'bg-red-100 text-red-800 border-red-200',
  rose: 'bg-rose-100 text-rose-800 border-rose-200',
};

export const PRBucketBadge = ({ bucket }: { bucket: string | null | undefined }) => {
  if (!bucket) {
    return (
      <Badge variant="secondary" className="gap-1">
        <Flag size={12} /> No Bucket
      </Badge>
    );
  }
  const found = PR_BUCKETS.find(b => b.value === bucket);
  const colorClass = PR_BUCKET_COLOR_CLASSES[found?.color || 'amber'];
  return (
    <Badge className={`${colorClass} gap-1`}>
      <Clock size={12} /> {found?.label || bucket}
    </Badge>
  );
};

/**
 * Static monthly bucket badge, plus a small "Now: …" note when the live bucket has
 * since moved on -- so users can see why an installment in e.g. 31-60 days is still
 * earning 1-30 commission this month.
 */
export const MonthlyPRBucketCell = ({ installment }: { installment: Installment }) => {
  const monthly = effectivePRBucket(installment);
  const live = installment.pr_bucket;
  const moved = !!installment.static_monthly_pr_bucket && !!live && live !== installment.static_monthly_pr_bucket;
  return (
    <div className="flex flex-col items-start gap-0.5">
      <PRBucketBadge bucket={monthly} />
      {moved && (
        <span
          className="text-[11px] text-gray-500 whitespace-nowrap"
          title="Live bucket today. This month's target and commission stay on the monthly bucket until the 1st."
        >
          Now: {prBucketLabel(live!)}
        </span>
      )}
    </div>
  );
};

// ============================================================================
// SUMMARY PANEL -- overview cards + per-PR-bucket breakdown grid
// ============================================================================

interface SummaryPanelProps {
  summary: InstallmentSummary;
  prBucketSummary: PRBucketSummaryMap;
  isLoading: boolean;
  activeBucket?: string;
  onSelectBucket?: (bucket: string | undefined) => void;
}

export const InstallmentSummaryPanel: React.FC<SummaryPanelProps> = ({
  summary, prBucketSummary, isLoading, activeBucket, onSelectBucket,
}) => {
  const { canViewTarget, canViewCommission, canViewPRBuckets, canViewPostedPRAmount } = usePRVisibility();
  // The rate exposes posted relative to target, so it needs both permissions.
  const canViewRate = canViewTarget && canViewPostedPRAmount;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  const overallRate = prPerformanceRate(summary.total_posted, summary.total_percentaged_target);

  const cards = [
    {
      label: 'Total Installments',
      value: summary.total_installments.toLocaleString(),
      sub: `${summary.total_paid_off.toLocaleString()} paid off`,
      icon: Wallet,
      color: 'blue',
      visible: true,
    },
    {
      label: 'Current Month',
      value: summary.current_month_count.toLocaleString(),
      sub: formatCurrencyCompact(summary.current_month_cumulative_balance),
      icon: CalendarClock,
      color: 'purple',
      visible: true,
    },
    {
      label: 'Overdue',
      value: summary.total_overdue.toLocaleString(),
      sub: `Repaid: ${formatCurrencyCompact(summary.total_repaid)}`,
      icon: AlertCircle,
      color: 'red',
      visible: true,
    },
    {
      label: 'Percentaged Target',
      value: formatCurrencyCompact(summary.total_percentaged_target),
      sub: 'CBK PR bucket target',
      icon: Percent,
      color: 'amber',
      visible: canViewTarget,
    },
    {
      label: 'Posted (Month)',
      value: formatCurrencyCompact(summary.total_posted),
      sub: canViewRate
        ? overallRate === undefined ? 'No target to measure against' : `${overallRate.toFixed(1)}% of target`
        : 'Posted against PR loans',
      icon: Banknote,
      color: 'indigo',
      visible: canViewPostedPRAmount,
    },
    {
      label: 'Commission',
      value: formatCurrency(summary.total_commission),
      sub: 'Current month commission',
      icon: TrendingUp,
      color: 'green',
      visible: canViewCommission,
    },
  ].filter((c) => c.visible);

  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    indigo: 'bg-indigo-100 text-indigo-600',
    purple: 'bg-purple-100 text-purple-600',
    red: 'bg-red-100 text-red-600',
    amber: 'bg-amber-100 text-amber-600',
    green: 'bg-green-100 text-green-600',
  };

  const cardGridCols =
    // 6 cards only fit without truncating amounts on very wide screens; wrap to 2 rows of 3 below that.
    cards.length >= 6 ? 'lg:grid-cols-3 2xl:grid-cols-6' : cards.length === 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-4';

  const bucketEntries = canViewPRBuckets ? sortedBucketEntries(prBucketSummary) : [];

  return (
    <div className="space-y-4">
      <div className={`grid grid-cols-2 sm:grid-cols-3 ${cardGridCols} gap-3`}>
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-500 truncate">{card.label}</p>
                  <p className="text-xl font-bold text-gray-900 mt-1 truncate">{card.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{card.sub}</p>
                </div>
                <div className={`rounded-full p-2 shrink-0 ${colorClasses[card.color]}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {bucketEntries.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <PieChart size={16} className="text-gray-500" />
                PR Bucket Breakdown
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Grouped by each installment&apos;s monthly bucket (fixed on the 1st), so target, posted and commission line up.
              </p>
            </div>
            {activeBucket && onSelectBucket && (
              <button
                onClick={() => onSelectBucket(undefined)}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Clear bucket filter
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            {bucketEntries.map(([bucketKey, stats]) => {
              const isActive = activeBucket === bucketKey;
              const rate = prPerformanceRate(stats.total_posted, stats.total_percentaged_target);
              return (
                <button
                  key={bucketKey}
                  onClick={() => onSelectBucket && onSelectBucket(isActive ? undefined : bucketKey)}
                  className={`text-left rounded-lg p-3 transition-colors border ${
                    isActive
                      ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300'
                      : 'bg-gray-50 border-transparent hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <PRBucketBadge bucket={bucketKey === 'unassigned' ? null : bucketKey} />
                    <span className="text-xs text-gray-500 whitespace-nowrap">{stats.total_installments} inst.</span>
                  </div>

                  <div className="mt-2">
                    <p className="text-[11px] text-gray-500">Cumulative balance</p>
                    <p className="text-sm font-semibold text-gray-900">{formatCurrencyCompact(stats.total_cumulative_balance)}</p>
                  </div>

                  <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                    <span>{stats.total_overdue} overdue</span>
                    <span>{stats.total_paid_off} paid off</span>
                  </div>

                  {(canViewTarget || canViewPostedPRAmount || canViewCommission) && (
                    <div className="mt-2 space-y-1 border-t border-gray-200/70 pt-2 text-xs text-gray-600">
                      {canViewTarget && (
                        <div className="flex justify-between"><span>Target</span><span className="font-medium text-gray-800">{formatCurrencyCompact(stats.total_percentaged_target)}</span></div>
                      )}
                      {canViewPostedPRAmount && (
                        <div className="flex justify-between"><span>Posted</span><span className="font-medium text-blue-700">{formatCurrencyCompact(stats.total_posted)}</span></div>
                      )}
                      {canViewCommission && (
                        <div className="flex justify-between"><span>Commission</span><span className="font-medium text-green-700">{formatCurrency(stats.total_commission)}</span></div>
                      )}
                      {canViewRate && (
                        <div className="flex items-center justify-between pt-0.5">
                          <span>Perf. rate</span>
                          <PerformanceRateBadge rate={rate} showBar />
                        </div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// TABLE COLUMNS -- shared between the All Installments and My Installments pages
// ============================================================================

interface ColumnOptions {
  onViewInstallment: (installment: Installment) => void;
  onViewLoan: (loanId: string) => void;
  showLoanOfficerColumn?: boolean;
  /** Pass `usePRVisibility()` from the page. Omitted → PR columns are hidden (deny by default). */
  visibility?: PRVisibility;
}

export function getInstallmentColumns({
  onViewInstallment,
  onViewLoan,
  showLoanOfficerColumn = true,
  visibility = NO_PR_VISIBILITY,
}: ColumnOptions) {
  // NOTE: this is a plain function, not a component — it must NOT call hooks.
  // The page calls usePRVisibility() and passes the result in as `visibility`.
  const { canViewPRBuckets, canViewTarget, canViewCommission, canViewPostedPRAmount } = visibility;
  const canViewRate = canViewTarget && canViewPostedPRAmount;

  const columns: any[] = [
    // --- Dates -------------------------------------------------------------
    {
      id: 'due_date',
      label: 'Due Date',
      accessor: (row: Installment) => row.due_date,
      Cell: (value: string) => <span className="font-medium text-sm whitespace-nowrap">{formatDate(value)}</span>,
      width: 120,
      sortable: true,
    },
    {
      id: 'days_until_due',
      label: 'Days to Due',
      accessor: (row: Installment) => row.days_until_due,
      Cell: (_value: number, row: Installment) => (
        <span className={`text-sm whitespace-nowrap ${row.is_overdue ? 'text-red-600' : 'text-gray-600'}`}>
          {row.days_until_due_display}
        </span>
      ),
      width: 130,
      sortable: true,
    },

    // --- Customer / loan ---------------------------------------------------
    {
      id: 'customer_name',
      label: 'Customer',
      accessor: (row: Installment) => row.customer_name,
      Cell: (value: string, row: Installment) => (
        <button
          onClick={() => onViewLoan(row.loan_id)}
          className="font-medium text-sm text-blue-600 hover:text-blue-800 hover:underline text-left truncate block max-w-[220px]"
          title={value || 'Unknown'}
        >
          {value || 'Unknown'}
        </button>
      ),
      width: 200,
      sortable: true,
    },
    {
      id: 'loan_id',
      label: 'Loan ID',
      accessor: (row: Installment) => row.loan_id,
      Cell: (value: string) => <span className="font-mono text-sm">{value}</span>,
      width: 140,
      sortable: true,
    },
    {
      id: 'registration_number',
      label: 'Reg. Number',
      accessor: (row: Installment) => row.registration_number,
      Cell: (value: string) => <span className="text-sm">{value || '—'}</span>,
      width: 120,
    },
    {
      id: 'phone_number',
      label: 'Phone',
      accessor: (row: Installment) => row.phone_number,
      Cell: (value: string) => <span className="text-sm whitespace-nowrap">{value || '—'}</span>,
      width: 130,
    },

    // --- Installment -------------------------------------------------------
    {
      id: 'installment_id',
      label: 'Installment #',
      accessor: (row: Installment) => row.installment_id,
      Cell: (value: number) => <span className="text-sm font-medium">#{value}</span>,
      width: 110,
      sortable: true,
    },
    {
      id: 'plan_type',
      label: 'Plan Type',
      accessor: (row: Installment) => row.plan_type_display,
      Cell: (value: string) => <span className="text-sm">{value || '—'}</span>,
      width: 120,
    },

    // --- Amounts -----------------------------------------------------------
    {
      id: 'total_amount',
      label: 'Total Amount',
      accessor: (row: Installment) => parseFloat(row.total_amount),
      Cell: (_value: number, row: Installment) => (
        <span className="text-sm text-right block">{formatCurrencyCompact(row.total_amount)}</span>
      ),
      width: 130,
      sortable: true,
    },
    {
      id: 'balance',
      label: 'Balance',
      accessor: (row: Installment) => parseFloat(row.balance),
      Cell: (_value: number, row: Installment) => (
        <span className="text-sm font-medium text-right block">{formatCurrencyCompact(row.balance)}</span>
      ),
      width: 120,
      sortable: true,
    },
    {
      id: 'cumulative_balance',
      label: 'Cumulative Balance',
      accessor: (row: Installment) => parseFloat(row.cumulative_balance),
      Cell: (value: number) => (
        <span className={`font-semibold text-right block ${value > 0 ? 'text-amber-700' : 'text-green-700'}`}>
          {formatCurrencyCompact(Math.max(0, value))}
        </span>
      ),
      width: 150,
      sortable: true,
    },

    // --- Status ------------------------------------------------------------
    {
      id: 'status',
      label: 'Status',
      accessor: (row: Installment) => row.status_text,
      Cell: (_value: string, row: Installment) => <InstallmentStatusBadge installment={row} />,
      width: 130,
    },

    // --- PR bucket (gated) ---------------------------------------------------
    ...(canViewPRBuckets
      ? [
          {
            // Monthly (static) bucket -- the one this month's target/commission use.
            // Shows the live bucket underneath when it has moved on since the 1st.
            id: 'static_monthly_pr_bucket',
            label: 'PR Bucket (Month)',
            accessor: (row: Installment) => effectivePRBucket(row),
            Cell: (_value: string | null, row: Installment) => <MonthlyPRBucketCell installment={row} />,
            width: 160,
            sortable: true,
          },
          {
            id: 'pr_bucket_team',
            label: 'PR Team',
            accessor: (row: Installment) => row.pr_bucket_team,
            Cell: (value: string | null) => (
              <span className="text-sm capitalize">{value ? value.replace(/_/g, ' ') : '—'}</span>
            ),
            width: 120,
          },
        ]
      : []),

    // --- PR figures (each gated by its own permission) -------------------------
    ...(canViewTarget
      ? [{
          id: 'percentaged_target',
          label: 'Target',
          accessor: (row: Installment) => parseFloat(row.percentaged_target || '0'),
          Cell: (_value: number, row: Installment) => (
            <span className="text-sm font-medium text-gray-900 text-right block">
              {formatCurrencyCompact(row.percentaged_target)}
            </span>
          ),
          width: 130,
          sortable: true,
        }]
      : []),
    ...(canViewPostedPRAmount
      ? [{
          id: 'monthly_repaid_amount',
          label: 'Posted (Month)',
          accessor: (row: Installment) => row.monthly_repaid_amount,
          Cell: (_value: number, row: Installment) => (
            <span className="text-sm text-blue-700 text-right block">
              {formatCurrencyCompact(row.monthly_repaid_amount)}
            </span>
          ),
          width: 140,
        }]
      : []),
    ...(canViewRate
      ? [{
          id: 'performance_rate',
          label: 'Perf. Rate',
          // Not sortable: it's derived client-side, not a DB column, so a server-side
          // `ordering=performance_rate` would fail in InstallmentViewSet.order_by().
          accessor: (row: Installment) => prPerformanceRate(row.monthly_repaid_amount, row.percentaged_target) ?? -1,
          Cell: (_value: number, row: Installment) => (
            <span className="block text-right">
              <PerformanceRateBadge rate={prPerformanceRate(row.monthly_repaid_amount, row.percentaged_target)} />
            </span>
          ),
          width: 110,
          sortable: false,
        }]
      : []),
    ...(canViewCommission
      ? [{
          id: 'installment_commission',
          label: 'Commission',
          accessor: (row: Installment) => parseFloat(row.installment_commission || '0'),
          Cell: (_value: number, row: Installment) => (
            <span className="text-sm text-green-700 text-right block">
              {formatCurrency(row.installment_commission)}
            </span>
          ),
          width: 130,
          sortable: true,
        }]
      : []),

    // --- Officer -----------------------------------------------------------
    ...(showLoanOfficerColumn
      ? [
          {
            id: 'officer',
            label: 'Assigned Officer',
            accessor: (row: Installment) => officerFullName(row.assigned_officer_details),
            Cell: (value: string | null) =>
              value ? (
                <span className="font-medium text-sm truncate block max-w-[160px]" title={value}>{value}</span>
              ) : (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Users size={12} /> Unassigned
                </span>
              ),
            width: 150,
          },
          {
            id: 'officer_username',
            label: 'Officer Username',
            accessor: (row: Installment) => row.assigned_officer_details?.username ?? null,
            Cell: (value: string | null) => (
              <span className="text-sm text-gray-600">{value ? `@${value}` : '—'}</span>
            ),
            width: 140,
          },
        ]
      : []),

    // --- Actions -----------------------------------------------------------
    {
      id: 'actions',
      label: 'Actions',
      accessor: (row: Installment) => row,
      Cell: (value: Installment) => (
        <button
          onClick={() => onViewInstallment(value)}
          className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all text-xs font-medium"
        >
          View
        </button>
      ),
      width: 80,
    },
  ];

  return columns;
}