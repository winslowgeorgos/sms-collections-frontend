// components/call-logs/CreateCallLogModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api';
import { LoanDetails } from '@/app/loans/[id]/page';
import AddPaymentReminderModal from './AddPaymentReminderModal';
import SendSMSModal from '@/components/loans/SendSMSModal';

interface CreateCallLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  prefillLoanId?: string;
  prefillInstallmentId?: string;
  fullLoanDetails?: LoanDetails['main_loan'];
}

const OUTCOME_OPTIONS = [
  { value: 'contacted', label: 'Customer Contacted' },
  { value: 'no_answer', label: 'No Answer' },
  { value: 'busy', label: 'Line Busy' },
  { value: 'callback', label: 'Customer Requested Callback' },
  { value: 'voicemail', label: 'Left Voicemail' },
  { value: 'wrong_number', label: 'Wrong Number' },
  { value: 'disconnected', label: 'Number Disconnected' },
  { value: 'switched_off', label: 'Phone Switched Off' },
  { value: 'language', label: 'Language Barrier' },
  { value: 'hung_up', label: 'Customer Hung Up' },
  { value: 'abusive', label: 'Abusive Customer' },
  { value: 'promise', label: 'Promise to Pay' },
  { value: 'partial', label: 'Partial Payment Made' },
  { value: 'full', label: 'Full Payment Made' },
];

const CUSTOMER_ATTITUDE_OPTIONS = [
  { value: 'cooperative', label: 'Cooperative' },
  { value: 'uncooperative', label: 'Uncooperative' },
  { value: 'angry', label: 'Angry/Frustrated' },
  { value: 'polite', label: 'Polite' },
  { value: 'evasive', label: 'Evasive' },
  { value: 'promised', label: 'Promised Payment' },
];

