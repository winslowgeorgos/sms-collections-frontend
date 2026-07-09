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
} from 'lucide-react';

export interface Installment {
  id: string;
  installment_id: number;
  plan_type: string;
  total_amount: number;
  repaid: number;
  balance: number;
  due_date: string;
  status: number;
  is_overdue: boolean;
  days_until_due: number;
  is_current_month: boolean;
  paid_off: boolean;
  cumulative_balance: number;
  // Detailed breakdown fields (from backend)
  principal_due?: number;
  principal_paid?: number;
  interest_due?: number;
  interest_paid?: number;
  penalty_due?: number;
  penalty_paid?: number;
  tracking_fees_due?: number;
  tracking_fees_paid?: number;
  loan_maintenance_fee_due?: number;
  loan_maintenance_fee_paid?: number;
  other_charges_due?: number;
  other_charges_paid?: number;
  early_settlement_interest_due?: number;
  early_settlement_interest_paid?: number;
}

interface InstallmentBreakdownTableProps {
  installments: Installment[];
  onViewDetails: (installmentId: number) => void;
  currentMonthInstallmentId?: number;
}

const formatCurrency = (value?: number): string => {
  if (value === undefined || value === null) return '—';
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 2,
  }).format(value);
};

// Helper to compute pending amount (due - paid)
const computePending = (due?: number, paid?: number): number => {
  const dueVal = due ?? 0;
  const paidVal = paid ?? 0;
  return Math.max(0, dueVal - paidVal);
};

// Summary calculation hook
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
      totals.totalOutstanding += inst.balance || 0;
      totals.pendingPrincipal += computePending(inst.principal_due, inst.principal_paid);
      totals.pendingInterest += computePending(inst.interest_due, inst.interest_paid);
      totals.pendingPenalty += computePending(inst.penalty_due, inst.penalty_paid);
      totals.pendingTrackingFees += computePending(inst.tracking_fees_due, inst.tracking_fees_paid);
      totals.pendingMaintenanceFee += computePending(inst.loan_maintenance_fee_due, inst.loan_maintenance_fee_paid);
      totals.pendingOtherCharges += computePending(inst.other_charges_due, inst.other_charges_paid);
      totals.pendingEarlySettlement += computePending(inst.early_settlement_interest_due, inst.early_settlement_interest_paid);
      totals.totalDueOverall += inst.total_amount || 0;
      totals.totalPaidOverall += inst.repaid || 0;
    }

          // for cumulative balance just get the highest cumulative balance from the installments, which should be the last one (or the one with the highest cumulative_balance value)
      totals.totalCumulativeBalance = Math.max(...installments.map(inst => inst.cumulative_balance || 0), 0);
    // Overall pending = totalDue - totalPaid (should equal totalOutstanding)
    totals.totalOutstanding = Math.max(0, totals.totalDueOverall - totals.totalPaidOverall);

    return totals;
  }, [installments]);
};

const StatusBadge = ({ isPaid, isOverdue, isCurrent }: { isPaid: boolean; isOverdue: boolean; isCurrent: boolean }) => {
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
  const sections = [
    { label: 'Principal', due: installment.principal_due, paid: installment.principal_paid, icon: DollarSign },
    { label: 'Interest', due: installment.interest_due, paid: installment.interest_paid, icon: TrendingUp },
    { label: 'Tracking Fees', due: installment.tracking_fees_due, paid: installment.tracking_fees_paid, icon: Settings },
    { label: 'Maintenance Fee', due: installment.loan_maintenance_fee_due, paid: installment.loan_maintenance_fee_paid, icon: FileText },
    { label: 'Other Charges', due: installment.other_charges_due, paid: installment.other_charges_paid, icon: AlertCircle },
    { label: 'Penalty', due: installment.penalty_due, paid: installment.penalty_paid, icon: AlertTriangle },
    { label: 'Early Settlement Interest', due: installment.early_settlement_interest_due, paid: installment.early_settlement_interest_paid, icon: Calendar },
  ];

  const hasData = sections.some(s => (s.due !== undefined && s.due !== 0) || (s.paid !== undefined && s.paid !== 0));

  if (!hasData) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500">
        <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm">Detailed breakdown not available for this installment.</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-5 shadow-inner border border-gray-100">
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
      <div className="mt-4 pt-3 border-t border-gray-200 text-xs text-gray-400 flex justify-between">
        <span>Installment #{installment.installment_id}</span>
        <span>Cumulative Balance: {formatCurrency(installment.cumulative_balance)}</span>
      </div>
    </div>
  );
};

