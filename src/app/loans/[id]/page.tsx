// app/loans/[id]/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api';
import { 
  ArrowLeft, Phone, Mail, Calendar, DollarSign, 
  Clock, AlertCircle, CheckCircle, User, Building,
  FileText, MessageSquare, PhoneCall, Download, Edit,
  Trash2, Eye, MessageCircle, Bell, Plus
} from 'lucide-react';
import Link from 'next/link';
import { usePermissions } from '@/context/permission-context'; // <-- ADDED
import InstallmentTable from '@/components/loans/InstallmentTable';
import CreateCallLogModal from '@/components/call_logs/CreateCallLogModal';
import AddPaymentReminderModal from '@/components/call_logs/AddPaymentReminderModal';
import SendSMSModal from '@/components/loans/SendSMSModal';

export interface LoanDetails {
  main_loan: {
    id: string;
    loan_id: string;
    customer_name: string;
    phone_number: string;
    total_amount: number;
    total_paid: number;
    apply_amount: number;
    total_outstanding: number;
    status: number;
    status_text: string;
    due_date: string;
    is_overdue: boolean;
    current_assigned_officer: number | null;
    this_month_active_installment: number;
    created_at: string;
    last_sync_at: string;
  };
  installments: Installment[];
  assignments: any[];
  sms_logs: {
    total_count: number;
    recent_logs: SMSLog[];
  };
  call_logs: {
    total_count: number;
    recent_logs: CallLog[];
  };
  installment_count: number;
  total_installments: number;
  outstanding_installments: number;
  current_month_installment: CurrentMonthInstallment | null;
}

interface Installment {
  id: string;
  installment_id: number;
  plan_type: string;
  total_amount: number;
  repaid: number;
  balance: number;
  due_date: string;
  status: number;
  is_overdue: boolean;
  days_until_due: number;
  is_current_month: boolean;
  paid_off: boolean;
  cumulative_balance : number;
}

interface SMSLog {
  id: string;
  phone_number: string;
  message: string;
  status: string;
  sent_at: string;
  created_at: string;
  error_message?: string;
  template__template_name?: string;
  campaign__campaign_name?: string;
}

interface CallLog {
  id: string;
  call_time: string;
  duration_seconds: number;
  outcome: string;
  outcome_display: string;
  notes?: string;
  officer_name: string;
  follow_up_required: boolean;
  follow_up_date: string | null;
  created_at: string;
}

interface CurrentMonthInstallment {
  has_active: boolean;
  installment_id: number;
  plan_type: string;
  due_date: string;
  total_amount: number;
  repaid: number;
  balance: number;
  is_overdue: boolean;
  days_until_due: number;
  assigned_officer: number | null;
  paid_off: boolean;
  cumulative_balance: number;
  id?: string;
}

interface CallLogsResponse {
  loan_id: string;
  customer_name: string;
  total_calls: number;
  calls: CallLog[];
}

