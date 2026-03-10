// app/installments/[id]/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api';
import { 
  ArrowLeft, Calendar, DollarSign, Clock, 
  AlertCircle, CheckCircle, User, FileText,
  TrendingUp, PieChart
} from 'lucide-react';

interface InstallmentDetail {
  id: string;
  installment_id: number;
  plan_id: string | null;
  plan_type: string;
  plan_type_display: string;
  main_loan: string;
  loan_id: string;
  customer_name: string;
  phone_number: string;
  total_amount: string;
  repaid: string;
  balance: string;
  cumulative_balance: string;
  due_date: string;
  start_date: string;
  actual_repay_date: string | null;
  days_until_due: number;
  days_until_due_display: string;
  is_overdue: boolean;
  is_current_month: boolean;
  paid_off: boolean;
  partially_paid: boolean;
  principal_due: string;
  principal_paid: string;
  interest_due: string;
  interest_paid: string;
  penalty_due: string;
  penalty_paid: string;
  assigned_officer: number | null;
  assigned_officer_details: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  status: number;
  status_text: string;
  is_active: boolean;
  payment_progress: {
    percentage: number;
    repaid: number;
    total: number;
    status: string;
  };
  created_at: string;
  updated_at: string;
}

export default function InstallmentDetailsPage() {
  const params = useParams();
  const router = useRouter()
  const installmentId = params.id as string;
  
  const [installment, setInstallment] = useState<InstallmentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (installmentId) {
      fetchInstallmentDetails();
    }
  }, [installmentId]);

  const fetchInstallmentDetails = async () => {
    setIsLoading(true);
    try {
      const client = apiClient.getClient();
      const response = await client.get(`/installments/${installmentId}/`);
      setInstallment(response.data);
    } catch (error) {
      console.error('Error fetching installment details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg text-gray-600">Loading installment details...</div>
      </div>
    );
  }

  if (!installment) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
        <h3 className="mt-2 text-lg font-medium text-gray-900">Installment not found</h3>
        <p className="mt-1 text-sm text-gray-500">The installment you're looking for doesn't exist.</p>
        <Link href="/loans">
          <Button className="mt-4">Back to Loans</Button>
        </Link>
      </div>
    );
  }

  const formatCurrency = (value: string) => {
    return `KSh ${parseFloat(value).toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* <Link href={`/loans/${installment.main_loan}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft size={16} className="mr-2" />
              Back to Loan
            </Button>
          </Link> */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Installment #{installment.installment_id}</h1>
            <p className="text-gray-600">Loan ID: {installment.loan_id}</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={() => window.print()}>
            Print Details
          </Button>
        </div>
      </div>

      {/* Customer Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Customer Information</h3>
              <div className="space-y-2">
                <p className="text-sm">
                  <span className="text-gray-600">Name:</span>{' '}
                  <span className="font-medium">{installment.customer_name}</span>
                </p>
                <p className="text-sm">
                  <span className="text-gray-600">Phone:</span>{' '}
                  <span className="font-medium">{installment.phone_number}</span>
                </p>
                {installment.assigned_officer_details && (
                  <p className="text-sm">
                    <span className="text-gray-600">Assigned Officer:</span>{' '}
                    <span className="font-medium">{installment.assigned_officer_details.username}</span>
                  </p>
                )}
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2">Installment Status</h3>
              <div className="flex items-center space-x-2">
                {installment.paid_off ? (
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm flex items-center">
                    <CheckCircle size={16} className="mr-1" />
                    Paid Off
                  </span>
                ) : installment.is_overdue ? (
                  <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm flex items-center">
                    <AlertCircle size={16} className="mr-1" />
                    Overdue
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center">
                    <Clock size={16} className="mr-1" />
                    Current
                  </span>
                )}
                
                {installment.is_current_month && (
                  <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                    Current Month
                  </span>
                )}
              </div>
              
              <p className="text-sm mt-2">
                {installment.days_until_due_display}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Progress */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Payment Progress</h2>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">Progress</span>
              <span className="text-sm font-medium text-gray-700">
                {installment.payment_progress.percentage.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className={`h-2.5 rounded-full ${
                  installment.payment_progress.percentage === 100 
                    ? 'bg-green-600' 
                    : 'bg-blue-600'
                }`}
                style={{ width: `${installment.payment_progress.percentage}%` }}
              ></div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Total Amount</p>
              <p className="text-2xl font-bold">{formatCurrency(installment.total_amount)}</p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Paid</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(installment.repaid)}</p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Balance</p>
              <p className={`text-2xl font-bold ${parseFloat(installment.balance) > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {formatCurrency(installment.balance)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Breakdown */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Payment Breakdown</h2>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-2">Principal</h3>
              <div className="space-y-1">
                <p className="text-sm">Due: <span className="font-medium">{formatCurrency(installment.principal_due)}</span></p>
                <p className="text-sm">Paid: <span className="font-medium text-green-600">{formatCurrency(installment.principal_paid)}</span></p>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-2">Interest</h3>
              <div className="space-y-1">
                <p className="text-sm">Due: <span className="font-medium">{formatCurrency(installment.interest_due)}</span></p>
                <p className="text-sm">Paid: <span className="font-medium text-green-600">{formatCurrency(installment.interest_paid)}</span></p>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-2">Penalty</h3>
              <div className="space-y-1">
                <p className="text-sm">Due: <span className="font-medium">{formatCurrency(installment.penalty_due)}</span></p>
                <p className="text-sm">Paid: <span className="font-medium text-green-600">{formatCurrency(installment.penalty_paid)}</span></p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dates */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Important Dates</h2>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center">
              <Calendar className="h-5 w-5 text-gray-400 mr-2" />
              <div>
                <p className="text-xs text-gray-600">Start Date</p>
                <p className="font-medium">{new Date(installment.start_date).toLocaleDateString()}</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <Calendar className="h-5 w-5 text-gray-400 mr-2" />
              <div>
                <p className="text-xs text-gray-600">Due Date</p>
                <p className={`font-medium ${installment.is_overdue ? 'text-red-600' : ''}`}>
                  {new Date(installment.due_date).toLocaleDateString()}
                </p>
              </div>
            </div>
            
            {installment.actual_repay_date && (
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                <div>
                  <p className="text-xs text-gray-600">Actual Repayment</p>
                  <p className="font-medium">{new Date(installment.actual_repay_date).toLocaleDateString()}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end space-x-3">
        <Button variant="outline" onClick={() => router.push(`/call-logs/new?loan=${installment.loan_id}&installment=${installment.installment_id}`)}>
          Log Call for This Installment
        </Button>
        <Button className="bg-blue-600 hover:bg-blue-700">
          Record Payment
        </Button>
      </div>
    </div>
  );
}