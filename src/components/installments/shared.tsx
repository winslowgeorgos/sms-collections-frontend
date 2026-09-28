// components/installments/shared.tsx
// Shared types, formatters, badges, summary panel and table columns for the
// "All Installments" (/installments) and "My Installments" (/my_installments)
// pages. Kept in one place so both pages stay in sync with the
// InstallmentDetailSerializer / InstallmentViewSet contract.
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
  pr_bucket: string | null;
  pr_bucket_team: string | null;
  percentaged_target: string | null;
  percentaged_target_updated_at: string | null;
  installment_commission: string | null;
  commission_baseline_repaid: string | null;
  commission_baseline_at: string | null;
  monthly_repaid_amount: number;
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
}

export type PRBucketSummaryMap = Record<string, InstallmentSummary>;

export interface InstallmentsResponse {
  summary: InstallmentSummary;
  pr_bucket_summary: PRBucketSummaryMap;
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
  const { canViewTarget, canViewCommission, canViewPRBuckets } = usePRVisibility();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

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

  const bucketEntries = canViewPRBuckets ? sortedBucketEntries(prBucketSummary) : [];

  return (
    <div className="space-y-4">
      <div className={`grid grid-cols-2 sm:grid-cols-3 ${cards.length > 4 ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-3`}>
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
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <PieChart size={16} className="text-gray-500" />
              PR Bucket Breakdown
            </h3>
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
                  <div className="flex items-center justify-between">
                    <PRBucketBadge bucket={bucketKey === 'unassigned' ? null : bucketKey} />
                    <span className="text-xs text-gray-500">{stats.total_installments} installments</span>
                  </div>
                  <div className="mt-2 text-sm font-semibold text-gray-900">
                   % Target {formatCurrencyCompact(stats.total_percentaged_target)}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                    <span>{stats.total_overdue} overdue</span>
                    <span>{stats.total_paid_off} paid off</span>
                  </div>
                  {(canViewTarget || canViewCommission) && (
                    <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                      {canViewTarget && <span>Target: {formatCurrencyCompact(stats.total_percentaged_target)}</span>}
                      {canViewCommission && <span>Comm: {formatCurrency(stats.total_commission)}</span>}
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
            id: 'pr_bucket',
            label: 'PR Bucket',
            accessor: (row: Installment) => row.pr_bucket,
            Cell: (value: string | null) => <PRBucketBadge bucket={value} />,
            width: 150,
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