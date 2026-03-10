// components/call_logs/CallLogDetailsModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api';
import { InstallmentDetailsModal } from './InstallmentDetailsModal';
import { 
  Phone, Clock, Calendar, User, AlertCircle,
  DollarSign, X, Eye, MessageSquare, CheckCircle
} from 'lucide-react';

interface CallLogDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  callId: string;
}

interface CallLogDetail {
  id: string;
  officer: number;
  officer_details: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  loan_details: {
    id: string;
    loan_id: string;
    customer_name: string;
    phone_number: string;
    total_outstanding: number;
    due_date: string;
    current_assigned_officer: string;
  };
  installment_details: {
    id: string;
    installment_id: number;
    due_date: string;
    balance: number;
    cumulative_balance: number;
    is_current_month: boolean;
    is_overdue: boolean;
  } | null;
  outcome_display: string;
  new_status_display: string | null;
  previous_status_display: string | null;
  customer_attitude_display: string;
  duration_minutes: number;
  payment_reminders: any[];
  call_time: string;
  duration_seconds: number;
  phone_number_used: string;
  contact_person: string;
  relationship: string | null;
  outcome: string;
  previous_collection_status: string | null;
  new_collection_status: string | null;
  notes: string;
  key_points: string | null;
  customer_attitude: string;
  customer_comments: string | null;
  customer_verified: boolean;
  verification_method: string | null;
  follow_up_required: boolean;
  follow_up_date: string | null;
  follow_up_notes: string | null;
  recording_url: string | null;
  created_at: string;
  updated_at: string;
  main_loan: string;
  installment: string | null;
}

export default function CallLogDetailsModal({ 
  isOpen, 
  onClose, 
  callId 
}: CallLogDetailsModalProps) {
  const [callLog, setCallLog] = useState<CallLogDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen && callId) {
      fetchCallLogDetails();
    }
  }, [isOpen, callId]);

  const fetchCallLogDetails = async () => {
    setIsLoading(true);
    try {
      const client = apiClient.getClient();
      const response = await client.get(`/call-logs/${callId}/`);
      setCallLog(response.data);
    } catch (error) {
      console.error('Error fetching call log:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCurrency = (value: number) => {
    return `KSh ${value.toLocaleString()}`;
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Call Log Details"
        size="lg"
      >
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-gray-600">Loading call details...</div>
          </div>
        ) : !callLog ? (
          <div className="text-center py-12">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">Call log not found</h3>
          </div>
        ) : (
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

            {/* Call Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500">Call Time</p>
                <p className="font-medium text-sm">{new Date(callLog.call_time).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Duration</p>
                <p className="font-medium text-sm">{formatDuration(callLog.duration_seconds)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Phone Used</p>
                <p className="font-medium text-sm">{callLog.phone_number_used}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Contact Person</p>
                <p className="font-medium text-sm">{callLog.contact_person || 'N/A'}</p>
              </div>
            </div>

            {/* Customer Info */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-600">Customer</p>
                  <p className="text-lg font-semibold">{callLog.loan_details.customer_name}</p>
                  <p className="text-sm mt-1">Loan: {callLog.loan_details.loan_id}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Outstanding</p>
                  <p className="text-lg font-semibold text-red-600">
                    {formatCurrency(callLog.loan_details.total_outstanding)}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <p className="text-xs text-gray-500">Phone</p>
                  <p className="font-medium">{callLog.loan_details.phone_number}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Due Date</p>
                  <p className="font-medium">{new Date(callLog.loan_details.due_date).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {/* Outcome and Attitude */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Outcome</p>
                <span className={`px-2 py-1 text-xs rounded-full inline-block ${
                  callLog.outcome === 'promise' ? 'bg-green-100 text-green-800' :
                  callLog.outcome === 'contacted' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {callLog.outcome_display}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Customer Attitude</p>
                <p className="font-medium text-sm">{callLog.customer_attitude_display}</p>
              </div>
            </div>

            {/* Notes */}
            {callLog.notes && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Notes</p>
                <p className="text-sm bg-gray-50 p-3 rounded-lg">{callLog.notes}</p>
              </div>
            )}

            {/* Installment Info */}
            {callLog.installment_details && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Calendar size={16} className="text-blue-600 mr-2" />
                    <span className="font-medium">Installment #{callLog.installment_details.installment_id}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsInstallmentModalOpen(true)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <Eye size={14} className="mr-1" />
                    View Details
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                  <div>
                    <span className="text-xs text-gray-600">Balance:</span>
                    <p className="font-medium text-sm">{formatCurrency(callLog.installment_details.balance)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-600">Due:</span>
                    <p className="font-medium text-sm">{new Date(callLog.installment_details.due_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-600">Status:</span>
                    <p className={`font-medium text-sm ${callLog.installment_details.is_overdue ? 'text-red-600' : 'text-green-600'}`}>
                      {callLog.installment_details.is_overdue ? 'Overdue' : 'Current'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Follow-up */}
            {callLog.follow_up_required && (
              <div className="p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center">
                  <Clock size={16} className="text-yellow-600 mr-2" />
                  <span className="font-medium text-sm">Follow-up Required</span>
                  {callLog.follow_up_date && (
                    <span className="ml-2 text-xs">
                      by {new Date(callLog.follow_up_date).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Officer Info */}
            <div className="border-t pt-4">
              <div className="flex items-center">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                  <User size={16} className="text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">{callLog.officer_details?.username}</p>
                  <p className="text-xs text-gray-500">
                    {callLog.officer_details?.first_name} {callLog.officer_details?.last_name}
                  </p>
                </div>
              </div>
            </div>

            {/* Timestamps */}
            <div className="grid grid-cols-2 gap-4 text-xs text-gray-500 border-t pt-4">
              <div>Created: {new Date(callLog.created_at).toLocaleString()}</div>
              <div>Updated: {new Date(callLog.updated_at).toLocaleString()}</div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Installment Details Modal */}
      {callLog?.installment_details && (
        <InstallmentDetailsModal
          isOpen={isInstallmentModalOpen}
          onClose={() => setIsInstallmentModalOpen(false)}
          installment={callLog.installment_details}
          loanDetails={{
            id: callLog.main_loan,
            loan_id: callLog.loan_details.loan_id,
            customer_name: callLog.loan_details.customer_name,
            total_outstanding: callLog.loan_details.total_outstanding
          }}
        />
      )}
    </>
  );
}