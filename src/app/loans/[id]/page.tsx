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
  Trash2, Eye, MessageCircle, Bell, Plus, FileWarning,
  Send, Printer, Loader2, X, AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import { usePermissions } from '@/context/permission-context';
import InstallmentBreakdownTable from '@/components/loans/InstallmentTable';
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
  cumulative_balance: number;
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

interface DemandLetterData {
  success: boolean;
  message: string;
  document_id: string;
  verification_code: string;
  loan_id: string;
  reference: string;
  amount_due: number;
  customer_name: string;
  generated_at: string;
  pdf_url: string;
  preview_html: string;
  email_sent: boolean;
  edit_url: string;
  letter_data: {
    loan_id: string;
    reference: string;
    customer: {
      name: string;
      id_number: string;
      address_line1: string;
      address_line2: string;
      phone: string;
      email: string;
      store_name: string;
      city_name: string;
    };
    loan_info: {
      amount_due: number;
      principal_amount: number;
      loan_date: string;
      loan_term_months: number;
      monthly_installment: number;
      payment_due_day: string;
      first_payment_due_date: string;
      has_current_month: any;
      total_outstanding: number;
      total_paid: number;
      interest_rate: number;
    };
    assigned_officer: string;
    generated_at: string;
  };
}

export default function LoanDetailsPage() {
  const params = useParams();
  const loanId = params.id as string;
  const { hasAccess } = usePermissions();
  const router = useRouter();

  const [loanDetails, setLoanDetails] = useState<LoanDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'installments' | 'calls' | 'sms' | 'assignments'>('installments');
  const [isCreateCallModalOpen, setIsCreateCallModalOpen] = useState(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [callLogsData, setCallLogsData] = useState<CallLogsResponse | null>(null);
  const [selectedInstallment, setSelectedInstallment] = useState<Installment | null>(null);
  const [isSendSMSModalOpen, setIsSendSMSModalOpen] = useState(false);
  
  // Demand letter states
  const [isDemandLetterModalOpen, setIsDemandLetterModalOpen] = useState(false);
  const [isEditDemandLetterModalOpen, setIsEditDemandLetterModalOpen] = useState(false);
  const [demandLetterData, setDemandLetterData] = useState<DemandLetterData | null>(null);
  const [isGeneratingDemandLetter, setIsGeneratingDemandLetter] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [editFormData, setEditFormData] = useState({
    customer_name: '',
    id_number: '',
    address_line1: '',
    address_line2: '',
    phone: '',
    email: '',
    amount_due: 0,
    reference: ''
  });

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
    try {
      const client = apiClient.getClient();
      const response = await client.get(`/call-logs/for_loan/?loan_id=${loanDetails.main_loan.loan_id}`);
      setCallLogsData(response.data);
    } catch (error) {
      console.error('Error fetching call logs for loan:', error);
    }
  };

  const handleViewInstallment = (installmentId: number) => {
    const installment = loanDetails?.installments.find(inst => inst.installment_id === installmentId);
    if (installment?.id) {
      router.push(`/installments/${installment.id}`);
    }
  };

  const handleViewCallLog = (callId: string) => {
    if (hasAccess('view_calllog')) {
      router.push(`/call_logs/${callId}`);
    }
  };

  const handleLogCall = () => {
    setIsCreateCallModalOpen(true);
  };

  const handleCallLogSuccess = () => {
    fetchLoanDetails();
    if (activeTab === 'calls') {
      fetchCallLogsForLoan();
    }
  };

  const handleSMSSent = () => {
    fetchLoanDetails();
  };

  // Demand Letter Handlers
  const handleGenerateDemandLetter = async (sendEmail: boolean = false) => {
    setIsGeneratingDemandLetter(true);
    setShowDropdown(false);
    try {
      const client = apiClient.getClient();
      const response = await client.post('/loan-processor/generate-demand-letter/', {
        loan_id: loanId,
        preview: false,
        send_email: sendEmail
      });
      
      setDemandLetterData(response.data);
      setIsDemandLetterModalOpen(true);
      
      if (sendEmail && response.data.email_sent) {
        alert('Demand letter generated and sent to customer email!');
      } else if (sendEmail && !response.data.email_sent) {
        alert('Demand letter generated but email could not be sent. Customer may not have an email address.');
      }
    } catch (error: any) {
      console.error('Error generating demand letter:', error);
      alert(error.response?.data?.error || 'Failed to generate demand letter');
    } finally {
      setIsGeneratingDemandLetter(false);
    }
  };

  const handlePreviewDemandLetter = async () => {
    setIsGeneratingDemandLetter(true);
    setShowDropdown(false);
    try {
      const client = apiClient.getClient();
      const response = await client.post('/loan-processor/preview-demand-letter/', {
        loan_id: loanId
      });
      
      // Open preview in new window with the HTML
      const previewWindow = window.open();
      if (previewWindow) {
        previewWindow.document.write(response.data.preview_html);
        previewWindow.document.close();
      }
    } catch (error: any) {
      console.error('Error previewing demand letter:', error);
      alert(error.response?.data?.error || 'Failed to preview demand letter');
    } finally {
      setIsGeneratingDemandLetter(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!demandLetterData?.document_id) {
      alert('Document ID not available. Please regenerate the demand letter.');
      return;
    }

    setIsDownloadingPDF(true);
    setShowDropdown(false);
    
    try {
      const client = apiClient.getClient();
      const pdfUrl = `/loan-processor/serve-pdf/${loanId}/${demandLetterData.document_id}/`;
      
      console.log('Downloading PDF from:', pdfUrl);
      
      const response = await client.get(pdfUrl, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `demand_letter_${demandLetterData.reference || 'document'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error: any) {
      console.error('Error downloading PDF:', error);
      
      if (error.response?.status === 401) {
        alert('Authentication failed. Please log in again.');
      } else if (error.response?.status === 404) {
        alert('Document not found. Please regenerate the demand letter.');
      } else if (error.response?.data instanceof Blob) {
        const text = await error.response.data.text();
        try {
          const errorData = JSON.parse(text);
          alert(errorData.error || 'Failed to download PDF');
        } catch {
          alert('Failed to download PDF. Please try again.');
        }
      } else {
        alert(error.response?.data?.error || 'Failed to download PDF. Please try again.');
      }
    } finally {
      setIsDownloadingPDF(false);
    }
  };

const handleEditDemandLetter = async () => {
  // Validate required fields
  if (!editFormData.customer_name) {
    alert('Customer name is required');
    return;
  }
  if (!editFormData.phone) {
    alert('Phone number is required');
    return;
  }
  
  setIsGeneratingDemandLetter(true);
  try {
    const client = apiClient.getClient();
    const response = await client.post(`/loan-processor/edit-demand-letter/${loanId}/`, editFormData);
    
    // Update the demand letter data with the new regenerated version
    setDemandLetterData({
      ...demandLetterData!,
      preview_html: response.data.preview_html,
      document_id: response.data.document_id,
      verification_code: response.data.verification_code,
      pdf_url: response.data.pdf_url,
      letter_data: response.data.letter_data,
      amount_due: response.data.amount_due,
      reference: response.data.reference,
      customer_name: response.data.customer_name,
      generated_at: response.data.generated_at,
      message: response.data.message
    });
    
    // Show appropriate message based on email change
    if (response.data.email_changed) {
      alert(
        `✅ Demand letter updated and regenerated successfully!\n\n` +
        `📧 Email address was changed from ${response.data.old_email || 'Not set'} to ${response.data.new_email || 'Not set'}.\n\n` +
        `⚠️ Future emails will be sent to the new address only. The old email will NOT receive any copies.`
      );
    } else {
      alert('✅ Demand letter updated and regenerated successfully! A new document has been created.');
    }
    
    setIsEditDemandLetterModalOpen(false);
    
  } catch (error: any) {
    console.error('Error editing demand letter:', error);
    const errorMessage = error.response?.data?.error || 'Failed to edit demand letter';
    alert(`❌ Error: ${errorMessage}`);
  } finally {
    setIsGeneratingDemandLetter(false);
  }
};

// Update the send email handler to use the current email from letter_data
const handleSendDemandLetterEmail = async () => {
  setIsSendingEmail(true);
  try {
    const client = apiClient.getClient();
    const response = await client.post('/loan-processor/send-demand-letter-email/', {
      loan_id: loanId,
      cc: []
    });
    
    if (response.data.success) {
      alert(`Demand letter sent successfully to ${response.data.recipient}!`);
    } else {
      alert('Failed to send email. Please check email address.');
    }
  } catch (error: any) {
    console.error('Error sending demand letter email:', error);
    if (error.response?.data?.error?.includes('No email address')) {
      alert('No email address available. Please edit the demand letter to add an email address first.');
    } else {
      alert(error.response?.data?.error || 'Failed to send email');
    }
  } finally {
    setIsSendingEmail(false);
  }
};
  const openEditModal = () => {
    if (demandLetterData) {
      setEditFormData({
        customer_name: demandLetterData.letter_data.customer.name,
        id_number: demandLetterData.letter_data.customer.id_number,
        address_line1: demandLetterData.letter_data.customer.address_line1,
        address_line2: demandLetterData.letter_data.customer.address_line2,
        phone: demandLetterData.letter_data.customer.phone,
        email: demandLetterData.letter_data.customer.email,
        amount_due: demandLetterData.letter_data.loan_info.amount_due,
        reference: demandLetterData.letter_data.reference
      });
      setIsEditDemandLetterModalOpen(true);
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
          <Link href="/loans">
            <Button variant="ghost" size="sm">
              <ArrowLeft size={16} className="mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Loan Details</h1>
            <p className="text-gray-600">Loan ID: {main_loan.loan_id}</p>
          </div>
        </div>
        <div className="flex space-x-3">
          {/* Demand Letter Button with Dropdown */}
          {hasAccess('can_generate_demand_letter') && (
            <div className="relative">
              <div className="flex">
                <Button 
                  className="bg-red-600 hover:bg-red-700 rounded-r-none"
                  onClick={() => handleGenerateDemandLetter(false)}
                  disabled={isGeneratingDemandLetter}
                >
                  {isGeneratingDemandLetter ? (
                    <Loader2 size={16} className="mr-2 animate-spin" />
                  ) : (
                    <FileWarning size={16} className="mr-2" />
                  )}
                  Demand Letter
                </Button>
                
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="px-2 bg-red-700 rounded-r-md hover:bg-red-800 focus:outline-none"
                  disabled={isGeneratingDemandLetter}
                >
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              
              {/* Dropdown menu */}
              {showDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowDropdown(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-20 border">
                    <div className="py-1">
                      <button
                        onClick={handlePreviewDemandLetter}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Eye size={14} className="inline mr-2" />
                        Preview Only
                      </button>
                      <button
                        onClick={() => handleGenerateDemandLetter(true)}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Send size={14} className="inline mr-2" />
                        Generate & Send Email
                      </button>
                      {demandLetterData && (
                        <>
                          <hr className="my-1" />
                          <button
                            onClick={openEditModal}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <Edit size={14} className="inline mr-2" />
                            Edit & Regenerate
                          </button>
                          <button
                            onClick={handleDownloadPDF}
                            disabled={isDownloadingPDF}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isDownloadingPDF ? (
                              <Loader2 size={14} className="inline mr-2 animate-spin" />
                            ) : (
                              <Download size={14} className="inline mr-2" />
                            )}
                            Download PDF
                          </button>
                          <button
                            onClick={handleSendDemandLetterEmail}
                            disabled={isSendingEmail}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            {isSendingEmail ? (
                              <Loader2 size={14} className="inline mr-2 animate-spin" />
                            ) : (
                              <Mail size={14} className="inline mr-2" />
                            )}
                            Resend Email
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Export button */}
          {hasAccess('can_export_loans') && (
            <Button variant="outline" onClick={() => window.print()}>
              <Download size={16} className="mr-2" />
              Export
            </Button>
          )}

          {/* Log Call button */}
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
           <InstallmentBreakdownTable
  installments={installments}
  onViewDetails={handleViewInstallment}
  currentMonthInstallmentId={current_month_installment?.installment_id}
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

      {/* Modals */}
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

      {/* Demand Letter Modal */}
      {isDemandLetterModalOpen && demandLetterData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-semibold">
                Demand Letter - {demandLetterData.reference}
              </h2>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={openEditModal}>
                  <Edit size={16} className="mr-2" />
                  Edit & Regenerate
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleDownloadPDF}
                  disabled={isDownloadingPDF}
                >
                  {isDownloadingPDF ? (
                    <Loader2 size={16} className="mr-2 animate-spin" />
                  ) : (
                    <Download size={16} className="mr-2" />
                  )}
                  Download PDF
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleSendDemandLetterEmail}
                  disabled={isSendingEmail}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSendingEmail ? (
                    <Loader2 size={16} className="mr-2 animate-spin" />
                  ) : (
                    <Mail size={16} className="mr-2" />
                  )}
                  Send Email
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setIsDemandLetterModalOpen(false)}>
                  <X size={16} />
                </Button>
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-auto p-4">
              {/* Letter info summary */}
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Document ID</p>
                    <p className="text-sm font-mono">{demandLetterData.document_id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Verification Code</p>
                    <p className="text-sm font-mono">{demandLetterData.verification_code}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Amount Due</p>
                    <p className="text-sm font-bold text-red-600">
                      KES {demandLetterData.amount_due.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Generated</p>
                    <p className="text-sm">
                      {new Date(demandLetterData.generated_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Letter preview */}
              {demandLetterData.preview_html ? (
                <div 
                  className="border rounded-lg p-4 bg-white overflow-auto max-h-[500px]"
                  dangerouslySetInnerHTML={{ __html: demandLetterData.preview_html }}
                />
              ) : (
                <div className="text-center py-12">
                  <Loader2 size={32} className="mx-auto animate-spin text-gray-400" />
                  <p className="mt-2 text-gray-500">Loading preview...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Demand Letter Modal - With Regenerate Warning */}
   {/* Edit Demand Letter Modal - Full Updated Version */}
{isEditDemandLetterModalOpen && demandLetterData && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="text-xl font-semibold">Edit & Regenerate Demand Letter</h2>
        <Button variant="ghost" size="sm" onClick={() => setIsEditDemandLetterModalOpen(false)}>
          <X size={16} />
        </Button>
      </div>
      
      {/* Warning Banner - Regeneration Notice */}
      <div className="bg-yellow-50 p-4 border-b border-yellow-200">
        <div className="flex items-start">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium mb-1">⚠️ Important: This will regenerate the document</p>
            <p>When you save changes, a <strong>new demand letter</strong> will be generated with a new document ID and verification code. The old version will be replaced. Make sure to download or email the new version.</p>
          </div>
        </div>
      </div>
      
      {/* Form Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Customer Name & ID Number */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={editFormData.customer_name}
              onChange={(e) => setEditFormData({...editFormData, customer_name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ID Number
            </label>
            <input
              type="text"
              value={editFormData.id_number}
              onChange={(e) => setEditFormData({...editFormData, id_number: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 30123768"
            />
          </div>
        </div>

        {/* Address Line 1 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Address Line 1
          </label>
          <input
            type="text"
            value={editFormData.address_line1}
            onChange={(e) => setEditFormData({...editFormData, address_line1: e.target.value})}
            placeholder="P.O BOX 35 - 60402"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Address Line 2 (City) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Address Line 2 (City)
          </label>
          <input
            type="text"
            value={editFormData.address_line2}
            onChange={(e) => setEditFormData({...editFormData, address_line2: e.target.value})}
            placeholder="IGOJI"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Phone & Email */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={editFormData.phone}
              onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Primary contact number</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={editFormData.email}
              onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                editFormData.email !== demandLetterData?.letter_data.customer.email 
                  ? 'border-yellow-500 bg-yellow-50' 
                  : 'border-gray-300'
              }`}
              placeholder="customer@example.com"
            />
            {/* Email change warning */}
            {editFormData.email !== demandLetterData?.letter_data.customer.email && (
              <div className="flex items-start mt-1">
                <AlertTriangle size={12} className="text-yellow-600 mr-1 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-yellow-600">
                  Email changed from <strong>{demandLetterData?.letter_data.customer.email || 'Not set'}</strong> to <strong>{editFormData.email || 'Not set'}</strong>. Future emails will be sent to the new address only.
                </p>
              </div>
            )}
            {/* No email warning */}
            {!editFormData.email && (
              <div className="flex items-start mt-1">
                <AlertTriangle size={12} className="text-red-600 mr-1 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-600">
                  No email address provided. You won't be able to send the demand letter via email until you add an email address.
                </p>
              </div>
            )}
            {/* Email unchanged info */}
            {editFormData.email === demandLetterData?.letter_data.customer.email && editFormData.email && (
              <p className="text-xs text-green-600 mt-1">
                ✓ Email unchanged. Current email: {editFormData.email}
              </p>
            )}
          </div>
        </div>

        {/* Amount Due & Reference */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount Due (KES) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={editFormData.amount_due}
              onChange={(e) => setEditFormData({...editFormData, amount_due: parseFloat(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">This will update the amount due in the letter</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reference Number
            </label>
            <input
              type="text"
              value={editFormData.reference}
              onChange={(e) => setEditFormData({...editFormData, reference: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., CHB-KTG-057"
            />
            <p className="text-xs text-gray-500 mt-1">This is the loan offer ID from the system</p>
          </div>
        </div>

        {/* Changes Summary */}
        {(editFormData.customer_name !== demandLetterData?.letter_data.customer.name ||
          editFormData.id_number !== demandLetterData?.letter_data.customer.id_number ||
          editFormData.address_line1 !== demandLetterData?.letter_data.customer.address_line1 ||
          editFormData.address_line2 !== demandLetterData?.letter_data.customer.address_line2 ||
          editFormData.phone !== demandLetterData?.letter_data.customer.phone ||
          editFormData.email !== demandLetterData?.letter_data.customer.email ||
          editFormData.amount_due !== demandLetterData?.letter_data.loan_info.amount_due ||
          editFormData.reference !== demandLetterData?.letter_data.reference) && (
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm font-medium text-blue-800 mb-2">📝 Changes to be applied:</p>
            <ul className="text-xs text-blue-700 space-y-1">
              {editFormData.customer_name !== demandLetterData?.letter_data.customer.name && (
                <li>• Customer name: "{demandLetterData?.letter_data.customer.name}" → "{editFormData.customer_name}"</li>
              )}
              {editFormData.id_number !== demandLetterData?.letter_data.customer.id_number && (
                <li>• ID number: "{demandLetterData?.letter_data.customer.id_number || 'Not set'}" → "{editFormData.id_number || 'Not set'}"</li>
              )}
              {editFormData.address_line1 !== demandLetterData?.letter_data.customer.address_line1 && (
                <li>• Address line 1: "{demandLetterData?.letter_data.customer.address_line1 || 'Not set'}" → "{editFormData.address_line1 || 'Not set'}"</li>
              )}
              {editFormData.address_line2 !== demandLetterData?.letter_data.customer.address_line2 && (
                <li>• City: "{demandLetterData?.letter_data.customer.address_line2 || 'Not set'}" → "{editFormData.address_line2 || 'Not set'}"</li>
              )}
              {editFormData.phone !== demandLetterData?.letter_data.customer.phone && (
                <li>• Phone: "{demandLetterData?.letter_data.customer.phone}" → "{editFormData.phone}"</li>
              )}
              {editFormData.email !== demandLetterData?.letter_data.customer.email && (
                <li>• Email: "{demandLetterData?.letter_data.customer.email || 'Not set'}" → "{editFormData.email || 'Not set'}"</li>
              )}
              {editFormData.amount_due !== demandLetterData?.letter_data.loan_info.amount_due && (
                <li>• Amount due: KES {demandLetterData?.letter_data.loan_info.amount_due.toLocaleString()} → KES {editFormData.amount_due.toLocaleString()}</li>
              )}
              {editFormData.reference !== demandLetterData?.letter_data.reference && (
                <li>• Reference: "{demandLetterData?.letter_data.reference}" → "{editFormData.reference}"</li>
              )}
            </ul>
          </div>
        )}

        {/* Information Note */}
        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="text-sm text-gray-600">
            <strong>ℹ️ Note:</strong> Loan information like principal amount, loan date, 
            and installment details cannot be edited here. Please contact admin if 
            corrections are needed.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end space-x-3 p-4 border-t">
        <Button 
          variant="outline" 
          onClick={() => {
            // Reset form to original values
            if (demandLetterData) {
              setEditFormData({
                customer_name: demandLetterData.letter_data.customer.name,
                id_number: demandLetterData.letter_data.customer.id_number,
                address_line1: demandLetterData.letter_data.customer.address_line1,
                address_line2: demandLetterData.letter_data.customer.address_line2,
                phone: demandLetterData.letter_data.customer.phone,
                email: demandLetterData.letter_data.customer.email,
                amount_due: demandLetterData.letter_data.loan_info.amount_due,
                reference: demandLetterData.letter_data.reference
              });
            }
            setIsEditDemandLetterModalOpen(false);
          }}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleEditDemandLetter} 
          disabled={isGeneratingDemandLetter || !editFormData.customer_name || !editFormData.phone}
          className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGeneratingDemandLetter ? (
            <>
              <Loader2 size={16} className="mr-2 animate-spin" />
              Regenerating...
            </>
          ) : (
            <>
              <FileWarning size={16} className="mr-2" />
              Save & Regenerate
            </>
          )}
        </Button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}