// Summary Cards Component
const SummaryCards = ({ totals }: { totals: ReturnType<typeof useInstallmentSummary> }) => {
  const summaryItems = [
    {
      label: 'Total Outstanding',
      value: totals.totalOutstanding,
      icon: CreditCard,
      color: 'gray',
      tooltip: 'Sum of all installment balances for the main loan',
    },
    {
      label: 'Cumulative Balance',
      value: totals.totalCumulativeBalance,
      icon: Wallet,
      color: 'red',
      tooltip: 'Running total of balances across installments including topup loans',
    },
    {
      label: 'Pending Principal',
      value: totals.pendingPrincipal,
      icon: DollarSign,
      color: 'blue',
    },
    {
      label: 'Pending Interest',
      value: totals.pendingInterest,
      icon: TrendingUp,
      color: 'yellow',
    },
    {
      label: 'Pending Penalty',
      value: totals.pendingPenalty,
      icon: AlertTriangle,
      color: 'orange',
    },
    {
      label: 'Pending Tracking Fees',
      value: totals.pendingTrackingFees,
      icon: Settings,
      color: 'purple',
    },
    {
      label: 'Pending Maintenance Fee',
      value: totals.pendingMaintenanceFee,
      icon: FileText,
      color: 'indigo',
    },
    {
      label: 'Pending Other Charges',
      value: totals.pendingOtherCharges,
      icon: AlertCircle,
      color: 'pink',
    },
    {
      label: 'Pending Early Settlement',
      value: totals.pendingEarlySettlement,
      icon: Calendar,
      color: 'teal',
    },
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">{item.label}</span>
                </div>
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
}: {
  installment: Installment;
  isExpanded: boolean;
  onToggle: () => void;
  onViewDetails: (id: number) => void;
}) => {
  const dueDate = new Date(installment.due_date);
  const isDueToday = dueDate.toDateString() === new Date().toDateString();

  return (
    <>
      {/* Main row */}
      <div
        className={`bg-white rounded-xl shadow-sm border transition-all duration-200 hover:shadow-md ${
          installment.is_current_month ? 'border-blue-300 ring-1 ring-blue-200' : 'border-gray-200'
        }`}
      >
        <div className="p-4 flex flex-wrap items-center justify-between gap-3">
          {/* Left section: Installment # and type */}
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

          {/* Due date */}
          <div className="min-w-[130px]">
            <div className="flex items-center gap-1 text-gray-700">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium">
                {dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <div className="text-xs mt-0.5">
              {installment.is_overdue ? (
                <span className="text-red-600">{Math.abs(installment.days_until_due)} days overdue</span>
              ) : isDueToday ? (
                <span className="text-orange-600 font-medium">Due today</span>
              ) : (
                <span className="text-gray-500">{installment.days_until_due} days left</span>
              )}
            </div>
          </div>

          {/* Amounts */}
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
              <div className="font-semibold text-gray-700">{installment?.is_current_month ? formatCurrency(installment.cumulative_balance) : installment?.cumulative_balance >= 0 ? installment?.cumulative_balance : 0 }</div>
            </div>
          </div>

          {/* Status and action */}
          <div className="flex items-center gap-3">
            <StatusBadge isPaid={installment.paid_off} isOverdue={installment.is_overdue} isCurrent={installment.is_current_month} />
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

      {/* Expanded breakdown */}
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
  currentMonthInstallmentId,
}: InstallmentBreakdownTableProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const totals = useInstallmentSummary(installments);

  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedIds(newSet);
  };

  // Sort installments by ID ascending (or by due date)
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
      {/* Summary Cards */}
      <SummaryCards totals={totals} />

      {/* Optional header with count */}
      <div className="flex justify-between items-center mb-4 px-1">
        <h3 className="text-lg font-semibold text-gray-800">Installment Schedule</h3>
        <div className="text-sm text-gray-500">
          {sortedInstallments.length} {sortedInstallments.length === 1 ? 'installment' : 'installments'}
        </div>
      </div>

      {/* Installment list */}
      <div className="space-y-3">
        {sortedInstallments.map((inst) => (
          <InstallmentRow
            key={inst.id}
            installment={inst}
            isExpanded={expandedIds.has(inst.id)}
            onToggle={() => toggleExpand(inst.id)}
            onViewDetails={onViewDetails}
          />
        ))}
      </div>
    </div>
  );
}