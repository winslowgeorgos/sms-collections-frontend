// app/call-logs/[id]/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { FormInput } from '@/components/forms/FormInput';
import { apiClient } from '@/lib/api';
import { 
  ArrowLeft, Phone, Clock, Calendar, User, Edit,
  Trash2, CheckCircle, AlertCircle, MessageSquare,
  DollarSign, Save, X, PhoneCall, UserCheck
} from 'lucide-react';
import AddPaymentReminderModal from '@/components/call_logs/AddPaymentReminderModal';
import { usePermissions } from '@/context/permission-context'; // <-- ADDED

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

const CUSTOMER_ATTITUDE_OPTIONS = [
  { value: 'cooperative', label: 'Cooperative' },
  { value: 'uncooperative', label: 'Uncooperative' },
  { value: 'angry', label: 'Angry/Frustrated' },
  { value: 'polite', label: 'Polite' },
  { value: 'evasive', label: 'Evasive' },
  { value: 'promised', label: 'Promised Payment' },
];

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

export default function CallLogDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const callId = params.id as string;
  const { hasAccess } = usePermissions(); // <-- ADDED

  // Permission shortcuts – adjust codenames as needed
  const canChange = hasAccess('change_calllog');
  const canDelete = hasAccess('delete_calllog');
  const canAddReminder = hasAccess('add_paymentreminder'); // or maybe a specific permission

  const [callLog, setCallLog] = useState<CallLogDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    notes: '',
    customer_attitude: '',
    follow_up_required: false,
    follow_up_date: '',
    outcome: '',
    phone_number_used: '',
    duration_seconds: 0,
    contact_person: '',
  });

  useEffect(() => {
    if (callId) {
      fetchCallLogDetails();
    }
  }, [callId]);

  const fetchCallLogDetails = async () => {
    setIsLoading(true);
    try {
      const client = apiClient.getClient();
      const response = await client.get(`/call-logs/${callId}/`);
      setCallLog(response.data);
      setFormData({
        notes: response.data.notes || '',
        customer_attitude: response.data.customer_attitude || '',
        follow_up_required: response.data.follow_up_required || false,
        follow_up_date: response.data.follow_up_date ? response.data.follow_up_date.split('T')[0] : '',
        outcome: response.data.outcome || '',
        phone_number_used: response.data.phone_number_used || '',
        duration_seconds: response.data.duration_seconds || 0,
        contact_person: response.data.contact_person || '',
      });
    } catch (error) {
      console.error('Error fetching call log details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async () => {
    setIsSubmitting(true);
    try {
      const client = apiClient.getClient();
      await client.put(`/call-logs/${callId}/`, {
        notes: formData.notes,
        customer_attitude: formData.customer_attitude,
        follow_up_required: formData.follow_up_required,
        follow_up_date: formData.follow_up_date ? new Date(formData.follow_up_date).toISOString() : null,
        outcome: formData.outcome,
        phone_number_used: formData.phone_number_used,
        duration_seconds: formData.duration_seconds,
        contact_person: formData.contact_person,
        main_loan: callLog?.main_loan
      });
      
      setIsEditMode(false);
      fetchCallLogDetails();
    } catch (error) {
      console.error('Error updating call log:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      const client = apiClient.getClient();
      await client.delete(`/call-logs/${callId}/`);
      router.push('/call_logs');
    } catch (error) {
      console.error('Error deleting call log:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddPaymentReminder = async (data: any) => {
    try {
      const client = apiClient.getClient();
      await client.post(`/call-logs/${callId}/add_payment_reminder/`, data);
      setIsReminderModalOpen(false);
      fetchCallLogDetails();
    } catch (error) {
      console.error('Error adding payment reminder:', error);
      throw error;
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">Loading call log details...</div>
      </div>
    );
  }

  if (!callLog) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
        <h3 className="mt-2 text-lg font-medium text-gray-900">Call log not found</h3>
        <p className="mt-1 text-sm text-gray-500">The call log you're looking for doesn't exist.</p>
        <Link href="/call_logs">
          <Button className="mt-4">Back to Call Logs</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/call_logs">
            <Button variant="outline" size="sm">
              <ArrowLeft size={16} className="mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Call Log Details</h1>
            <p className="text-gray-600">Call recorded on {new Date(callLog.call_time).toLocaleString()}</p>
          </div>
        </div>
        <div className="flex space-x-3">
          {!isEditMode && (
            <>
              {/* Edit button – requires change permission */}
              {canChange && (
                <Button variant="outline" onClick={() => setIsEditMode(true)}>
                  <Edit size={16} className="mr-2" />
                  Edit
                </Button>
              )}
              {/* Delete button – requires delete permission */}
              {canDelete && (
                <Button 
                  variant="outline" 
                  className="text-red-600 hover:text-red-700"
                  onClick={() => setIsDeleteModalOpen(true)}
                >
                  <Trash2 size={16} className="mr-2" />
                  Delete
                </Button>
              )}
            </>
          )}
          {isEditMode && (
            <>
              <Button variant="outline" onClick={() => setIsEditMode(false)}>
                <X size={16} className="mr-2" />
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={isSubmitting}>
                <Save size={16} className="mr-2" />
                Save Changes
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Call Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Loan Information */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Loan Information</h2>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Customer</p>
                  <Link 
                    href={`/loans/${callLog?.loan_details?.loan_id}`}
                    className="text-lg font-semibold text-blue-600 hover:underline"
                    target="_blank"
                  >
                    {callLog.loan_details.customer_name}
                  </Link>
                  <p className="text-sm mt-1">Loan: {callLog.loan_details.loan_id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="text-lg font-semibold">{callLog.loan_details.phone_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Outstanding</p>
                  <p className="text-lg font-semibold text-red-600">
                    KSh {callLog.loan_details.total_outstanding.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Due Date</p>
                  <p className="text-lg font-semibold">
                    {new Date(callLog.loan_details.due_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Call Details */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Call Details</h2>
            </CardHeader>
            <CardContent>
              {isEditMode ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Call Time
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.follow_up_date ? `${formData.follow_up_date}T00:00` : ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, follow_up_date: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Duration (seconds)
                      </label>
                      <input
                        type="number"
                        value={formData.duration_seconds}
                        onChange={(e) => setFormData(prev => ({ ...prev, duration_seconds: Number(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number Used
                    </label>
                    <input
                      type="text"
                      value={formData.phone_number_used}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone_number_used: e.target.value }))}
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Outcome
                    </label>
                    <select
                      value={formData.outcome}
                      onChange={(e) => setFormData(prev => ({ ...prev, outcome: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Select outcome</option>
                      {OUTCOME_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
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
                      <option value="">Select attitude</option>
                      {CUSTOMER_ATTITUDE_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div className="flex items-center space-x-4">
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
                      <div className="flex-1">
                        <input
                          type="date"
                          value={formData.follow_up_date}
                          onChange={(e) => setFormData(prev => ({ ...prev, follow_up_date: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="Follow-up Date"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Call Time</p>
                      <p className="font-medium">{new Date(callLog.call_time).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Duration</p>
                      <p className="font-medium">{formatDuration(callLog.duration_seconds)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Phone Used</p>
                      <p className="font-medium">{callLog.phone_number_used}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Contact Person</p>
                      <p className="font-medium">{callLog.contact_person}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Outcome</p>
                      <p className="font-medium">
                        <span className={`px-2 py-1 text-xs rounded-full inline-block ${
                          callLog.outcome === 'promise' ? 'bg-green-100 text-green-800' :
                          callLog.outcome === 'contacted' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {callLog.outcome_display}
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Customer Attitude</p>
                      <p className="font-medium">{callLog.customer_attitude_display}</p>
                    </div>
                  </div>

                  {callLog.notes && (
                    <div>
                      <p className="text-sm text-gray-600">Notes</p>
                      <p className="mt-1 p-3 bg-gray-50 rounded-lg">{callLog.notes}</p>
                    </div>
                  )}

                  {callLog.follow_up_required && (
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <div className="flex items-center">
                        <Clock size={16} className="text-yellow-600 mr-2" />
                        <span className="font-medium">Follow-up Required</span>
                        {callLog.follow_up_date && (
                          <span className="ml-2 text-sm">
                            by {new Date(callLog.follow_up_date).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {callLog.installment_details && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Calendar size={16} className="text-blue-600 mr-2" />
                          <span className="font-medium">Installment #{callLog.installment_details.installment_id}</span>
                        </div>
                        <Link 
                          href={`/installments/${callLog.installment_details.id}`}
                          target="_blank"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          View Details
                        </Link>
                      </div>
                      <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                        <div>
                          <span className="text-gray-600">Balance:</span>
                          <p className="font-medium">KSh {callLog.installment_details.balance.toLocaleString()}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Due:</span>
                          <p className="font-medium">{new Date(callLog.installment_details.due_date).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Status:</span>
                          <p className={`font-medium ${callLog.installment_details.is_overdue ? 'text-red-600' : 'text-green-600'}`}>
                            {callLog.installment_details.is_overdue ? 'Overdue' : 'Current'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Reminders */}
          {callLog.payment_reminders.length > 0 && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Payment Reminders</h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {callLog.payment_reminders.map((reminder) => (
                    <div key={reminder.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">KSh {reminder.promised_amount}</p>
                          <p className="text-sm text-gray-600">
                            Promised: {new Date(reminder.promised_date).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          reminder.status === 'paid' ? 'bg-green-100 text-green-800' :
                          reminder.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {reminder.status}
                        </span>
                      </div>
                      <p className="text-sm mt-2">Method: {reminder.payment_method}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Officer Info & Actions */}
        <div className="space-y-6">
          {/* Officer Information */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Officer Information</h2>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-3 mb-4">
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <User size={24} className="text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">{callLog.officer_details.username}</p>
                  <p className="text-sm text-gray-600">
                    {callLog.officer_details.first_name} {callLog.officer_details.last_name}
                  </p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-gray-600">Created:</span>{' '}
                  {new Date(callLog.created_at).toLocaleString()}
                </p>
                <p>
                  <span className="text-gray-600">Last Updated:</span>{' '}
                  {new Date(callLog.updated_at).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Actions</h2>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Add Payment Reminder button – requires appropriate permission */}
              {canAddReminder && (
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={() => setIsReminderModalOpen(true)}
                >
                  <DollarSign size={16} className="mr-2" />
                  Add Payment Reminder
                </Button>
              )}
              
              <Link href={`/loans/${callLog?.loan_details?.loan_id}`} target="_blank">
                <Button variant="outline" className="w-full">
                  <PhoneCall size={16} className="mr-2" />
                  View Loan Details
                </Button>
              </Link>

              {callLog.installment_details && (
                <Link href={`/installments/${callLog.installment_details.id}`} target="_blank">
                  <Button variant="outline" className="w-full">
                    <Calendar size={16} className="mr-2" />
                    View Installment
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Collection Status */}
          {(callLog.previous_collection_status || callLog.new_collection_status) && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Collection Status</h2>
              </CardHeader>
              <CardContent>
                {callLog.previous_collection_status && (
                  <div className="mb-2">
                    <p className="text-sm text-gray-600">Previous</p>
                    <p className="font-medium">{callLog.previous_status_display}</p>
                  </div>
                )}
                {callLog.new_collection_status && (
                  <div>
                    <p className="text-sm text-gray-600">New</p>
                    <p className="font-medium text-green-600">{callLog.new_status_display}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Call Log"
        size="sm"
        isLoading={isSubmitting}
      >
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
            <Trash2 className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Call Log</h3>
          <p className="text-gray-600 mb-4">
            Are you sure you want to delete this call log? This action cannot be undone.
          </p>
          <div className="flex justify-center space-x-3">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Payment Reminder Modal */}
      <AddPaymentReminderModal
        isOpen={isReminderModalOpen}
        onClose={() => setIsReminderModalOpen(false)}
        onSubmit={handleAddPaymentReminder}
        loanDetails={callLog.loan_details}
        installmentDetails={callLog.installment_details}
      />
    </div>
  );
}