export default function CreateCallLogModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  prefillLoanId,
  prefillInstallmentId,
  fullLoanDetails
}: CreateCallLogModalProps) {
  const [formData, setFormData] = useState({
    main_loan: prefillLoanId || '',
    installment: prefillInstallmentId || '',
    call_time: new Date().toISOString().slice(0, 16),
    duration_seconds: 60,
    phone_number_used: fullLoanDetails?.phone_number || '',
    contact_person: fullLoanDetails?.customer_name || '',
    outcome: '',
    notes: '',
    customer_attitude: '',
    follow_up_required: false,
    follow_up_date: '',
    // Promise to pay fields
    promised_amount: '',
  });
  const [loans, setLoans] = useState<Array<{ id: string; loan_id: string; customer_name: string }>>([]);
  const [installments, setInstallments] = useState<Array<{ id: string; installment_id: number; due_date: string; balance: number }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // State for payment reminder modal
  const [showPaymentReminder, setShowPaymentReminder] = useState(false);
  const [showSMSModal, setShowSMSModal] = useState(false);
  const [createdCallLogId, setCreatedCallLogId] = useState<string | null>(null);
  const [createdReminderId, setCreatedReminderId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchLoans();
      // Reset state when modal opens
      resetForm();
    }
  }, [isOpen]);

  useEffect(() => {
    if (formData.main_loan) {
      fetchInstallments(formData.main_loan);
    }
  }, [formData.main_loan]);

  const fetchLoans = async () => {
    try {
      const client = apiClient.getClient();
      const response = await client.get('/loans/?page_size=500');
      setLoans(response.data?.results || []);
    } catch (error) {
      console.error('Error fetching loans:', error);
    }
  };

  const fetchInstallments = async (loanId: string) => {
    try {
      const client = apiClient.getClient();
      const response = await client.get(`/installments/?main_loan=${loanId}`);
      setInstallments(response.data?.results || []);
    } catch (error) {
      console.error('Error fetching installments:', error);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.main_loan) {
      newErrors.main_loan = 'Loan is required';
    }
    if (!formData.call_time) {
      newErrors.call_time = 'Call time is required';
    }
    if (!formData.duration_seconds || formData.duration_seconds < 0) {
      newErrors.duration_seconds = 'Valid duration is required';
    }
    if (!formData.outcome) {
      newErrors.outcome = 'Outcome is required';
    }
    
    // Validate promised amount if outcome is 'promise'
    if (formData.outcome === 'promise' && !formData.promised_amount) {
      newErrors.promised_amount = 'Promised amount is required';
    } else if (formData.outcome === 'promise' && Number(formData.promised_amount) <= 0) {
      newErrors.promised_amount = 'Valid amount is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    try {
      const client = apiClient.getClient();
      const response = await client.post('/call-logs/', {
        main_loan: formData.main_loan,
        installment: formData.installment || undefined,
        call_time: new Date(formData.call_time).toISOString(),
        duration_seconds: formData.duration_seconds,
        phone_number_used: formData.phone_number_used,
        contact_person: formData.contact_person,
        outcome: formData.outcome,
        notes: formData.notes,
        customer_attitude: formData.customer_attitude || undefined,
        follow_up_required: formData.follow_up_required,
        follow_up_date: formData.follow_up_date ? new Date(formData.follow_up_date).toISOString() : null,
      });
      
      const createdCallLog = response.data;
      setCreatedCallLogId(createdCallLog.id);
      
      // If outcome is promise, show payment reminder modal instead of closing
      if (formData.outcome === 'promise') {
        setShowPaymentReminder(true);
      } else {
        onSuccess();
        resetForm();
        onClose();
      }
    } catch (error: any) {
      console.error('Error creating call log:', error);
      if (error.response?.data) {
        setErrors(error.response.data);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentReminderSubmit = async (reminderData: any) => {
    if (!createdCallLogId) {
      console.error('No call log ID available');
      return;
    }

    try {
      const client = apiClient.getClient();
      
      const response = await client.post(`/call-logs/${createdCallLogId}/add_payment_reminder/`, {
        promised_amount: Number(formData.promised_amount),
        promised_date: reminderData.promised_date,
        payment_method: reminderData.payment_method,
        follow_up_call_required: reminderData.follow_up_call_required,
        notes: formData.notes,
        installment: formData.installment || undefined,
      });
      
      setCreatedReminderId(response.data.id);
      
      // Close payment reminder modal first
      setShowPaymentReminder(false);
      
      // Small delay to ensure the payment reminder modal is fully closed
      setTimeout(() => {
        setShowSMSModal(true);
        console.log('Setting showSMSModal to true, createdCallLogId:', createdCallLogId);
      }, 150);
      
    } catch (error) {
      console.error('Error creating payment reminder:', error);
      throw error;
    }
  };

  const handleSMSSent = () => {
    // Complete the flow
    setShowSMSModal(false);
    onSuccess();
    resetForm();
    onClose();
  };

  const handleSkipSMS = () => {
    // Skip SMS and complete the flow
    setShowSMSModal(false);
    onSuccess();
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setFormData({
      main_loan: prefillLoanId || '',
      installment: prefillInstallmentId || '',
      call_time: new Date().toISOString().slice(0, 16),
      duration_seconds: 60,
      phone_number_used: fullLoanDetails?.phone_number || '',
      contact_person: fullLoanDetails?.customer_name || '',
      outcome: '',
      notes: '',
      customer_attitude: '',
      follow_up_required: false,
      follow_up_date: '',
      promised_amount: '',
    });
    setErrors({});
    // Don't reset these when just closing modals in the flow
    // setCreatedCallLogId(null);
    // setCreatedReminderId(null);
    // setShowPaymentReminder(false);
    // setShowSMSModal(false);
  };

  const handleCloseAll = () => {
    setCreatedCallLogId(null);
    setCreatedReminderId(null);
    setShowPaymentReminder(false);
    setShowSMSModal(false);
    resetForm();
    onClose();
  };

  const selectedInstallment = installments.find(i => i.id === formData.installment);

  return (
    <>
      <Modal
        isOpen={isOpen && !showPaymentReminder && !showSMSModal}
        onClose={handleCloseAll}
        title="Log New Call"
        size="lg"
        isLoading={isSubmitting}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {fullLoanDetails && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Customer:</span> {fullLoanDetails.customer_name}
              </p>
              <p className="text-sm text-blue-800">
                <span className="font-medium">Loan:</span> {fullLoanDetails.loan_id}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Call Time *
              </label>
              <input
                type="datetime-local"
                value={formData.call_time}
                onChange={(e) => setFormData(prev => ({ ...prev, call_time: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              {errors.call_time && <p className="mt-1 text-sm text-red-600">{errors.call_time}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (seconds) *
              </label>
              <input
                type="number"
                value={formData.duration_seconds}
                onChange={(e) => setFormData(prev => ({ ...prev, duration_seconds: Number(e.target.value) }))}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              {errors.duration_seconds && <p className="mt-1 text-sm text-red-600">{errors.duration_seconds}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number Used
              </label>
              <input
                type="text"
                value={formData.phone_number_used}
                onChange={(e) => setFormData(prev => ({ ...prev, phone_number_used: e.target.value }))}
                placeholder="e.g., 254712345678"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Person
              </label>
              <input
                type="text"
                value={formData.contact_person}
                onChange={(e) => setFormData(prev => ({ ...prev, contact_person: e.target.value }))}
                placeholder="Customer name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Outcome *
              </label>
              <select
                value={formData.outcome}
                onChange={(e) => setFormData(prev => ({ ...prev, outcome: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Select outcome...</option>
                {OUTCOME_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.outcome && <p className="mt-1 text-sm text-red-600">{errors.outcome}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Attitude
              </label>
              <select
                value={formData.customer_attitude}
                onChange={(e) => setFormData(prev => ({ ...prev, customer_attitude: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Select attitude...</option>
                {CUSTOMER_ATTITUDE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Promised Amount Input - Shows only when Promise to Pay is selected */}
          {formData.outcome === 'promise' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount Promised (KSh) *
              </label>
              <input
                type="number"
                value={formData.promised_amount}
                onChange={(e) => setFormData(prev => ({ ...prev, promised_amount: e.target.value }))}
                placeholder="Enter promised amount"
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.promised_amount && <p className="mt-1 text-sm text-red-600">{errors.promised_amount}</p>}
              <p className="mt-1 text-xs text-gray-500">
                A payment reminder will be created after saving the call log.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              placeholder="Enter call notes..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="follow_up_required"
                checked={formData.follow_up_required}
                onChange={(e) => setFormData(prev => ({ ...prev, follow_up_required: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="follow_up_required" className="ml-2 block text-sm text-gray-900">
                Follow-up Required
              </label>
            </div>

            {formData.follow_up_required && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Follow-up Date
                </label>
                <input
                  type="datetime-local"
                  value={formData.follow_up_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, follow_up_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={handleCloseAll} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : formData.outcome === 'promise' ? 'Save & Continue' : 'Log Call'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Payment Reminder Modal */}
      {fullLoanDetails && createdCallLogId && showPaymentReminder && (
        <AddPaymentReminderModal
          isOpen={showPaymentReminder}
          onClose={() => {
            setShowPaymentReminder(false);
            // Don't call onSuccess, resetForm, or onClose here
            // Just go back to the main modal
          }}
          onSubmit={handlePaymentReminderSubmit}
          loanDetails={{
            customer_name: fullLoanDetails.customer_name,
            loan_id: fullLoanDetails.loan_id,
            total_outstanding: fullLoanDetails.total_outstanding || 0,
          }}
          installmentDetails={selectedInstallment ? {
            installment_id: selectedInstallment.installment_id,
            balance: selectedInstallment.balance,
            due_date: selectedInstallment.due_date,
          } : null}
          defaultPromisedAmount={Number(formData.promised_amount)}
          defaultPromisedDate={formData.follow_up_date}
        />
      )}

      {/* SMS Modal */}
      {fullLoanDetails && createdCallLogId && showSMSModal && (
        <SendSMSModal
          isOpen={showSMSModal}
          onClose={handleSkipSMS}
          onSuccess={handleSMSSent}
          loanId={fullLoanDetails.loan_id}
          loanUuid={fullLoanDetails.id}
          customerName={fullLoanDetails.customer_name}
          phoneNumber={fullLoanDetails.phone_number}
          currentMonthInstallmentId={formData.installment || undefined}
          callLogId={createdCallLogId}
          paymentReminderId={createdReminderId || undefined}
        />
      )}
    </>
  );
}