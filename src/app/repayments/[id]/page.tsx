// app/payments/[id]/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api';
import { 
  ArrowLeft, CreditCard, Calendar, Clock, DollarSign,
  User, Phone, Hash, FileText, Download, Edit,
  CheckCircle, XCircle, AlertCircle, Printer,
  Share2, Link as LinkIcon, Copy, ExternalLink
} from 'lucide-react';
import Link from 'next/link';

interface PaymentDetail {
  id: string;
  repayment_id: string;
  loan_id: string;
  payment_id: string;
  customer_name: string;
  phone_numbers: string[];
  registration_numbers: string[];
  amount_received: number;
  amount_posted: number;
  amount_remained: number;
  net_payment: number;
  transaction_date: string;
  posted_date: string | null;
  created_date: string | null;
  payment_type: string;
  payment_type_display: string;
  is_recorded: number;
  is_discount: boolean;
  is_early_repay: boolean;
  is_pre_payment: boolean;
  status: number;
  status_display: string;
  transaction_type: number;
  transaction_type_display: string;
  transaction_type_code: string;
  extra_reason: string;
  transaction_files: string;
  user_name: string;
  user_id: string;
  case_prefix: string;
  case_id: number;
  discount_tracking_amount: number;
  discount_maintenance_amount: number;
  discount_interest_amount: number;
  discount_penalty_amount: number;
  discount_other_amount: number;
  payment_success_rate: number;
  formatted_amount: string;
  formatted_date: string;
  first_seen_at: string;
  last_updated_at: string;
  sync_date: string;
  raw_records_preview: {
    count: number;
    preview: any;
  } | null;
  main_loan_details: {
    id: string;
    loan_id: string;
    customer_name: string;
    phone_number: string;
    total_outstanding: number;
    current_assigned_officer: string | null;
  } | null;
  repayment_summary: {
    payment_efficiency: number;
    amount_received: number;
    amount_posted: number;
    difference: number;
    is_fully_posted: boolean;
  };
}

