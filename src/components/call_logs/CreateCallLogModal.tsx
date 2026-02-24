// components/call-logs/CreateCallLogModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/forms/FormInput';
import { apiClient } from '@/lib/api';
import { LoanDetails} from '@/app/loans/[id]/page';


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
  { value: 'promise', label: 'Promise to Pay Made' },
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
  });
  const [loans, setLoans] = useState<Array<{ id: string; loan_id: string; customer_name: string }>>([]);
  const [installments, setInstallments] = useState<Array<{ id: string; installment_id: number; due_date: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      fetchLoans();
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
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    try {
      const client = apiClient.getClient();
      await client.post('/call-logs/', {
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
      
      onSuccess();
      resetForm();
      onClose();
    } catch (error: any) {
      console.error('Error creating call log:', error);
      if (error.response?.data) {
        setErrors(error.response.data);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      main_loan: '',
      installment: '',
      call_time: new Date().toISOString().slice(0, 16),
      duration_seconds: 60,
      phone_number_used: '',
      contact_person: '',
      outcome: '',
      notes: '',
      customer_attitude: '',
      follow_up_required: false,
      follow_up_date: '',
    });
    setErrors({});
  };

  return (
    // accept current loan and installment as props and prefill the form when modal opens with those values. Also, if a loan is selected, fetch and show its installments in the dropdown.

    <Modal
      isOpen={isOpen}
      onClose={() => {
        resetForm();
        onClose();
      }}
      title="Log New Call"
      size="lg"
      isLoading={isSubmitting}

    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Loan Selection */}
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

        {/* <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Loan *
          </label>
          <select
            value={formData.main_loan}
            onChange={(e) => setFormData(prev => ({ ...prev, main_loan: e.target.value, installment: '' }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select loan...</option>
            {loans.map((loan) => (
              <option key={formData.main_loan} value={formData.main_loan}>
                {formData.main_loan || "N/A"}
              </option>
            ))}
          </select>
          {errors.main_loan && <p className="mt-1 text-sm text-red-600">{errors.main_loan}</p>}
        </div> */}

        {/* Installment Selection (Optional)
        {formData.main_loan && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Installment (Optional)
            </label>
            <select
              value={formData.installment}
              onChange={(e) => setFormData(prev => ({ ...prev, installment: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">No specific installment</option>
              {installments.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  Installment #{inst.installment_id} - Due: {new Date(inst.due_date).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>
        )} */}

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
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Log Call'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}