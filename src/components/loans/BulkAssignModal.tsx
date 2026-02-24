// components/loans/BulkAssignModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/forms/FormInput';
import { apiClient } from '@/lib/api';

interface BulkAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (officerUsername: string, reason: string, skipErrors: boolean) => Promise<void>;
  selectedCount: number;
}

export default function BulkAssignModal({ isOpen, onClose, onAssign, selectedCount }: BulkAssignModalProps) {
  const [officerUsername, setOfficerUsername] = useState('');
  const [reason, setReason] = useState('');
  const [skipErrors, setSkipErrors] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [officers, setOfficers] = useState<Array<{id: number, username: string}>>([]);

  useEffect(() => {
    if (isOpen) {
      fetchOfficers();
    }
  }, [isOpen]);

  const fetchOfficers = async () => {
    try {
      const client = apiClient.getClient();
      // This endpoint might need adjustment based on your API
      const response = await client.get('/users/?role=collection_officer');
      setOfficers(response.data?.results || []);
    } catch (error) {
      console.error('Error fetching officers:', error);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!officerUsername.trim()) {
      newErrors.officerUsername = 'Officer username is required';
    }
    
    if (!reason.trim()) {
      newErrors.reason = 'Assignment reason is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    try {
      await onAssign(officerUsername, reason, skipErrors);
      resetForm();
    } catch (error) {
      console.error('Error in bulk assign:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setOfficerUsername('');
    setReason('');
    setSkipErrors(true);
    setErrors({});
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        resetForm();
        onClose();
      }}
      title={`Bulk Assign Loans (${selectedCount} selected)`}
      size="md"
      isLoading={isSubmitting}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Collection Officer
          </label>
          <select
            value={officerUsername}
            onChange={(e) => setOfficerUsername(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select officer...</option>
            {officers.map((officer) => (
              <option key={officer.id} value={officer.username}>
                {officer.username}
              </option>
            ))}
          </select>
          {errors.officerUsername && (
            <p className="mt-1 text-sm text-red-600">{errors.officerUsername}</p>
          )}
        </div>

        <FormInput
          label="Assignment Reason"
          name="reason"
          type="textarea"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          error={errors.reason}
          required
          placeholder="Enter reason for assignment (e.g., Weekly field assignment)"
          rows={3}
        />

        <div className="flex items-center">
          <input
            type="checkbox"
            id="skipErrors"
            checked={skipErrors}
            onChange={(e) => setSkipErrors(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="skipErrors" className="ml-2 block text-sm text-gray-900">
            Skip errors and continue with remaining loans
          </label>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-800">
            You are about to assign <strong>{selectedCount}</strong> loan{selectedCount !== 1 ? 's' : ''} to the selected officer.
            {skipErrors && ' Loans that are already assigned will be skipped.'}
          </p>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              resetForm();
              onClose();
            }}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-green-600 hover:bg-green-700"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Assigning...' : 'Assign Loans'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}