// app/sms-template-manual/page.tsx
'use client';

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';

// ------------------------------------------------------------------
// Single Loan SMS Variables (from build_loan_context)
// ------------------------------------------------------------------
interface Variable {
  name: string;
  description: string;
  example: string;
  formatNote?: string;
  group: string;
}

const singleSMSVariables: Variable[] = [
  // Loan fields
  { group: 'Loan – Basic', name: 'loan_id', description: 'Loan identifier', example: '0b9b31df' },
  { group: 'Loan – Basic', name: 'customer_id', description: 'Customer ID', example: 'CUST001' },
  { group: 'Loan – Basic', name: 'customer_name', description: 'Full customer name', example: 'John Doe' },
  { group: 'Loan – Basic', name: 'full_customer_name', description: 'Full name (first + middle + last)', example: 'John M. Doe' },
  { group: 'Loan – Basic', name: 'phone_number', description: 'Primary phone number', example: '0712345678' },
  { group: 'Loan – Basic', name: 'collection_status', description: 'Current collection status', example: 'collectable' },
  { group: 'Loan – Basic', name: 'status_text', description: 'Loan status text', example: 'Active' },

  { group: 'Loan – Financial', name: 'total_outstanding', description: 'Total outstanding balance', example: '70000.00', formatNote: 'Decimal' },
  { group: 'Loan – Financial', name: 'total_amount', description: 'Original total loan amount', example: '100000.00' },
  { group: 'Loan – Financial', name: 'total_paid', description: 'Total amount paid', example: '30000.00' },
  { group: 'Loan – Financial', name: 'disburse_amount', description: 'Amount disbursed', example: '95000.00' },
  { group: 'Loan – Financial', name: 'installments_numbers', description: 'Total number of installments', example: '12' },
  { group: 'Loan – Financial', name: 'paid_installments', description: 'Installments already paid', example: '3' },
  { group: 'Loan – Financial', name: 'due_installments', description: 'Installments still due', example: '9' },
  { group: 'Loan – Financial', name: 'total_promised_amount', description: 'Sum of all pending promises', example: '20000.00' },
  { group: 'Loan – Financial', name: 'has_active_promise', description: 'Whether an active promise exists', example: 'true', formatNote: 'Boolean' },

  { group: 'Loan – Dates', name: 'due_date', description: 'Loan due date', example: '2026-03-01', formatNote: 'YYYY-MM-DD' },
  { group: 'Loan – Dates', name: 'disburse_time', description: 'Disbursement date', example: '2025-12-01', formatNote: 'YYYY-MM-DD' },
  { group: 'Loan – Dates', name: 'days_overdue', description: 'Days overdue (positive if overdue)', example: '5', formatNote: 'Integer' },
  { group: 'Loan – Dates', name: 'is_overdue', description: 'Whether loan is overdue', example: 'true', formatNote: 'Boolean' },

  { group: 'Loan – Payment', name: 'paybill_number', description: 'Paybill number', example: '4091141' },
  { group: 'Loan – Payment', name: 'loan_provider_name', description: 'Loan provider name', example: 'Premium Loans' },

  // Installment fields
  { group: 'Installment – Basic', name: 'installment_id', description: 'Installment number (current month)', example: '4' },
  { group: 'Installment – Basic', name: 'installment_plan_type', description: 'Plan type', example: 'payment' },
  { group: 'Installment – Basic', name: 'installment_due_date', description: 'Installment due date', example: '2026-03-15', formatNote: 'YYYY-MM-DD' },
  { group: 'Installment – Basic', name: 'installment_total_amount', description: 'Total amount for this installment', example: '15000.00' },
  { group: 'Installment – Basic', name: 'installment_repaid', description: 'Amount already repaid for this installment', example: '5000.00' },
  { group: 'Installment – Basic', name: 'installment_balance', description: 'Remaining balance for this installment', example: '10000.00' },
  { group: 'Installment – Basic', name: 'installment_cumulative_balance', description: 'Sum of all unpaid installments (from this installment)', example: '45000.00' },
  { group: 'Installment – Basic', name: 'installment_days_until_due', description: 'Days until due (negative if overdue)', example: '-2', formatNote: 'Integer' },
  { group: 'Installment – Basic', name: 'installment_is_overdue', description: 'Whether this installment is overdue', example: 'true', formatNote: 'Boolean' },

  { group: 'Installment – Breakdown', name: 'installment_principal_due', description: 'Principal due for this installment', example: '8000.00' },
  { group: 'Installment – Breakdown', name: 'installment_interest_due', description: 'Interest due', example: '1500.00' },
  { group: 'Installment – Breakdown', name: 'installment_penalty_due', description: 'Penalty due', example: '500.00' },
  { group: 'Installment – Breakdown', name: 'installment_principal_paid', description: 'Principal already paid', example: '3000.00' },
  { group: 'Installment – Breakdown', name: 'installment_interest_paid', description: 'Interest already paid', example: '500.00' },
  { group: 'Installment – Breakdown', name: 'installment_penalty_paid', description: 'Penalty already paid', example: '0.00' },

  // Payment Reminder fields
  { group: 'Payment Reminder', name: 'promised_amount', description: 'Amount promised (latest pending reminder)', example: '20000.00' },
  { group: 'Payment Reminder', name: 'promised_date', description: 'Date promised', example: '2026-02-28', formatNote: 'YYYY-MM-DD' },
  { group: 'Payment Reminder', name: 'promised_datetime', description: 'Full promised datetime', example: '2026-02-28T10:30:00' },
  { group: 'Payment Reminder', name: 'payment_method', description: 'Payment method promised', example: 'M-PESA' },
  { group: 'Payment Reminder', name: 'reminder_status', description: 'Status of the reminder', example: 'pending' },
  { group: 'Payment Reminder', name: 'days_until_promise_due', description: 'Days until promise is due', example: '3', formatNote: 'Integer' },
  { group: 'Payment Reminder', name: 'promise_overdue', description: 'True if promise date has passed', example: 'false', formatNote: 'Boolean' },
];

