'use client';

import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  DollarSign,
  TrendingUp,
  Settings,
  FileText,
  AlertCircle,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  CreditCard,
  AlertTriangle,
  Wallet,
  PieChart,
} from 'lucide-react';
import { usePRVisibility } from '@/hooks/user-pr-visibility';

// NOTE: total_amount/repaid/balance/cumulative_balance and every *_due / *_paid
// breakdown field are Decimal fields on the backend, which Django REST
// Framework serializes as QUOTED STRINGS (e.g. "26613.00"), not JSON numbers.
// Treat every money field below as `string` and parse with parseFloat before
// doing arithmetic.
export interface Installment {
  id: string;
  installment_id: number;
  plan_type: string;
  total_amount: string;
  repaid: string;
  balance: string;
  due_date: string;
  status: number;
  is_overdue: boolean;
  days_until_due: number;
  is_current_month: boolean;
  paid_off: boolean;
  cumulative_balance: string;
  // Detailed breakdown fields (from backend)
  principal_due?: string;
  principal_paid?: string;
  interest_due?: string;
  interest_paid?: string;
  penalty_due?: string;
  penalty_paid?: string;
  tracking_fees_due?: string;
  tracking_fees_paid?: string;
  loan_maintenance_fee_due?: string;
  loan_maintenance_fee_paid?: string;
  other_charges_due?: string;
  other_charges_paid?: string;
  early_settlement_interest_due?: string;
  early_settlement_interest_paid?: string;
  // PR Bucket (CBK categorization) + commission fields (from backend)
  actual_installment_due_days: number | null;
  pr_bucket?: string | null;
  pr_bucket_team?: string | null;
  percentaged_target: string | null;
  percentaged_target_updated_at: string | null;
  installment_commission: string | null;
  // Monthly baseline snapshot of `repaid` -- repaid - commission_baseline_repaid = amount posted this month.
  commission_baseline_repaid: string | null;
  commission_baseline_at: string | null;
}

interface InstallmentBreakdownTableProps {
  installments: Installment[];
  onViewDetails: (installmentId: number) => void;
  currentMonthInstallmentId?: number;
}

const toNumber = (value?: string | number | null): number => {
  if (value === undefined || value === null) return 0;
  const parsed = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrency = (value?: string | number | null): string => {
  if (value === undefined || value === null) return '—';
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 2,
  }).format(toNumber(value));
};

const computePending = (due?: string | number | null, paid?: string | number | null): number => {
  return Math.max(0, toNumber(due) - toNumber(paid));
};

// PR Bucket (CBK aging categorization) display metadata -- mirrors backend choices
const PR_BUCKET_LABELS: Record<string, string> = {
  PR30: 'PR 1-30 Days',
  PR31_60: 'PR 31-60 Days',
  PR61_90: 'PR 61-90 Days',
  PR90_PLUS: 'Above 90 Days',
};

const PR_BUCKET_STYLES: Record<string, string> = {
  PR30: 'bg-amber-100 text-amber-800',
  PR31_60: 'bg-orange-100 text-orange-800',
  PR61_90: 'bg-red-100 text-red-800',
  PR90_PLUS: 'bg-rose-100 text-rose-900',
};

const PR_BUCKET_TEAM_LABELS: Record<string, string> = {
  collections: 'Collections',
  auctioneer: 'Auctioneer',
  third_party: 'Third Party',
  legal: 'Legal',
};

