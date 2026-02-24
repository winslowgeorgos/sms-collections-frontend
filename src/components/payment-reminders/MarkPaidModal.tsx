// components/payment-reminders/MarkPaidModal.tsx
'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api';
import { CheckCircle } from 'lucide-react';

interface PaymentReminder {
  id: string;
  promised_amount: string;
  promised_date: string;
}

interface MarkPaidModalProps {
  isOpen: boolean;
  onClose: () => void;
  reminder: PaymentReminder;
  onSuccess: () => void;
}

export default function MarkPaidModal({ isOpen, onClose, reminder, onSuccess }: MarkPaidModalProps) {
  const [formData, setFormData] = useState({
    amount: reminder.promised_amount,
    payment_date: new Date().toISOString().split('T')[0],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.amount || Number(formData.amount) <= 0) {
      newErrors.amount = 'Valid amount is required';
    }
    if (!formData.payment_date) {
      newErrors.payment_date = 'Payment date is required';
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
      await client.post(`/payment-reminders/${reminder.id}/mark_paid/`, {
        amount: Number(formData.amount),
        payment_date: new Date(formData.payment_date).toISOString(),
      });
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error marking reminder as paid:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Mark Payment as Paid"
      size="sm"
      isLoading={isSubmitting}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-green-50 p-4 rounded-lg mb-4">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
            <p className="text-sm text-green-800">
              Record payment for reminder of {parseFloat(reminder.promised_amount).toLocaleString()}
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount Paid (KSh)
          </label>
          <input
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            min="0"
            step="0.01"
            required
          />
          {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Payment Date
          </label>
          <input
            type="date"
            value={formData.payment_date}
            onChange={(e) => setFormData(prev => ({ ...prev, payment_date: e.target.value }))}
            max={new Date().toISOString().split('T')[0]}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            required
          />
          {errors.payment_date && <p className="mt-1 text-sm text-red-600">{errors.payment_date}</p>}
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={isSubmitting}>
            {isSubmitting ? 'Processing...' : 'Confirm Payment'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}