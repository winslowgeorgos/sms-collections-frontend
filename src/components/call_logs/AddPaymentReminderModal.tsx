// components/call-logs/AddPaymentReminderModal.tsx
'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/forms/FormInput';

interface AddPaymentReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  loanDetails: {
    customer_name: string;
    loan_id: string;
    total_outstanding: number;
  };
  installmentDetails: {
    installment_id: number;
    balance: number;
    due_date: string;
  } | null;
}

const PAYMENT_METHODS = [
  { value: 'mpesa', label: 'M-PESA' },
  { value: 'bank', label: 'Bank Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
];

export default function AddPaymentReminderModal({
  isOpen,
  onClose,
  onSubmit,
  loanDetails,
  installmentDetails
}: AddPaymentReminderModalProps) {
  const [formData, setFormData] = useState({
    promised_amount: installmentDetails?.balance || loanDetails.total_outstanding || '',
    promised_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    payment_method: 'mpesa',
    follow_up_call_required: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.promised_amount || Number(formData.promised_amount) <= 0) {
      newErrors.promised_amount = 'Valid amount is required';
    }
    if (!formData.promised_date) {
      newErrors.promised_date = 'Promised date is required';
    }
    if (!formData.payment_method) {
      newErrors.payment_method = 'Payment method is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    try {

      await onSubmit({
        promised_amount: Number(formData.promised_amount),
        promised_date: new Date(formData.promised_date).toISOString(),
        payment_method: formData.payment_method,
        follow_up_call_required: formData.follow_up_call_required,
      });
      
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error adding payment reminder:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      promised_amount: installmentDetails?.balance || loanDetails.total_outstanding || '',
      promised_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      payment_method: 'mpesa',
      follow_up_call_required: true,
    });
    setErrors({});
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        resetForm();
        onClose();
      }}
      title="Add Payment Reminder"
      size="md"
      isLoading={isSubmitting}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg mb-4">
          <p className="text-sm text-blue-800">
            <span className="font-medium">Customer:</span> {loanDetails.customer_name}
          </p>
          <p className="text-sm text-blue-800">
            <span className="font-medium">Loan:</span> {loanDetails.loan_id}
          </p>
          {installmentDetails && (
            <>
              <p className="text-sm text-blue-800">
                <span className="font-medium">Installment #{installmentDetails.installment_id}:</span>{' '}
                Due {new Date(installmentDetails.due_date).toLocaleDateString()}
              </p>
              <p className="text-sm text-blue-800">
                <span className="font-medium">Installment Balance:</span>{' '}
                KSh {installmentDetails.balance.toLocaleString()}
              </p>
            </>
          )}
          <p className="text-sm text-blue-800 font-medium mt-1">
            Total Outstanding: KSh {loanDetails.total_outstanding.toLocaleString()}
          </p>
        </div>

        <FormInput
          label="Promised Amount (KSh)"
          name="promised_amount"
          type="number"
          value={formData.promised_amount}
          onChange={(e) => setFormData(prev => ({ ...prev, promised_amount: e.target.value }))}
          error={errors.promised_amount}
          required
          placeholder="Enter promised amount"
        //   min="0"
        //   step="0.01"
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Promised Date
          </label>
          <input
            type="date"
            value={formData.promised_date}
            onChange={(e) => setFormData(prev => ({ ...prev, promised_date: e.target.value }))}
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          {errors.promised_date && <p className="mt-1 text-sm text-red-600">{errors.promised_date}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Payment Method
          </label>
          <select
            value={formData.payment_method}
            onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            {PAYMENT_METHODS.map(method => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </select>
          {errors.payment_method && <p className="mt-1 text-sm text-red-600">{errors.payment_method}</p>}
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="follow_up_call"
            checked={formData.follow_up_call_required}
            onChange={(e) => setFormData(prev => ({ ...prev, follow_up_call_required: e.target.checked }))}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="follow_up_call" className="ml-2 block text-sm text-gray-900">
            Follow-up call required on promised date
          </label>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> This will create a payment reminder and schedule a follow-up if requested.
            The customer will be notified according to your campaign settings.
          </p>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={isSubmitting}>
            {isSubmitting ? 'Adding...' : 'Add Reminder'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}