export default function PaymentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [payment, setPayment] = useState<PaymentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchPaymentDetail();
    }
  }, [params.id]);

  const fetchPaymentDetail = async () => {
    setIsLoading(true);
    try {
      const client = apiClient.getClient();
      const response = await client.get(`/repayments/${params.id}/`);
      setPayment(response.data);
    } catch (error) {
      console.error('Error fetching payment detail:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyId = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatCurrency = (value: number) => {
    return `KES ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusIcon = (status: number) => {
    switch (status) {
      case 1: return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 2: return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 0: return <Clock className="h-5 w-5 text-gray-500" />;
      case 3: return <XCircle className="h-5 w-5 text-red-500" />;
      default: return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getPaymentTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      'reconciled': 'bg-green-100 text-green-800',
      'pre_payment': 'bg-yellow-100 text-yellow-800',
      'discount': 'bg-purple-100 text-purple-800',
      'mixed': 'bg-blue-100 text-blue-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">Loading payment details...</div>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-red-600">Payment not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Payment Details</h1>
            <p className="text-gray-600 mt-1">Transaction ID: {payment.repayment_id}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer size={18} className="mr-2" />
            Print
          </Button>
          <Button variant="outline">
            <Share2 size={18} className="mr-2" />
            Share
          </Button>
        </div>
      </div>

      {/* Status Banner */}
      <div className={`p-4 rounded-lg flex items-center justify-between ${
        payment.status === 1 ? 'bg-green-50' :
        payment.status === 2 ? 'bg-yellow-50' :
        payment.status === 3 ? 'bg-red-50' :
        'bg-gray-50'
      }`}>
        <div className="flex items-center space-x-3">
          {getStatusIcon(payment.status)}
          <div>
            <p className="font-medium">
              Status: {payment.status_display}
            </p>
            <p className="text-sm text-gray-600">
              {payment.status === 1 ? 'Payment completed successfully' :
               payment.status === 2 ? 'Partial payment recorded' :
               payment.status === 3 ? 'Payment failed' :
               'Payment pending processing'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">Payment Type</p>
          <span className={`px-3 py-1 text-sm rounded-full ${getPaymentTypeBadge(payment.payment_type)}`}>
            {payment.payment_type_display}
          </span>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - Payment Details */}
        <div className="col-span-2 space-y-6">
          {/* Amount Card */}
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">Amount Details</h2>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Amount Posted</p>
                  <p className="text-3xl font-bold text-green-600">{formatCurrency(payment.amount_posted)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Amount Received</p>
                  <p className="text-2xl font-semibold">{formatCurrency(payment.amount_received)}</p>
                </div>
                {payment.amount_remained > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Remaining Amount</p>
                    <p className="text-xl font-semibold text-yellow-600">{formatCurrency(payment.amount_remained)}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600 mb-1">Net Payment</p>
                  <p className="text-xl font-semibold">{formatCurrency(payment.net_payment)}</p>
                </div>
              </div>
              
              {payment.repayment_summary && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Payment Efficiency</span>
                    <span className="font-medium">{payment.repayment_summary.payment_efficiency.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className={`h-2 rounded-full ${
                        payment.repayment_summary.payment_efficiency >= 90 ? 'bg-green-600' :
                        payment.repayment_summary.payment_efficiency >= 50 ? 'bg-yellow-600' :
                        'bg-red-600'
                      }`}
                      style={{ width: `${Math.min(payment.repayment_summary.payment_efficiency, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transaction Details */}
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">Transaction Details</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Transaction Date</p>
                    <p className="font-medium">{formatDateTime(payment.transaction_date)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Posted Date</p>
                    <p className="font-medium">{payment.posted_date ? formatDateTime(payment.posted_date) : 'N/A'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Transaction Type</p>
                    <p className="font-medium">{payment.transaction_type_display}</p>
                    <p className="text-xs text-gray-500">{payment.transaction_type_code}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Payment Method</p>
                    <p className="font-medium">{payment.transaction_type_display}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Payment ID</p>
                    <div className="flex items-center space-x-2">
                      <p className="font-mono text-sm">{payment.payment_id || 'N/A'}</p>
                      {payment.payment_id && (
                        <button
                          onClick={() => handleCopyId(payment.payment_id)}
                          className="text-gray-400 hover:text-gray-600"
                          title="Copy Payment ID"
                        >
                          <Copy size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Repayment ID</p>
                    <div className="flex items-center space-x-2">
                      <p className="font-mono text-sm">{payment.repayment_id}</p>
                      <button
                        onClick={() => handleCopyId(payment.repayment_id)}
                        className="text-gray-400 hover:text-gray-600"
                        title="Copy Repayment ID"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {payment.extra_reason && (
                  <div>
                    <p className="text-sm text-gray-600">Extra Reason</p>
                    <p className="text-sm bg-gray-50 p-3 rounded mt-1">{payment.extra_reason}</p>
                  </div>
                )}

                {payment.transaction_files && (
                  <div>
                    <p className="text-sm text-gray-600">Transaction Files</p>
                    <a 
                      href={payment.transaction_files}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm flex items-center mt-1"
                    >
                      <FileText size={16} className="mr-2" />
                      View Attachment
                      <ExternalLink size={14} className="ml-1" />
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Discount Details (if applicable) */}
          {payment.is_discount && (
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold">Discount Breakdown</h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tracking Amount</span>
                    <span className="font-medium">{formatCurrency(payment.discount_tracking_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Maintenance Amount</span>
                    <span className="font-medium">{formatCurrency(payment.discount_maintenance_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Interest Amount</span>
                    <span className="font-medium">{formatCurrency(payment.discount_interest_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Penalty Amount</span>
                    <span className="font-medium">{formatCurrency(payment.discount_penalty_amount)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-200">
                    <span className="font-medium">Total Discount</span>
                    <span className="font-bold text-purple-600">{formatCurrency(payment.net_payment)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Customer & Loan Info */}
        <div className="space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">Customer Information</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="font-medium flex items-center">
                    <User size={16} className="mr-2 text-gray-400" />
                    {payment.customer_name || 'N/A'}
                  </p>
                </div>

                {payment.phone_numbers && payment.phone_numbers.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600">Phone Numbers</p>
                    {payment.phone_numbers.map((phone, index) => (
                      <p key={index} className="font-medium flex items-center">
                        <Phone size={16} className="mr-2 text-gray-400" />
                        {phone}
                      </p>
                    ))}
                  </div>
                )}

                {payment.registration_numbers && payment.registration_numbers.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600">Registration Numbers</p>
                    {payment.registration_numbers.map((reg, index) => (
                      <p key={index} className="font-mono text-sm">
                        {reg}
                      </p>
                    ))}
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">Case Info</p>
                  <p className="font-medium">{payment.case_prefix || 'N/A'} - {payment.case_id}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Loan Information */}
          {payment.main_loan_details ? (
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold">Associated Loan</h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Loan ID</p>
                    <Link 
                      href={`/loans/${payment.main_loan_details.loan_id}`}
                      className="text-blue-600 hover:text-blue-800 font-medium flex items-center"
                    >
                      {payment.main_loan_details.loan_id}
                      <ExternalLink size={14} className="ml-1" />
                    </Link>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Outstanding Balance</p>
                    <p className="font-medium text-orange-600">
                      {formatCurrency(payment.main_loan_details.total_outstanding)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Assigned Officer</p>
                    <p className="font-medium">{payment.main_loan_details.current_assigned_officer || 'Unassigned'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-gray-500 text-center">No linked loan found</p>
              </CardContent>
            </Card>
          )}

          {/* Timestamps */}
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">Timeline</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500">First Seen</p>
                  <p className="text-sm">{formatDateTime(payment.first_seen_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Last Updated</p>
                  <p className="text-sm">{formatDateTime(payment.last_updated_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Synced</p>
                  <p className="text-sm">{formatDateTime(payment.sync_date)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Raw Records (if any) */}
          {payment.raw_records_preview && payment.raw_records_preview.count > 0 && (
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold">Raw Records</h2>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-2">
                  {payment.raw_records_preview.count} raw record(s) available
                </p>
                <Button variant="outline" size="sm" className="w-full">
                  <FileText size={16} className="mr-2" />
                  View Raw Data
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}