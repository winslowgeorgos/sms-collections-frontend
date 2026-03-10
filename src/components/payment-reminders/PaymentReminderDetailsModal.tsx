'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { InstallmentDetailsModal } from '@/components/call_logs/InstallmentDetailsModal';
import { 
  Calendar, Clock, DollarSign, User, Phone, 
  CheckCircle, AlertCircle, Bell, Edit, RefreshCw,
  XCircle, MessageSquare, Eye
} from 'lucide-react';
import Link from 'next/link';

interface PaymentReminder {
  id: string;
  call_log: string;
  main_loan: string;
  installment: string | null;
  officer: number;
  officer_name: string;
  promised_amount: string;
  promised_date: string;
  payment_method: string;
  payment_method_display: string;
  payment_reference: string | null;
  status: 'pending' | 'paid' | 'cancelled' | 'rescheduled' | 'overdue';
  status_display: string;
  days_until_due: number;
  is_overdue: boolean;
  reminder_sent: boolean;
  reminder_sent_at: string | null;
  follow_up_call_required: boolean;
  actual_payment_date: string | null;
  actual_paid_amount: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface PaymentReminderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  reminder: PaymentReminder;
  onMarkPaid: () => void;
  onReschedule: () => void;
  onEdit: () => void;
}

export default function PaymentReminderDetailsModal({
  isOpen,
  onClose,
  reminder,
  onMarkPaid,
  onReschedule,
  onEdit
}: PaymentReminderDetailsModalProps) {
  const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
  
  // Mock installment details - you'll need to fetch these when the modal opens
  const [installmentDetails, setInstallmentDetails] = useState<{
    id: string;
    installment_id: number;
    due_date: string;
    balance: number;
    cumulative_balance: number;
    is_current_month: boolean;
    is_overdue: boolean;
  } | null>(null);

  const [loanDetails, setLoanDetails] = useState<{
    id: string;
    loan_id: string;
    customer_name: string;
    total_outstanding: number;
  } | null>(null);

  const [isLoadingInstallment, setIsLoadingInstallment] = useState(false);

  const formatCurrency = (value: string) => {
    return `KSh ${parseFloat(value).toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'rescheduled': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleViewInstallment = async () => {
    if (!reminder.installment) return;
    
    setIsLoadingInstallment(true);
    try {
      // Fetch installment details from your API
      const response = await fetch(`/api/installments/${reminder.installment}/`);
      const data = await response.json();
      
      // Transform the data to match the expected format
      setInstallmentDetails({
        id: data.id,
        installment_id: data.installment_id,
        due_date: data.due_date,
        balance: parseFloat(data.balance),
        cumulative_balance: parseFloat(data.cumulative_balance),
        is_current_month: data.is_current_month,
        is_overdue: data.is_overdue
      });

      // Set loan details
      setLoanDetails({
        id: data.main_loan,
        loan_id: data.loan_id,
        customer_name: data.customer_name,
        total_outstanding: parseFloat(data.total_outstanding || data.balance)
      });

      setIsInstallmentModalOpen(true);
    } catch (error) {
      console.error('Error fetching installment details:', error);
    } finally {
      setIsLoadingInstallment(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Payment Reminder Details"
        size="lg"
      >
        <div className="space-y-6">
          {/* Header Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1 text-sm rounded-full ${getStatusColor(reminder.status)}`}>
                {reminder.status_display}
              </span>
              {reminder.reminder_sent && (
                <span className="px-3 py-1 text-sm rounded-full bg-purple-100 text-purple-800 flex items-center">
                  <Bell size={14} className="mr-1" />
                  Notification Sent
                </span>
              )}
            </div>
            <div className="text-sm text-gray-500">
              ID: {reminder.id.substring(0, 8)}...
            </div>
          </div>

          {/* Amount and Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Promised Amount</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(reminder.promised_amount)}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Promised Date</p>
              <p className={`text-xl font-semibold ${reminder.is_overdue ? 'text-red-600' : ''}`}>
                {formatDate(reminder.promised_date)}
              </p>
              <p className="text-sm text-gray-500">
                {reminder.days_until_due > 0 
                  ? `${reminder.days_until_due} days remaining`
                  : reminder.days_until_due === 0
                    ? 'Due today'
                    : `${Math.abs(reminder.days_until_due)} days overdue`
                }
              </p>
            </div>
          </div>

          {/* Payment Details */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Payment Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Payment Method</p>
                <p className="font-medium">{reminder.payment_method_display}</p>
              </div>
              {reminder.payment_reference && (
                <div>
                  <p className="text-xs text-gray-500">Reference</p>
                  <p className="font-medium">{reminder.payment_reference}</p>
                </div>
              )}
              {reminder.actual_payment_date && (
                <div>
                  <p className="text-xs text-gray-500">Actual Payment Date</p>
                  <p className="font-medium">{formatDate(reminder.actual_payment_date)}</p>
                </div>
              )}
              {reminder.actual_paid_amount && (
                <div>
                  <p className="text-xs text-gray-500">Actual Amount Paid</p>
                  <p className="font-medium text-green-600">
                    {formatCurrency(reminder.actual_paid_amount)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Officer Info */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Officer Information</h3>
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                <User size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="font-medium">{reminder.officer_name}</p>
                <p className="text-sm text-gray-500">Officer ID: {reminder.officer}</p>
              </div>
            </div>
          </div>

          {/* Related Records */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Related Records</h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500">Call Log</p>
                <Link 
                  href={`/call_logs/${reminder.call_log}`}
                  className="text-sm text-blue-600 hover:underline inline-flex items-center"
                >
                  {reminder.call_log}
                </Link>
              </div>
           
              {reminder.installment && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Installment</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleViewInstallment}
                    disabled={isLoadingInstallment}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <Eye size={16} className="mr-2" />
                    {isLoadingInstallment ? 'Loading...' : `View Installment #${reminder.installment.substring(0, 8)}...`}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {reminder.resolution_notes && (
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Resolution Notes</h3>
              <p className="text-sm bg-gray-50 p-3 rounded">{reminder.resolution_notes}</p>
            </div>
          )}

          {/* Timestamps */}
          <div className="border-t border-gray-200 pt-4">
            <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
              <div>Created: {formatDate(reminder.created_at)}</div>
              <div>Updated: {formatDate(reminder.updated_at)}</div>
              {reminder.reminder_sent_at && (
                <div>Reminder Sent: {formatDate(reminder.reminder_sent_at)}</div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            {reminder.status === 'pending' && (
              <>
                <Button variant="outline" onClick={onEdit}>
                  <Edit size={16} className="mr-2" />
                  Edit
                </Button>
                <Button variant="outline" onClick={onReschedule}>
                  <RefreshCw size={16} className="mr-2" />
                  Reschedule
                </Button>
                <Button className="bg-green-600 hover:bg-green-700" onClick={onMarkPaid}>
                  <CheckCircle size={16} className="mr-2" />
                  Mark as Paid
                </Button>
              </>
            )}
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Installment Details Modal */}
      {installmentDetails && loanDetails && (
        <InstallmentDetailsModal
          isOpen={isInstallmentModalOpen}
          onClose={() => {
            setIsInstallmentModalOpen(false);
            // Clear the data when closing
            setInstallmentDetails(null);
            setLoanDetails(null);
          }}
          installment={installmentDetails}
          loanDetails={loanDetails}
        />
      )}
    </>
  );
}