// ------------------------------------------------------------------
// Bulk Campaign Variables (from provided list)
// ------------------------------------------------------------------
const bulkCampaignVariables: Variable[] = [
  // Customer Information
  { group: 'Customer Information', name: 'customer_name', description: 'Full name', example: 'John Doe' },
  { group: 'Customer Information', name: 'first_name', description: 'First name', example: 'John' },
  { group: 'Customer Information', name: 'middle_name', description: 'Middle name', example: 'M.' },
  { group: 'Customer Information', name: 'last_name', description: 'Last name', example: 'Doe' },
  { group: 'Customer Information', name: 'customer_id', description: 'Customer ID', example: 'CUST001' },
  { group: 'Customer Information', name: 'mobile', description: 'Mobile number', example: '0712345678' },
  { group: 'Customer Information', name: 'pin_num', description: 'PIN number', example: 'P12345' },

  // Loan Details
  { group: 'Loan Details', name: 'loan_id', description: 'Loan ID (truncated to 8 chars)', example: '0b9b31df' },
  { group: 'Loan Details', name: 'loan_type', description: 'Loan type code', example: '1001' },
  { group: 'Loan Details', name: 'case_prefix', description: 'Case prefix', example: 'CH' },
  { group: 'Loan Details', name: 'case_id', description: 'Case number', example: '12345' },
  { group: 'Loan Details', name: 'disburse_type', description: 'Disbursement type', example: 'Online' },
  { group: 'Loan Details', name: 'disburse_prefix', description: 'Disbursement prefix', example: 'DB' },

  // Financial Information
  { group: 'Financial Information', name: 'balance', description: 'Current installment balance', example: '15000.00' },
  { group: 'Financial Information', name: 'cumulative_balance', description: 'Sum of all unpaid installments', example: '45000.00' },
  { group: 'Financial Information', name: 'total_amount', description: 'Original total loan amount', example: '100000.00' },
  { group: 'Financial Information', name: 'apply_amount', description: 'Applied amount', example: '100000.00' },
  { group: 'Financial Information', name: 'disburse_amount', description: 'Amount disbursed', example: '95000.00' },
  { group: 'Financial Information', name: 'interest_rate', description: 'Interest rate (percentage)', example: '12.5%', formatNote: 'Formatted as %' },
  { group: 'Financial Information', name: 'ipf_amount', description: 'IPF amount', example: '5000.00' },
  { group: 'Financial Information', name: 'total_paid', description: 'Total amount paid', example: '30000.00' },
  { group: 'Financial Information', name: 'total_outstanding', description: 'Total outstanding balance', example: '70000.00' },
  { group: 'Financial Information', name: 'repaid', description: 'Amount repaid for current installment', example: '5000.00' },

  // Dates
  { group: 'Dates', name: 'due_date', description: 'Loan due date', example: '2026-03-01', formatNote: 'YYYY-MM-DD' },
  { group: 'Dates', name: 'plan_due_date', description: 'Installment due date', example: '2026-03-15', formatNote: 'YYYY-MM-DD' },
  { group: 'Dates', name: 'disburse_time', description: 'Disbursement date', example: '2025-12-01', formatNote: 'YYYY-MM-DD' },
  { group: 'Dates', name: 'default_date', description: 'Default date', example: '2026-01-15', formatNote: 'YYYY-MM-DD' },

  // Installment Info
  { group: 'Installment Info', name: 'installments_numbers', description: 'Total number of installments', example: '12' },
  { group: 'Installment Info', name: 'paid_installments', description: 'Installments already paid', example: '3' },
  { group: 'Installment Info', name: 'due_installments', description: 'Installments still due', example: '9' },
  { group: 'Installment Info', name: 'plan_installment', description: 'Current installment number', example: '4' },
  { group: 'Installment Info', name: 'plan_total_due', description: 'Total amount due for current installment', example: '15000.00' },
  { group: 'Installment Info', name: 'plan_total_outstanding', description: 'Same as balance', example: '15000.00' },

  // Vehicle Info
  { group: 'Vehicle Info', name: 'model', description: 'Vehicle model', example: 'Toyota Axio' },
  { group: 'Vehicle Info', name: 'registration_number', description: 'Registration number', example: 'KCA 123A' },

  // Payment Info
  { group: 'Payment Info', name: 'paybill_number', description: 'Paybill number (varies by prefix)', example: '4091141' },
  { group: 'Payment Info', name: 'due_days', description: 'Absolute days until due/overdue', example: '-5', formatNote: 'Integer' },
];

