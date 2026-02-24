// components/payment-reminders/RescheduleModal.tsx
'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api';
import { RefreshCw } from 'lucide-react';

interface PaymentReminder {
  id: string;
  promised_amount: string;
  promised_date: string;
}

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  reminder: PaymentReminder;
  onSuccess: () => void;
}

export default function RescheduleModal({ isOpen, onClose, reminder, onSuccess }: RescheduleModalProps) {
  const [formData, setFormData] = useState({
    new_amount: reminder.promised_amount,
    new_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.new_amount || Number(formData.new_amount) <= 0) {
      newErrors.new_amount = 'Valid amount is required';
    }
    if (!formData.new_date) {
      newErrors.new_date = 'New date is required';
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
      await client.post(`/payment-reminders/${reminder.id}/reschedule/`, {
        new_amount: Number(formData.new_amount),
        new_date: new Date(formData.new_date).toISOString(),
      });
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error rescheduling reminder:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reschedule Payment Reminder"
      size="sm"
      isLoading={isSubmitting}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-yellow-50 p-4 rounded-lg mb-4">
          <div className="flex items-center">
            <RefreshCw className="h-5 w-5 text-yellow-600 mr-2" />
            <p className="text-sm text-yellow-800">
              Reschedule reminder from {new Date(reminder.promised_date).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            New Amount (KSh)
          </label>
          <input
            type="number"
            value={formData.new_amount}
            onChange={(e) => setFormData(prev => ({ ...prev, new_amount: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            min="0"
            step="0.01"
            required
          />
          {errors.new_amount && <p className="mt-1 text-sm text-red-600">{errors.new_amount}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            New Promise Date
          </label>
          <input
            type="date"
            value={formData.new_date}
            onChange={(e) => setFormData(prev => ({ ...prev, new_date: e.target.value }))}
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            required
          />
          {errors.new_date && <p className="mt-1 text-sm text-red-600">{errors.new_date}</p>}
        </div>

        <div className="bg-blue-50 p-3 rounded-lg">
          <p className="text-xs text-blue-800">
            Note: The current reminder will be marked as rescheduled and a new reminder will be created with the updated details.
          </p>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" className="bg-yellow-600 hover:bg-yellow-700" disabled={isSubmitting}>
            {isSubmitting ? 'Rescheduling...' : 'Reschedule'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}