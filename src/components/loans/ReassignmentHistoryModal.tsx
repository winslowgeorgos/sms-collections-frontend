// components/loans/ReassignmentHistoryModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api';
import { 
  History, UserCheck, UserMinus, Clock,
  Download, AlertCircle, Calendar
} from 'lucide-react';

interface ReassignmentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  loanId: string | null;
}

interface ReassignmentRecord {
  id: string;
  loan_id: string;
  previous_officer: string | null;
  new_officer: {
    id: number;
    username: string;
  };
  assigned_by: {
    id: number;
    username: string;
  };
  assigned_at: string;
  completed_at: string | null;
  reason: string;
  notes: string;
  duration_days: number;
}

export default function ReassignmentHistoryModal({
  isOpen,
  onClose,
  loanId
}: ReassignmentHistoryModalProps) {
  const [history, setHistory] = useState<ReassignmentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && loanId) {
      fetchHistory();
    }
  }, [isOpen, loanId]);

  const fetchHistory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const client = apiClient.getClient();
      const response = await client.get(`/loan-processor/reassignment-history/?loan_id=${loanId}`);
      setHistory(response.data.history || []);
    } catch (error) {
      console.error('Error fetching reassignment history:', error);
      setError('Failed to load reassignment history');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (days: number) => {
    if (days < 1) return 'Less than a day';
    if (days === 1) return '1 day';
    if (days < 30) return `${days} days`;
    if (days < 365) {
      const months = Math.floor(days / 30);
      return `${months} month${months > 1 ? 's' : ''}`;
    }
    const years = Math.floor(days / 365);
    const remainingDays = days % 365;
    return `${years} year${years > 1 ? 's' : ''}${remainingDays > 0 ? `, ${remainingDays} days` : ''}`;
  };

  const exportHistory = () => {
    const headers = ['Date', 'From Officer', 'To Officer', 'Assigned By', 'Duration', 'Reason'];
    const csvContent = [
      headers.join(','),
      ...history.map(record => [
        formatDate(record.assigned_at),
        record.previous_officer || 'Unassigned',
        record.new_officer?.username || 'Unknown',
        record.assigned_by?.username || 'System',
        formatDuration(record.duration_days),
        `"${record.reason.replace(/"/g, '""')}"` // Escape quotes in CSV
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reassignment-history-${loanId}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Reassignment History - ${loanId || 'Loan'}`}
      size="lg"
    >
      <div className="p-6">
        {/* Header with export */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center">
            <History className="h-5 w-5 text-purple-600 mr-2" />
            <h3 className="text-lg font-medium">Assignment Timeline</h3>
          </div>
          {history.length > 0 && (
            <Button variant="outline" size="sm" onClick={exportHistory}>
              <Download size={16} className="mr-2" />
              Export CSV
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="text-gray-600">Loading reassignment history...</div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <p className="ml-3 text-sm text-red-700">{error}</p>
            </div>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <History className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No reassignment history found for this loan</p>
            <p className="text-sm text-gray-500 mt-1">This loan has never been reassigned</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
            {/* Timeline */}
            <div className="relative">
              {history.map((record, index) => (
                <div key={record.id} className="mb-6 relative">
                  {/* Timeline line */}
                  {index < history.length - 1 && (
                    <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-gray-200"></div>
                  )}
                  
                  <div className="flex">
                    {/* Timeline dot */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center z-10">
                      <UserCheck className="h-4 w-4 text-purple-600" />
                    </div>
                    
                    {/* Content */}
                    <div className="ml-4 flex-1 bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="text-sm font-medium text-gray-900">
                            Reassignment #{history.length - index}
                          </span>
                          <span className="ml-2 text-xs text-gray-500">
                            {formatDate(record.assigned_at)}
                          </span>
                        </div>
                        {record.completed_at && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                            Completed
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div>
                          <p className="text-xs text-gray-500">From</p>
                          <div className="flex items-center mt-1">
                            <UserMinus className="h-4 w-4 text-orange-500 mr-1" />
                            <span className="text-sm font-medium">
                              {record.previous_officer || 'Unassigned'}
                            </span>
                          </div>
                        </div>
                        
                        <div>
                          <p className="text-xs text-gray-500">To</p>
                          <div className="flex items-center mt-1">
                            <UserCheck className="h-4 w-4 text-green-500 mr-1" />
                            <span className="text-sm font-medium">
                              {record.new_officer?.username || 'Unknown'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div>
                          <p className="text-xs text-gray-500">Assigned By</p>
                          <p className="text-sm">{record.assigned_by?.username || 'System'}</p>
                        </div>
                        
                        <div>
                          <p className="text-xs text-gray-500">Duration</p>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 text-gray-400 mr-1" />
                            <span className="text-sm">{formatDuration(record.duration_days)}</span>
                          </div>
                        </div>
                      </div>
                      
                      {record.reason && (
                        <div className="mt-3">
                          <p className="text-xs text-gray-500">Reason</p>
                          <p className="text-sm bg-gray-50 p-2 rounded mt-1">{record.reason}</p>
                        </div>
                      )}
                      
                      {record.notes && record.notes !== record.reason && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500">Notes</p>
                          <p className="text-sm text-gray-600">{record.notes}</p>
                        </div>
                      )}
                      
                      {record.completed_at && (
                        <div className="mt-3 text-xs text-gray-400 border-t pt-2">
                          <Calendar className="inline h-3 w-3 mr-1" />
                          Ended: {formatDate(record.completed_at)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary Stats */}
            <div className="bg-gray-50 p-4 rounded-lg mt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Summary Statistics</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Total Reassignments</p>
                  <p className="text-lg font-semibold">{history.length}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Unique Officers</p>
                  <p className="text-lg font-semibold">
                    {new Set(history.map(h => h.new_officer?.username).filter(Boolean)).size}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Avg Duration</p>
                  <p className="text-lg font-semibold">
                    {formatDuration(
                      history.reduce((sum, h) => sum + h.duration_days, 0) / history.length
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Close Button */}
        <div className="mt-6 flex justify-end">
          <Button onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}