// components/loans/InstallmentTable.tsx
'use client';

import React from 'react';
import GenericTable from '@/components/ui/cTable';

interface Installment {
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
  cumulative_balance : number;
}

interface InstallmentTableProps {
  installments: Installment[];
  onViewDetails: (installmentId: number) => void;
}

export default function InstallmentTable({ installments, onViewDetails }: InstallmentTableProps) {
  const columns = [
    {
      id: 'installment_id',
      label: 'Installment #',
      accessor: (row: Installment) => row.installment_id,
      Cell: (value: number, row: Installment) => (
        <button
          onClick={() => onViewDetails(value)}
          className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
        >
          #{value}
        </button>
      ),
      width: 120,
    },
    {
      id: 'plan_type',
      label: 'Type',
      accessor: (row: Installment) => row.plan_type,
      width: 100,
    },
    {
      id: 'due_date',
      label: 'Due Date',
      accessor: (row: Installment) => new Date(row.due_date).toLocaleDateString(),
      Cell: (value: string, row: Installment) => {
        const dueDate = new Date(row.due_date);
        const today = new Date();
        const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        return (
          <div>
            <div>{dueDate.toLocaleDateString()}</div>
            <div className="text-xs text-gray-500">
              {row.is_overdue ? `${Math.abs(daysUntilDue)} days overdue` : `${daysUntilDue} days left`}
            </div>
          </div>
        );
      },
      width: 130,
    },
    {
      id: 'total_amount',
      label: 'Total',
      accessor: (row: Installment) => row.total_amount,
      Cell: (value: number) => (
        <span className="font-medium">KSh {value.toLocaleString()}</span>
      ),
      width: 120,
    },
    {
      id: 'repaid',
      label: 'Paid',
      accessor: (row: Installment) => row.repaid,
      Cell: (value: number) => (
        <span className="text-green-600">KSh {value.toLocaleString()}</span>
      ),
      width: 120,
    },
    {
      id: 'balance',
      label: 'Balance',
      accessor: (row: Installment) => row.balance,
      Cell: (value: number) => (
        <span className={value > 0 ? 'text-red-600 font-medium' : 'text-gray-600'}>
          KSh {value.toLocaleString()}
        </span>
      ),
      width: 120,
    },
      {
      id: 'cummulative_balance',
      label: 'Cummulative Balance',
      accessor: (row: Installment) => row.cumulative_balance,
      Cell: (value: number) => (
        <span className={value > 0 ? 'text-red-600 font-medium' : 'text-gray-600'}>
          KSh {value.toLocaleString()}
        </span>
      ),
      width: 120,
    },
    {
      id: 'status',
      label: 'Status',
      accessor: (row: Installment) => row.status,
      Cell: (value: number, row: Installment) => {
        if (row.paid_off) {
          return (
            <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
              Paid
            </span>
          );
        } else if (row.is_overdue) {
          return (
            <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
              Overdue
            </span>
          );
        } else if (row.is_current_month) {
          return (
            <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
              Current
            </span>
          );
        } else {
          return (
            <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
              Upcoming
            </span>
          );
        }
      },
      width: 100,
    },
  ];

  return (
    <GenericTable
      data={installments}
      columns={columns}
      rowKey={(row: Installment) => row.installment_id}
      selectionMode="none"
      virtualized={false}
    />
  );
}