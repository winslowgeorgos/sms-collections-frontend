// components/loans/BulkReassignModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/forms/FormInput';
import { apiClient } from '@/lib/api';
import { AlertCircle, UserCheck } from 'lucide-react';

interface BulkReassignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReassign: (targetOfficer: string, reason: string, skipErrors: boolean, updateInstallments: boolean) => Promise<void>;
  onSingleReassign?: (loanId: string, targetOfficer: string, reason: string, updateInstallments: boolean) => Promise<void>;
  selectedCount: number;
  selectedLoans: string[];
  currentOfficers: string[];
}

export default function BulkReassignModal({
  isOpen,
  onClose,
  onReassign,
  onSingleReassign,
  selectedCount,
  selectedLoans,
  currentOfficers
}: BulkReassignModalProps) {
  const [targetOfficer, setTargetOfficer] = useState('');
  const [reason, setReason] = useState('');
  const [skipErrors, setSkipErrors] = useState(true);
  const [updateInstallments, setUpdateInstallments] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [officers, setOfficers] = useState<Array<{id: number, username: string, full_name?: string}>>([]);

  useEffect(() => {
    if (isOpen) {
      fetchOfficers();
      // Reset form when modal opens
      setTargetOfficer('');
      setReason('');
      setSkipErrors(true);
      setUpdateInstallments(true);
      setErrors({});
    }
  }, [isOpen]);

  const fetchOfficers = async () => {
    try {
      const client = apiClient.getClient();
      // Using the same pattern as BulkAssignModal
      const response = await client.get('/users/?role=collection_officer');
      setOfficers(response.data?.results || response.data || []);
    } catch (error) {
      console.error('Error fetching officers:', error);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!targetOfficer.trim()) {
      newErrors.targetOfficer = 'Target officer is required';
    }
    
    if (!reason.trim()) {
      newErrors.reason = 'Reassignment reason is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    try {
      if (selectedCount === 1 && onSingleReassign) {
        await onSingleReassign(selectedLoans[0], targetOfficer, reason, updateInstallments);
      } else {
        await onReassign(targetOfficer, reason, skipErrors, updateInstallments);
      }
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error in bulk reassign:', error);
      setErrors({ form: 'Failed to reassign loans. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTargetOfficer('');
    setReason('');
    setSkipErrors(true);
    setUpdateInstallments(true);
    setErrors({});
  };

  const selectedOfficerInfo = officers.find(o => o.username === targetOfficer);

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        resetForm();
        onClose();
      }}
      title={`Reassign Loans (${selectedCount} selected)`}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 p-6">
        {/* Warning about reassignment */}
        <div className="bg-orange-50 border-l-4 border-orange-400 p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-orange-400" />
            <div className="ml-3">
              <p className="text-sm text-orange-700">
                You are about to reassign <strong>{selectedCount}</strong> loan{selectedCount !== 1 ? 's' : ''} 
                {currentOfficers.length > 0 && currentOfficers[0] !== 'Unknown' && (
                  <> from <span className="font-medium">{currentOfficers.join(', ')}</span></>
                )}.
                This will update the assignment records and track when the previous officer stopped being assigned.
              </p>
            </div>
          </div>
        </div>

        {/* Target Officer Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Target Officer <span className="text-red-500">*</span>
          </label>
          <select
            value={targetOfficer}
            onChange={(e) => setTargetOfficer(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSubmitting}
          >
            <option value="">Select target officer...</option>
            {officers
              .filter(o => !currentOfficers.includes(o.username)) // Don't show current officers as targets
              .map((officer) => (
                <option key={officer.id} value={officer.username}>
                  {officer.full_name || officer.username} ({officer.username})
                </option>
              ))}
          </select>
          {errors.targetOfficer && (
            <p className="mt-1 text-sm text-red-600">{errors.targetOfficer}</p>
          )}
          {currentOfficers.length > 0 && currentOfficers[0] !== 'Unknown' && (
            <p className="mt-1 text-xs text-gray-500">
              Current officer{currentOfficers.length !== 1 ? 's' : ''}: {currentOfficers.join(', ')}
            </p>
          )}
        </div>

        {/* Selected Officer Info (if any) */}
        {selectedOfficerInfo && (
          <div className="bg-blue-50 p-3 rounded-md">
            <div className="flex items-center">
              <UserCheck className="h-5 w-5 text-blue-600 mr-2" />
              <div>
                <p className="text-sm font-medium text-blue-900">Selected Officer</p>
                <p className="text-sm text-blue-700">
                  {selectedOfficerInfo.full_name || selectedOfficerInfo.username} will receive these {selectedCount} loan{selectedCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Reason for Reassignment */}
        <FormInput
          label="Reassignment Reason"
          name="reason"
          type="textarea"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          error={errors.reason}
          required
          placeholder="Enter reason for reassignment (e.g., Workload redistribution, Team restructuring, Specialization)"
          rows={3}
          disabled={isSubmitting}
        />

        {/* Options */}
        <div className="space-y-3">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="updateInstallments"
              checked={updateInstallments}
              onChange={(e) => setUpdateInstallments(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              disabled={isSubmitting}
            />
            <label htmlFor="updateInstallments" className="ml-2 block text-sm text-gray-900">
              Update all installments to new officer (recommended)
            </label>
          </div>

          {selectedCount > 1 && (
            <div className="flex items-center">
              <input
                type="checkbox"
                id="skipErrors"
                checked={skipErrors}
                onChange={(e) => setSkipErrors(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={isSubmitting}
              />
              <label htmlFor="skipErrors" className="ml-2 block text-sm text-gray-900">
                Skip errors and continue with remaining loans
              </label>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-800">
            <strong>Reassignment Summary:</strong>
          </p>
          <ul className="mt-2 text-sm text-gray-600 space-y-1 list-disc list-inside">
            <li>Loans to reassign: <span className="font-medium">{selectedCount}</span></li>
            {currentOfficers.length > 0 && currentOfficers[0] !== 'Unknown' && (
              <li>Current officer(s): <span className="font-medium">{currentOfficers.join(', ')}</span></li>
            )}
            <li>Previous assignments will be marked as completed with end timestamps</li>
            <li>New assignment records will be created</li>
            <li>Assignment history will be preserved for audit</li>
          </ul>
        </div>

        {/* Form Error */}
        {errors.form && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <p className="text-sm text-red-700">{errors.form}</p>
          </div>
        )}

        {/* Action Buttons */}
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
            className="bg-orange-600 hover:bg-orange-700"
            disabled={isSubmitting || !targetOfficer || !reason.trim()}
          >
            {isSubmitting ? 'Reassigning...' : `Reassign ${selectedCount} Loan${selectedCount !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </form>
    </Modal>
  );
}