export default function LoanDetailsPage() {
  const params = useParams();
  const loanId = params.id as string;
  const { hasAccess } = usePermissions(); // <-- ADDED
  const router = useRouter()

  const [loanDetails, setLoanDetails] = useState<LoanDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'installments' | 'calls' | 'sms' | 'assignments'>('installments');
  const [isCreateCallModalOpen, setIsCreateCallModalOpen] = useState(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [callLogsData, setCallLogsData] = useState<CallLogsResponse | null>(null);
  const [selectedInstallment, setSelectedInstallment] = useState<Installment | null>(null);

  // Add state
const [isSendSMSModalOpen, setIsSendSMSModalOpen] = useState(false);

// Add function to refresh SMS logs after sending
const handleSMSSent = () => {
  fetchLoanDetails(); // refresh all data (SMS logs included)
};

  useEffect(() => {
    if (loanId) {
      fetchLoanDetails();
    }
  }, [loanId]);

  useEffect(() => {
    if (loanDetails && activeTab === 'calls') {
      fetchCallLogsForLoan();
    }
  }, [loanDetails, activeTab]);

  const fetchLoanDetails = async () => {
    setIsLoading(true);
    try {
      const client = apiClient.getClient();
      const response = await client.get(`/loan-processor/loan-details/${loanId}/`);
      setLoanDetails(response.data);
    } catch (error) {
      console.error('Error fetching loan details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCallLogsForLoan = async () => {
    if (!loanDetails?.main_loan.loan_id) return;
    console.log('Fetching call logs for loan:', loanDetails.main_loan.loan_id);
    try {
      const client = apiClient.getClient();
      const response = await client.get(`/call-logs/for_loan/?loan_id=${loanDetails.main_loan.loan_id}`);
      setCallLogsData(response.data);
    } catch (error) {
      console.error('Error fetching call logs for loan:', error);
    }
  };

  const handleViewInstallment = (installmentId: number) => {
    // Find the installment by installment_id to get its UUID
    const installment = loanDetails?.installments.find(inst => inst.installment_id === installmentId);
    if (installment?.id) {
      router.push(`/installments/${installment.id}`);
    }
  };

  const handleViewCallLog = (callId: string) => {
    // Open call log detail page – requires view permission (optional guard)
    if (hasAccess('view_calllog')) {
      router.push(`/call_logs/${callId}`);
    }
  };

  const handleLogCall = () => {
    setIsCreateCallModalOpen(true);
  };

  const handleAddPaymentReminder = (installment?: Installment) => {
    setSelectedInstallment(installment || null);
    setIsReminderModalOpen(true);
  };

  const handleCallLogSuccess = () => {
    fetchLoanDetails();
    if (activeTab === 'calls') {
      fetchCallLogsForLoan();
    }
  };


  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case 'promise':
      case 'full':
        return 'bg-green-100 text-green-800';
      case 'partial':
        return 'bg-blue-100 text-blue-800';
      case 'contacted':
        return 'bg-purple-100 text-purple-800';
      case 'no_answer':
      case 'busy':
        return 'bg-gray-100 text-gray-800';
      case 'wrong_number':
      case 'disconnected':
      case 'switched_off':
        return 'bg-red-100 text-red-800';
      case 'callback':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg text-gray-600">Loading loan details...</div>
      </div>
    );
  }

  if (!loanDetails) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
        <h3 className="mt-2 text-lg font-medium text-gray-900">Loan not found</h3>
        <p className="mt-1 text-sm text-gray-500">The loan you're looking for doesn't exist or you don't have access.</p>
        <Link href="/loans">
          <Button className="mt-4">Back to Loans</Button>
        </Link>
      </div>
    );
  }

  const { main_loan, installments, sms_logs, assignments, current_month_installment } = loanDetails;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Loan Details</h1>
            <p className="text-gray-600">Loan ID: {main_loan.loan_id}</p>
          </div>
        </div>
        <div className="flex space-x-3">
          {/* Export button – requires can_export_loans */}
          {hasAccess('can_export_loans') && (
            <Button variant="outline" onClick={() => window.print()}>
              <Download size={16} className="mr-2" />
              Export
            </Button>
          )}

          {/* Log Call button – requires add_calllog */}
          {hasAccess('add_calllog') && (
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleLogCall}
            >
              <PhoneCall size={16} className="mr-2" />
              Log Call
            </Button>
          )}
        </div>
      </div>

      {/* Loan Summary Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="col-span-2">
              <p className="text-sm text-gray-600">Customer</p>
              <p className="text-lg font-semibold">{main_loan.customer_name}</p>
              <div className="flex items-center mt-1 text-sm">
                <Phone size={14} className="mr-1 text-gray-400" />
                <span>{main_loan.phone_number}</span>
              </div>
              {main_loan.current_assigned_officer && (
                <div className="flex items-center mt-1 text-sm">
                  <User size={14} className="mr-1 text-gray-400" />
                  <span>Assigned to Officer #{main_loan.current_assigned_officer}</span>
                </div>
              )}
            </div>
            
            <div>
              <p className="text-sm text-gray-600">Loan Amount</p>
              <p className="text-lg font-semibold">KSh {main_loan.apply_amount.toLocaleString()}</p>
              <p className="text-sm text-gray-500">
                Paid: KSh {main_loan.total_paid.toLocaleString()}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">Outstanding</p>
              <p className={`text-lg font-semibold ${main_loan.total_outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
                KSh {main_loan.total_outstanding.toLocaleString()}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">Due Date</p>
              <p className="text-lg font-semibold">
                {new Date(main_loan.due_date).toLocaleDateString()}
              </p>
              <div className="flex items-center mt-1">
                {main_loan.is_overdue ? (
                  <span className="text-xs text-red-600 flex items-center">
                    <AlertCircle size={12} className="mr-1" />
                    Overdue
                  </span>
                ) : (
                  <span className="text-xs text-green-600 flex items-center">
                    <CheckCircle size={12} className="mr-1" />
                    Current
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-4 flex flex-wrap gap-2">
              {hasAccess('add_smslog') && (
                <Button 
                  variant="outline"
                  onClick={() => setIsSendSMSModalOpen(true)}
                >
                  <MessageSquare size={16} className="mr-2" />
                  Send SMS
                </Button>
              )}
            {hasAccess('add_calllog') && (
              <Button size="sm" variant="outline" onClick={handleLogCall}>
                <PhoneCall size={14} className="mr-2" />
                Log Call
              </Button>
            )}
            {hasAccess('can_view_all_call_logs') && (
              <Link href={`/call_logs?loan_id=${main_loan.loan_id}`}>
                <Button size="sm" variant="outline">
                  <MessageCircle size={14} className="mr-2" />
                  View All Calls
                </Button>
              </Link>
            )}
          </div>

          {/* Current Month Installment Highlight */}
          {current_month_installment && current_month_installment.has_active && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 text-blue-600 mr-2" />
                  <span className="font-medium text-blue-900">Current Month Installment</span>
                </div>
                <div className="flex space-x-2">
                  {hasAccess('view_installment') && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewInstallment(current_month_installment.installment_id)}
                    >
                      View Details
                    </Button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-3">
                <div>
                  <p className="text-xs text-gray-600">Installment #{current_month_installment.installment_id}</p>
                  <p className="font-medium">Due: {new Date(current_month_installment.due_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Amount Due</p>
                  <p className="font-medium">KSh {current_month_installment.total_amount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Balance</p>
                  <p className="font-medium text-red-600">KSh {current_month_installment.balance.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Status</p>
                  <p className={`font-medium ${current_month_installment.is_overdue ? 'text-red-600' : 'text-green-600'}`}>
                    {current_month_installment.is_overdue ? 'Overdue' : 'Current'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('installments')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'installments'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Installments ({installments.length})
          </button>
          <button
            onClick={() => setActiveTab('calls')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'calls'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Call Logs ({callLogsData?.total_calls || 0})
          </button>
          <button
            onClick={() => setActiveTab('sms')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'sms'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            SMS Logs ({sms_logs.total_count})
          </button>
          <button
            onClick={() => setActiveTab('assignments')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'assignments'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Assignment History ({assignments.length})
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <Card>
        <CardContent className="pt-6">
          {activeTab === 'installments' && (
            <div>
              <h3 className="text-lg font-medium mb-4">Installment Schedule</h3>
              <InstallmentTable 
                installments={installments}
                onViewDetails={handleViewInstallment}
                // onAddReminder={handleAddPaymentReminder} – if you uncomment, guard inside table
              />
            </div>
          )}

          {activeTab === 'calls' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Call Logs</h3>
                <div className="flex space-x-2">
                  <Button size="sm" variant="outline" onClick={fetchCallLogsForLoan}>
                    <Clock size={14} className="mr-2" />
                    Refresh
                  </Button>
                  {hasAccess('add_calllog') && (
                    <Button size="sm" onClick={handleLogCall}>
                      <PhoneCall size={14} className="mr-2" />
                      Log New Call
                    </Button>
                  )}
                </div>
              </div>
              
              {(callLogsData?.calls.length || 0) === 0 ? (
                <div className="text-center py-12">
                  <PhoneCall className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No calls logged</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by logging your first call for this loan.</p>
                  {hasAccess('add_calllog') && (
                    <div className="mt-6">
                      <Button onClick={handleLogCall}>
                        <PhoneCall size={16} className="mr-2" />
                        Log Call
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {(callLogsData?.calls || []).map((call) => (
                    <div 
                      key={call.id} 
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleViewCallLog(call.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-sm font-medium text-gray-900">
                              {new Date(call.call_time).toLocaleString()}
                            </span>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${getOutcomeColor(call.outcome)}`}>
                              {call.outcome_display || call.outcome}
                            </span>
                            {call.follow_up_required && (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-800">
                                Follow-up {call.follow_up_date ? new Date(call.follow_up_date).toLocaleDateString() : 'Required'}
                              </span>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Officer:</span>
                              <p className="font-medium">{call.officer_name}</p>
                            </div>
                            <div>
                              <span className="text-gray-500">Duration:</span>
                              <p className="font-medium">{formatDuration(call.duration_seconds)}</p>
                            </div>
                            <div>
                              <span className="text-gray-500">Time:</span>
                              <p className="font-medium">{new Date(call.call_time).toLocaleTimeString()}</p>
                            </div>
                          </div>
                          
                          {call.notes && (
                            <p className="mt-2 text-sm text-gray-600 line-clamp-2">{call.notes}</p>
                          )}
                        </div>
                        {/* View button – requires view_calllog permission (optional) */}
                        {hasAccess('view_calllog') && (
                          <Button variant="ghost" size="sm" className="ml-4">
                            <Eye size={16} />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'sms' && (
            <div>
              <h3 className="text-lg font-medium mb-4">SMS Logs</h3>
              {sms_logs.recent_logs.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No SMS logs found</h3>
                  <p className="mt-1 text-sm text-gray-500">SMS messages sent to this customer will appear here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sms_logs.recent_logs.map((sms) => (
                    <div key={sms.id} className="border rounded-lg p-4">
                      <div className="flex justify-between mb-2">
                        <div>
                          <span className="text-sm font-medium">
                            {new Date(sms.sent_at).toLocaleString()}
                          </span>
                          {sms.template__template_name && (
                            <span className="ml-2 text-xs text-gray-500">
                              Template: {sms.template__template_name}
                            </span>
                          )}
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          sms.status === 'SUCCESS' ? 'bg-green-100 text-green-800' :
                          sms.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {sms.status}
                        </span>
                      </div>
                      <p className="text-sm bg-gray-50 p-3 rounded">{sms.message}</p>
                      {sms.error_message && (
                        <p className="text-xs text-red-600 mt-2">{sms.error_message}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'assignments' && (
            <div>
              <h3 className="text-lg font-medium mb-4">Assignment History</h3>
              {assignments.length === 0 ? (
                <div className="text-center py-12">
                  <User className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No assignment history</h3>
                  <p className="mt-1 text-sm text-gray-500">This loan has never been assigned to an officer.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {assignments.map((assignment, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between">
                        <div>
                          <p className="text-sm font-medium">Assigned To: {assignment.assigned_to__username}</p>
                          <p className="text-sm">Assigned By: {assignment.assigned_by__username}</p>
                          <p className="text-sm">Assigned At: {new Date(assignment.assigned_at).toLocaleString()}</p>
                          <p className="text-sm">Reason: {assignment.assignment_reason}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          assignment.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {assignment.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Call Log Modal */}
      <CreateCallLogModal
        isOpen={isCreateCallModalOpen}
        onClose={() => setIsCreateCallModalOpen(false)}
        onSuccess={handleCallLogSuccess}
        prefillLoanId={main_loan.id}
        prefillInstallmentId={current_month_installment?.id}
        fullLoanDetails={main_loan}
      />

      <SendSMSModal
        isOpen={isSendSMSModalOpen}
        onClose={() => setIsSendSMSModalOpen(false)}
        onSuccess={handleSMSSent}
        loanId={main_loan.loan_id}
        loanUuid={main_loan.id}
        customerName={main_loan.customer_name}
        phoneNumber={main_loan.phone_number}
        currentMonthInstallmentId={current_month_installment?.id}
      />
    </div>
  );
}