const PRBucketBadge = ({ bucket }: { bucket?: string | null }) => {
  if (!bucket) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
        Not categorized
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${PR_BUCKET_STYLES[bucket] || 'bg-gray-100 text-gray-800'}`}>
      <PieChart className="w-3 h-3 mr-1" />
      {PR_BUCKET_LABELS[bucket] || bucket}
    </span>
  );
};

const useInstallmentSummary = (installments: Installment[]) => {
  return useMemo(() => {
    const totals = {
      totalOutstanding: 0,
      totalCumulativeBalance: 0,
      pendingPrincipal: 0,
      pendingInterest: 0,
      pendingPenalty: 0,
      pendingTrackingFees: 0,
      pendingMaintenanceFee: 0,
      pendingOtherCharges: 0,
      pendingEarlySettlement: 0,
      totalDueOverall: 0,
      totalPaidOverall: 0,
    };

    for (const inst of installments) {
      totals.totalOutstanding += toNumber(inst.balance);
      totals.pendingPrincipal += computePending(inst.principal_due, inst.principal_paid);
      totals.pendingInterest += computePending(inst.interest_due, inst.interest_paid);
      totals.pendingPenalty += computePending(inst.penalty_due, inst.penalty_paid);
      totals.pendingTrackingFees += computePending(inst.tracking_fees_due, inst.tracking_fees_paid);
      totals.pendingMaintenanceFee += computePending(inst.loan_maintenance_fee_due, inst.loan_maintenance_fee_paid);
      totals.pendingOtherCharges += computePending(inst.other_charges_due, inst.other_charges_paid);
      totals.pendingEarlySettlement += computePending(inst.early_settlement_interest_due, inst.early_settlement_interest_paid);
      totals.totalDueOverall += toNumber(inst.total_amount);
      totals.totalPaidOverall += toNumber(inst.repaid);
    }

    // Cumulative balance: the highest running cumulative balance across installments
    totals.totalCumulativeBalance = Math.max(...installments.map(inst => toNumber(inst.cumulative_balance)), 0);
    totals.totalOutstanding = Math.max(0, totals.totalDueOverall - totals.totalPaidOverall);

    return totals;
  }, [installments]);
};

const StatusBadge = ({
  isPaid,
  isOverdue,
  isCurrent,
}: {
  isPaid: boolean;
  isOverdue: boolean;
  isCurrent: boolean;
}) => {
  if (isPaid) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <CheckCircle className="w-3 h-3 mr-1" />
        Paid
      </span>
    );
  }
  if (isOverdue) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <XCircle className="w-3 h-3 mr-1" />
        Overdue
      </span>
    );
  }
  if (isCurrent) {
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

const BreakdownCard = ({ installment }: { installment: Installment }) => {
  const { canViewPRBuckets, canViewTarget, canViewCommission, canViewPostedPRAmount } = usePRVisibility();

  const sections = [
    { label: 'Principal', due: installment.principal_due, paid: installment.principal_paid, icon: DollarSign },
    { label: 'Interest', due: installment.interest_due, paid: installment.interest_paid, icon: TrendingUp },
    { label: 'Tracking Fees', due: installment.tracking_fees_due, paid: installment.tracking_fees_paid, icon: Settings },
    { label: 'Maintenance Fee', due: installment.loan_maintenance_fee_due, paid: installment.loan_maintenance_fee_paid, icon: FileText },
    { label: 'Other Charges', due: installment.other_charges_due, paid: installment.other_charges_paid, icon: AlertCircle },
    { label: 'Penalty', due: installment.penalty_due, paid: installment.penalty_paid, icon: AlertTriangle },
    { label: 'Early Settlement Interest', due: installment.early_settlement_interest_due, paid: installment.early_settlement_interest_paid, icon: Calendar },
  ];

  const hasBreakdownData = sections.some(s => toNumber(s.due) !== 0 || toNumber(s.paid) !== 0);

  const hasPRBucketData =
    installment.pr_bucket !== undefined ||
    installment.percentaged_target !== undefined ||
    installment.installment_commission !== undefined;

  // Show the PR panel only if the user may see at least one of its parts.
  const canSeeAnyPR = canViewPRBuckets || canViewTarget || canViewCommission || canViewPostedPRAmount;
  const prFigureCount = [canViewTarget, canViewPostedPRAmount, canViewCommission].filter(Boolean).length;
  const prGridCols = prFigureCount === 3 ? 'sm:grid-cols-3' : prFigureCount === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-1';

  // Amount posted to this installment during the current calendar month.
  const monthlyPostedAmount = Math.max(
    0,
    toNumber(installment.repaid) - toNumber(installment.commission_baseline_repaid)
  );

  // Display-only: a zero-or-negative cumulative balance reads as closed (0 days overdue).
  const isClosedByZeroBalance = toNumber(installment.cumulative_balance) <= 0;

  return (
    <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-5 shadow-inner border border-gray-100">
      {hasBreakdownData ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sections.map((section) => {
            const Icon = section.icon;
            const pending = computePending(section.due, section.paid);
            return (
              <div key={section.label} className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 text-gray-700 mb-2">
                  <Icon className="w-4 h-4 text-blue-500" />
                  <span className="font-semibold text-sm">{section.label}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Due:</span>
                  <span className="font-medium text-red-600">{formatCurrency(section.due)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-500">Paid:</span>
                  <span className="font-medium text-green-600">{formatCurrency(section.paid)}</span>
                </div>
                {pending > 0 && (
                  <div className="flex justify-between text-sm mt-1 pt-1 border-t border-gray-100">
                    <span className="text-gray-500">Pending:</span>
                    <span className="font-semibold text-orange-600">{formatCurrency(pending)}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500">
          <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">Detailed breakdown not available for this installment.</p>
        </div>
      )}

      {/* PR Bucket & Commission (CBK Categorization) */}
      {hasPRBucketData && canSeeAnyPR && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h5 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-amber-600" />
              {canViewCommission ? 'PR Bucket & Commission' : 'PR Bucket'}
            </h5>
            {canViewPRBuckets && (
              <div className="flex flex-wrap items-center gap-2">
                <PRBucketBadge bucket={installment.pr_bucket} />
                {installment.pr_bucket_team && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                    {PR_BUCKET_TEAM_LABELS[installment.pr_bucket_team] || installment.pr_bucket_team}
                  </span>
                )}
                {installment.actual_installment_due_days !== undefined && (
                  <span
                    className={`text-xs flex items-center ${
                      !isClosedByZeroBalance && installment.actual_installment_due_days && installment.actual_installment_due_days > 0
                        ? 'text-red-600 font-medium'
                        : 'text-gray-500'
                    }`}
                  >
                    <Clock className="w-3 h-3 mr-1" />
                    {isClosedByZeroBalance
                      ? '0 days overdue'
                      : installment.actual_installment_due_days !== null && installment.actual_installment_due_days > 0
                      ? `${installment.actual_installment_due_days} days overdue`
                      : installment.actual_installment_due_days !== null && installment.actual_installment_due_days < 0
                      ? `${Math.abs(installment.actual_installment_due_days)} days until due`
                      : 'Due today'}
                  </span>
                )}
              </div>
            )}
          </div>

          {prFigureCount > 0 && (
            <div className={`grid grid-cols-1 ${prGridCols} gap-3`}>
              {canViewTarget && (
                <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                  <div className="text-xs text-gray-500">Percentaged Target</div>
                  <div className="font-semibold text-gray-900">{formatCurrency(installment.percentaged_target)}</div>
                  <div className="text-[11px] text-gray-400 mt-1">
                    {installment.percentaged_target_updated_at
                      ? `Recalculated ${new Date(installment.percentaged_target_updated_at).toLocaleDateString()}`
                      : 'Not yet calculated this month'}
                  </div>
                </div>
              )}

              {canViewPostedPRAmount && (
                <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                  <div className="text-xs text-gray-500">Posted This Month</div>
                  <div className="font-semibold text-blue-700">{formatCurrency(monthlyPostedAmount)}</div>
                  <div className="text-[11px] text-gray-400 mt-1">
                    {installment.commission_baseline_at
                      ? `Baseline ${formatCurrency(installment.commission_baseline_repaid)} as of ${new Date(installment.commission_baseline_at).toLocaleDateString()}`
                      : 'No monthly baseline set yet'}
                  </div>
                </div>
              )}

              {canViewCommission && (
                <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                  <div className="text-xs text-gray-500">Installment Commission</div>
                  <div className="font-semibold text-emerald-700">{formatCurrency(installment.installment_commission)}</div>
                  <div className="text-[11px] text-gray-400 mt-1">Charged on this month's postings only</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-gray-200 text-xs text-gray-400 flex justify-between">
        <span>Installment #{installment.installment_id}</span>
        {/* Display floor: an overpayment can make cumulative_balance negative -- show KSh 0. */}
        <span>Cumulative Balance: {formatCurrency(Math.max(0, toNumber(installment.cumulative_balance)))}</span>
      </div>
    </div>
  );
};

const SummaryCards = ({ totals }: { totals: ReturnType<typeof useInstallmentSummary> }) => {
  const summaryItems = [
    { label: 'Total Outstanding', value: totals.totalOutstanding, icon: CreditCard, color: 'gray' },
    { label: 'Cumulative Balance', value: totals.totalCumulativeBalance, icon: Wallet, color: 'red' },
    { label: 'Pending Principal', value: totals.pendingPrincipal, icon: DollarSign, color: 'blue' },
    { label: 'Pending Interest', value: totals.pendingInterest, icon: TrendingUp, color: 'yellow' },
    { label: 'Pending Penalty', value: totals.pendingPenalty, icon: AlertTriangle, color: 'orange' },
    { label: 'Pending Tracking Fees', value: totals.pendingTrackingFees, icon: Settings, color: 'purple' },
    { label: 'Pending Maintenance Fee', value: totals.pendingMaintenanceFee, icon: FileText, color: 'indigo' },
    { label: 'Pending Other Charges', value: totals.pendingOtherCharges, icon: AlertCircle, color: 'pink' },
    { label: 'Pending Early Settlement', value: totals.pendingEarlySettlement, icon: Calendar, color: 'teal' },
  ];

  const colorClasses = {
    red: 'bg-red-50 border-red-200 text-red-700',
    gray: 'bg-gray-50 border-gray-200 text-gray-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    pink: 'bg-pink-50 border-pink-200 text-pink-700',
    teal: 'bg-teal-50 border-teal-200 text-teal-700',
  };

  return (
    <div className="mb-6">
      <h4 className="text-md font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <Wallet className="w-4 h-4" />
        Summary Totals (All Installments)
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {summaryItems.map((item) => {
          const Icon = item.icon;
          const colorClass = colorClasses[item.color as keyof typeof colorClasses] || colorClasses.gray;
          return (
            <div key={item.label} className={`rounded-lg border p-3 ${colorClass}`}>
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wide">{item.label}</span>
              </div>
              <div className="text-xl font-bold mt-1">{formatCurrency(item.value)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const InstallmentRow = ({
  installment,
  isExpanded,
  onToggle,
  onViewDetails,
  canViewPRBuckets,
}: {
  installment: Installment;
  isExpanded: boolean;
  onToggle: () => void;
  onViewDetails: (id: number) => void;
  canViewPRBuckets: boolean;
}) => {
  const dueDate = new Date(installment.due_date);
  const isDueToday = dueDate.toDateString() === new Date().toDateString();

  // Display-only: overdue + zero/negative cumulative balance reads as "Paid", 0 days overdue.
  const isClosedByZeroBalance = installment.is_overdue && toNumber(installment.cumulative_balance) <= 0;

  return (
    <>
      <div
        className={`bg-white rounded-xl shadow-sm border transition-all duration-200 hover:shadow-md ${
          installment.is_current_month ? 'border-blue-300 ring-1 ring-blue-200' : 'border-gray-200'
        }`}
      >
        <div className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4 min-w-[160px]">
            <button
              onClick={onToggle}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? <ChevronDown size={18} className="text-gray-500" /> : <ChevronRight size={18} className="text-gray-500" />}
            </button>
            <div>
              <button
                onClick={() => onViewDetails(installment.installment_id)}
                className="text-blue-600 hover:text-blue-800 font-mono font-semibold text-lg"
              >
                #{installment.installment_id}
              </button>
              <div className="text-xs text-gray-500 capitalize">{installment.plan_type}</div>
            </div>
          </div>

          <div className="min-w-[130px]">
            <div className="flex items-center gap-1 text-gray-700">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium">
                {dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <div className="text-xs mt-0.5">
              {installment.is_overdue ? (
                isClosedByZeroBalance ? (
                  <span className="text-gray-500">0 days overdue</span>
                ) : (
                  <span className="text-red-600">{Math.abs(installment.days_until_due)} days overdue</span>
                )
              ) : isDueToday ? (
                <span className="text-orange-600 font-medium">Due today</span>
              ) : (
                <span className="text-gray-500">{installment.days_until_due} days left</span>
              )}
            </div>
          </div>

          <div className="flex gap-6 flex-wrap">
            <div>
              <div className="text-xs text-gray-500">Total</div>
              <div className="font-semibold text-gray-900">{formatCurrency(installment.total_amount)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Paid</div>
              <div className="font-semibold text-green-600">{formatCurrency(installment.repaid)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Balance</div>
              <div className="font-semibold text-red-600">{formatCurrency(installment.balance)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Cumulative</div>
              <div className="font-semibold text-gray-700">
                {formatCurrency(Math.max(0, toNumber(installment.cumulative_balance)))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {canViewPRBuckets && <PRBucketBadge bucket={installment.pr_bucket} />}
            <StatusBadge
              isPaid={installment.paid_off || isClosedByZeroBalance}
              isOverdue={installment.is_overdue}
              isCurrent={installment.is_current_month}
            />
            <button
              onClick={() => onViewDetails(installment.installment_id)}
              className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
              title="View full details"
            >
              <Eye size={18} />
            </button>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-2 mb-4 pl-4 pr-2">
          <BreakdownCard installment={installment} />
        </div>
      )}
    </>
  );
};

export default function InstallmentBreakdownTable({
  installments,
  onViewDetails,
}: InstallmentBreakdownTableProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const totals = useInstallmentSummary(installments);
  const { canViewPRBuckets } = usePRVisibility();

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const sortedInstallments = [...installments].sort((a, b) => a.installment_id - b.installment_id);

  if (sortedInstallments.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-xl">
        <FileText className="w-12 h-12 mx-auto text-gray-400 mb-3" />
        <h3 className="text-lg font-medium text-gray-700">No installments found</h3>
        <p className="text-sm text-gray-500">This loan does not have any installment records.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <SummaryCards totals={totals} />

      <div className="flex justify-between items-center mb-4 px-1">
        <h3 className="text-lg font-semibold text-gray-800">Installment Schedule</h3>
        <div className="text-sm text-gray-500">
          {sortedInstallments.length} {sortedInstallments.length === 1 ? 'installment' : 'installments'}
        </div>
      </div>

      <div className="space-y-3">
        {sortedInstallments.map((inst) => (
          <InstallmentRow
            key={inst.id}
            installment={inst}
            isExpanded={expandedIds.has(inst.id)}
            onToggle={() => toggleExpand(inst.id)}
            onViewDetails={onViewDetails}
            canViewPRBuckets={canViewPRBuckets}
          />
        ))}
      </div>
    </div>
  );
}