// ------------------------------------------------------------------
// Helper to group variables
// ------------------------------------------------------------------
const groupBy = <T, K extends keyof any>(array: T[], key: (item: T) => K): Record<K, T[]> => {
  return array.reduce((result, item) => {
    const groupKey = key(item);
    (result[groupKey] = result[groupKey] || []).push(item);
    return result;
  }, {} as Record<K, T[]>);
};

// ------------------------------------------------------------------
// Main Page Component
// ------------------------------------------------------------------
export default function SMSTemplateManualPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('single');

  const filterVariables = (vars: Variable[]) => {
    if (!searchTerm.trim()) return vars;
    const term = searchTerm.toLowerCase();
    return vars.filter(v =>
      v.name.toLowerCase().includes(term) ||
      v.description.toLowerCase().includes(term)
    );
  };

  const filteredSingle = useMemo(() => filterVariables(singleSMSVariables), [searchTerm]);
  const filteredBulk = useMemo(() => filterVariables(bulkCampaignVariables), [searchTerm]);

  const groupedSingle = useMemo(() => groupBy(filteredSingle, v => v.group), [filteredSingle]);
  const groupedBulk = useMemo(() => groupBy(filteredBulk, v => v.group), [filteredBulk]);

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">SMS Template Variables Manual</h1>
        <p className="text-gray-600">
          Use these variables inside double curly braces <code>{'{{variable_name}}'}</code> in your SMS templates.
          Variables are automatically replaced with real data when sending.
        </p>
        <p className="text-sm text-red-600 mt-2">
          <strong>Important:</strong> Single Loan SMS and Bulk Campaign SMS use different variable sets. Make sure you are using the correct ones for your use case.
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          type="text"
          placeholder="Search variables by name or description..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="single">Single Loan SMS</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Campaign SMS</TabsTrigger>
        </TabsList>

        {/* Single SMS Tab */}
        <TabsContent value="single">
          {Object.entries(groupedSingle).length === 0 ? (
            <p className="text-center py-8 text-gray-500">No variables match your search.</p>
          ) : (
            Object.entries(groupedSingle).map(([group, vars]) => (
              <Card key={group} className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">{group}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-gray-600">Variable</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-600">Description</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-600">Example</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-600">Format</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {vars.map((v) => (
                          <tr key={v.name} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-mono text-blue-600">&#123;&#123;{v.name}&#125;&#125;</td>
                            <td className="px-4 py-3">{v.description}</td>
                            <td className="px-4 py-3 text-gray-600">{v.example}</td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{v.formatNote || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Bulk Campaign Tab */}
        <TabsContent value="bulk">
          <Card className="mb-6 bg-yellow-50 border-yellow-200">
            <CardContent className="pt-6">
              <p className="text-sm text-gray-700 mb-2">
                <strong>Note:</strong> In bulk campaigns, variables are taken directly from the column headers of your uploaded Excel file.
                The variable names must <strong>exactly match</strong> the column names (case‑sensitive).
                The table below lists the most commonly used variables, but any column in your file can be used.
              </p>
              <p className="text-sm text-gray-700">
                <strong>Mandatory columns:</strong> <code>customer_name</code> and <code>phone_number</code> must be present.
              </p>
            </CardContent>
          </Card>

          {Object.entries(groupedBulk).length === 0 ? (
            <p className="text-center py-8 text-gray-500">No variables match your search.</p>
          ) : (
            Object.entries(groupedBulk).map(([group, vars]) => (
              <Card key={group} className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">{group}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-gray-600">Variable</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-600">Description</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-600">Example</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-600">Format</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {vars.map((v) => (
                          <tr key={v.name} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-mono text-purple-600">&#123;&#123;{v.name}&#125;&#125;</td>
                            <td className="px-4 py-3">{v.description}</td>
                            <td className="px-4 py-3 text-gray-600">{v.example}</td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{v.formatNote || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Formatting Notes */}
      <Card className="mt-8 bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-md font-semibold text-blue-800">📌 Formatting Notes</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-900 space-y-2">
          <p>• <strong>Dates</strong> are always shown in <code>YYYY-MM-DD</code> format (e.g. 2026-03-15).</p>
          <p>• <strong>Currency values</strong> are formatted with two decimal places (e.g. 15000.00).</p>
          <p>• <strong>Interest rates</strong> are displayed as percentages (e.g. 12.5%).</p>
          <p>• For <strong>single loan SMS</strong>, installment variables refer to the <em>current month</em> installment (if any).</p>
          <p>• For <strong>bulk campaigns</strong>, column names in your Excel file must exactly match the variable names (case‑sensitive).</p>
          <p>• If a variable is not found (e.g. no active installment, no payment reminder, or missing Excel column), it is replaced with an empty string.</p>
        </CardContent>
      </Card>

      {/* Example Templates */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-md font-semibold">📝 Example Templates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="font-medium mb-1">Single Loan SMS:</p>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
              Dear {'{{customer_name}}'}, your installment of KSh {'{{installment_balance}}'} is due on {'{{installment_due_date}}'}. Total outstanding: KSh {'{{installment_cumulative_balance}}'}. Paybill: {'{{paybill_number}}'}
            </pre>
          </div>
          <div>
            <p className="font-medium mb-1">Bulk Campaign (Excel columns: customer_name, plan_installment, balance, plan_due_date):</p>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
              Dear {'{{customer_name}}'}, your installment {'{{plan_installment}}'} of KSh {'{{balance}}'} is due on {'{{plan_due_date}}'}. Please pay promptly.
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}