// components/call_logs/InstallmentDetailsModal.tsx
'use client';

import React from 'react';
import { Modal } from '@/components/ui/modal';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, DollarSign, Clock, AlertCircle, CheckCircle, X } from 'lucide-react';

interface InstallmentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  installment: {
    id: string;
    installment_id: number;
    due_date: string;
    balance: number;
    cumulative_balance: number;
    is_current_month: boolean;
    is_overdue: boolean;
  } | null;
  loanDetails: {
    id: string;
    loan_id: string;
    customer_name: string;
    total_outstanding: number;
  };
}

export function InstallmentDetailsModal({ 
  isOpen, 
  onClose, 
  installment, 
  loanDetails 
}: InstallmentDetailsModalProps) {
  if (!installment) return null;

  const formatCurrency = (value: number) => {
    return `KSh ${value.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Installment #${installment.installment_id} Details`}
      size="md"
    >
      <div className="space-y-6">
        {/* Header with close button */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Customer and Loan Info */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Customer</p>
          <p className="text-lg font-semibold">{loanDetails.customer_name}</p>
          <p className="text-sm text-gray-600 mt-2">Loan ID</p>
          <p className="font-medium">{loanDetails.loan_id}</p>
        </div>

        {/* Status Badges */}
        <div className="flex gap-2">
          {installment.is_overdue && (
            <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm flex items-center">
              <AlertCircle size={14} className="mr-1" />
              Overdue
            </span>
          )}
          {installment.is_current_month && (
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center">
              <Clock size={14} className="mr-1" />
              Current Month
            </span>
          )}
        </div>

        {/* Amount Information */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 mb-1">Installment Balance</p>
              <p className="text-xl font-bold text-red-600">
                {formatCurrency(installment.balance)}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 mb-1">Cumulative Balance</p>
              <p className="text-xl font-bold text-orange-600">
                {formatCurrency(installment.cumulative_balance)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Due Date */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                <div>
                  <p className="text-sm text-gray-600">Due Date</p>
                  <p className="font-medium">{formatDate(installment.due_date)}</p>
                </div>
              </div>
              {installment.is_overdue && (
                <span className="text-sm text-red-600 font-medium">
                  Overdue by {Math.floor((new Date().getTime() - new Date(installment.due_date).getTime()) / (1000 * 3600 * 24))} days
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Loan Summary */}
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Loan Summary</p>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Outstanding</span>
              <span className="font-semibold">{formatCurrency(loanDetails.total_outstanding)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
          <button
            onClick={() => {
              // You can add navigation to record payment if needed
              onClose();
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            Record Payment
          </button>
        </div>
      </div>
    </Modal>
  );
}