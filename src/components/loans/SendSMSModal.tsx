// components/call-logs/SendSMSModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  Calendar,
  CreditCard,
  Phone,
  User,
  Edit2,
} from 'lucide-react';
import { apiClient } from '@/lib/api';

interface Template {
  id: string;
  template_name: string;
  template_desc: string;
  is_active: boolean;
  is_campaign_template: boolean;
}

interface Installment {
  id: string;
  installment_id: number;
  due_date: string;
  balance: number;
  is_current_month: boolean;
}

interface PaymentReminderDetails {
  id: string;
  promised_amount: number;
  promised_date: string;
  payment_method: string;
  created_at: string;
}

interface SendSMSModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  loanId: string;                // loan.loan_id (string)
  loanUuid?: string;              // loan.id (UUID)
  customerName: string;
  phoneNumber: string;
  currentMonthInstallmentId?: string;
  // New props for payment reminder context
  callLogId?: string;
  paymentReminderId?: string;
}

export default function SendSMSModal({
  isOpen,
  onClose,
  onSuccess,
  loanId,
  loanUuid,
  customerName,
  phoneNumber,
  currentMonthInstallmentId,
  callLogId,
  paymentReminderId,
}: SendSMSModalProps) {
  const [step, setStep] = useState<'choose' | 'preview' | 'sending'>('choose');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [customMessage, setCustomMessage] = useState('');
  const [useTemplate, setUseTemplate] = useState(true);
  const [previewDraftId, setPreviewDraftId] = useState<string | null>(null);
  const [previewMessage, setPreviewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // New state for editable phone number
  const [recipientPhoneNumber, setRecipientPhoneNumber] = useState(phoneNumber);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  
  // New state for payment reminder details
  const [reminderDetails, setReminderDetails] = useState<PaymentReminderDetails | null>(null);
  const [isLoadingReminder, setIsLoadingReminder] = useState(false);

  // Update recipient phone when prop changes
  useEffect(() => {
    setRecipientPhoneNumber(phoneNumber);
  }, [phoneNumber]);

  // Fetch templates and payment reminder details when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
      if (paymentReminderId) {
        fetchPaymentReminderDetails();
      }
      // Reset state
      setStep('choose');
      setSelectedTemplateId('');
      setCustomMessage('');
      setUseTemplate(true);
      setPreviewDraftId(null);
      setPreviewMessage('');
      setError(null);
      setSuccess(null);
      setIsEditingPhone(false);
      setRecipientPhoneNumber(phoneNumber);
    }
  }, [isOpen, paymentReminderId, phoneNumber]);

  const fetchTemplates = async () => {
    try {
      const client = apiClient.getClient();
      const response = await client.get('/templates/?is_active=true');
      setTemplates(response.data.results || response.data);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
      setError('Could not load templates. Please try again.');
    }
  };

  const fetchPaymentReminderDetails = async () => {
    if (!paymentReminderId) return;
    
    setIsLoadingReminder(true);
    try {
      const client = apiClient.getClient();
      const response = await client.get(`/payment-reminders/${paymentReminderId}/`);
      setReminderDetails(response.data);
    } catch (err) {
      console.error('Failed to fetch payment reminder details:', err);
      // Don't show error to user, just proceed without details
    } finally {
      setIsLoadingReminder(false);
    }
  };

  const validatePhoneNumber = (phone: string): boolean => {
    // Basic phone validation - adjust based on your requirements
    const phoneRegex = /^[0-9+\-\s]{10,15}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const handlePreview = async () => {
    if (useTemplate && !selectedTemplateId) {
      setError('Please select a template');
      return;
    }
    if (!useTemplate && !customMessage.trim()) {
      setError('Please enter a message');
      return;
    }
    if (!validatePhoneNumber(recipientPhoneNumber)) {
      setError('Please enter a valid phone number');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const client = apiClient.getClient();
      const payload: any = {
        loan_id: loanId,
        phone_number: recipientPhoneNumber, // Include the editable phone number
      };
      
      if (useTemplate) {
        payload.template_id = selectedTemplateId;
      } else {
        payload.message = customMessage;
      }
      
      // Add context IDs for better message personalization
      if (currentMonthInstallmentId) {
        payload.installment_id = currentMonthInstallmentId;
      }
      
      if (paymentReminderId) {
        payload.payment_reminder_id = paymentReminderId;
      }
      
      if (callLogId) {
        payload.call_log_id = callLogId;
      }

      const response = await client.post('/sms-logs/preview/', payload);
      const draft = response.data;
      setPreviewDraftId(draft.id);
      setPreviewMessage(draft.message);
      setStep('preview');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Preview failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!previewDraftId) return;

    setIsLoading(true);
    setError(null);

    try {
      const client = apiClient.getClient();
      // Include the phone number in the send request
      await client.post(`/sms-logs/${previewDraftId}/send-approved/`, {
        phone_number: recipientPhoneNumber,
      });
      setSuccess('SMS sent successfully!');
      onSuccess();
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Sending failed');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setStep('choose');
    setSelectedTemplateId('');
    setCustomMessage('');
    setUseTemplate(true);
    setPreviewDraftId(null);
    setPreviewMessage('');
    setError(null);
    setSuccess(null);
    setIsEditingPhone(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Get payment method label
  const getPaymentMethodLabel = (method: string) => {
    const methods: Record<string, string> = {
      mpesa: 'M-PESA',
      bank: 'Bank Transfer',
      cash: 'Cash',
      cheque: 'Cheque',
      other: 'Other',
    };
    return methods[method] || method;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {step === 'choose' && (
              paymentReminderId ? 'Send Payment Confirmation SMS' : 'Send SMS to Customer'
            )}
            {step === 'preview' && 'Review Message'}
            {step === 'sending' && 'Sending...'}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="mb-4 p-4 border border-red-200 bg-red-50 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-4 border border-green-200 bg-green-50 rounded-lg flex items-start gap-3">
            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
            <p className="text-sm text-green-600">{success}</p>
          </div>
        )}

        {step === 'choose' && (
          <div className="space-y-4">
            {/* Customer Info Section */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-gray-500" />
                <span className="font-medium">{customerName}</span>
              </div>
              
              {/* Editable Phone Number */}
              <div className="flex items-start gap-2">
                <Phone className="h-4 w-4 text-gray-500 mt-2" />
                <div className="flex-1">
                  {isEditingPhone ? (
                    <div className="space-y-2">
                      <Input
                        type="text"
                        value={recipientPhoneNumber}
                        onChange={(e) => setRecipientPhoneNumber(e.target.value)}
                        placeholder="Enter phone number (e.g., 254712345678)"
                        className="w-full"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setRecipientPhoneNumber(phoneNumber);
                            setIsEditingPhone(false);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => setIsEditingPhone(false)}
                        >
                          Save
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500">
                        Format: 254712345678 (include country code)
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span>{recipientPhoneNumber}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditingPhone(true)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit2 className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <CreditCard className="h-4 w-4 text-gray-500" />
                <span>Loan: {loanId}</span>
              </div>
            </div>

            {/* Payment Reminder Details - Show if available */}
            {paymentReminderId && (
              <div className="border border-green-200 bg-green-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <h3 className="font-medium text-green-800">Payment Promise Recorded</h3>
                </div>
                
                {isLoadingReminder ? (
                  <div className="flex items-center justify-center py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-green-600" />
                    <span className="text-sm text-green-700 ml-2">Loading details...</span>
                  </div>
                ) : reminderDetails ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-green-700">Promised Amount:</span>
                      <span className="font-medium text-green-800">
                        {formatCurrency(reminderDetails.promised_amount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Promised Date:</span>
                      <span className="font-medium text-green-800 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(reminderDetails.promised_date)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Payment Method:</span>
                      <span className="font-medium text-green-800">
                        {getPaymentMethodLabel(reminderDetails.payment_method)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-green-700">
                    Payment reminder has been created successfully.
                  </p>
                )}
                
                <p className="text-xs text-green-600 mt-2">
                  Send an SMS to confirm the payment promise with the customer.
                </p>
              </div>
            )}

            {/* Template/Custom Message Selection */}
            <div className="flex items-center space-x-4 pt-2">
              <Label className="flex items-center space-x-2">
                <input
                  type="radio"
                  checked={useTemplate}
                  onChange={() => setUseTemplate(true)}
                  className="h-4 w-4"
                />
                <span>Use Template</span>
              </Label>
              <Label className="flex items-center space-x-2">
                <input
                  type="radio"
                  checked={!useTemplate}
                  onChange={() => setUseTemplate(false)}
                  className="h-4 w-4"
                />
                <span>Custom Message</span>
              </Label>
            </div>

            {useTemplate ? (
              <div className="space-y-2">
                <Label htmlFor="template">Select Template</Label>
                <Select
                  value={selectedTemplateId}
                  onValueChange={setSelectedTemplateId}
                >
                  <SelectTrigger id="template">
                    <SelectValue placeholder="Choose a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates
                      .filter(tpl => tpl.is_active)
                      .map((tpl) => (
                        <SelectItem key={tpl.id} value={tpl.id}>
                          {tpl.template_name}
                          {tpl.is_campaign_template && (
                            <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                              Campaign
                            </span>
                          )}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {selectedTemplateId && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 italic">
                      {templates.find(t => t.id === selectedTemplateId)?.template_desc}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="message">Custom Message</Label>
                <Textarea
                  id="message"
                  rows={5}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Enter your message..."
                  className="resize-none"
                />
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-xs font-medium text-blue-800 mb-1">
                    Available variables:
                  </p>
                  <div className="grid grid-cols-2 gap-1 text-xs text-blue-700">
                    <span>• {'{{customer_name}}'}</span>
                    <span>• {'{{loan_id}}'}</span>
                    <span>• {'{{balance}}'}</span>
                    <span>• {'{{due_date}}'}</span>
                    <span>• {'{{days_overdue}}'}</span>
                    {paymentReminderId && (
                      <>
                        <span>• {'{{promised_amount}}'}</span>
                        <span>• {'{{promised_date}}'}</span>
                        <span>• {'{{payment_method}}'}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="pt-4">
              <Button variant="outline" onClick={handleClose}>
                {paymentReminderId ? 'Skip & Close' : 'Cancel'}
              </Button>
              <Button 
                onClick={handlePreview} 
                disabled={isLoading || (useTemplate && !selectedTemplateId) || isEditingPhone}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Preview Message
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            {/* Message Preview */}
            <div className="rounded-lg border p-4 bg-gray-50">
              <p className="whitespace-pre-wrap text-sm">{previewMessage}</p>
            </div>

            {/* Recipient Info - Show the editable phone number */}
            <div className="text-sm text-gray-600 space-y-1">
              <p><span className="font-medium">To:</span> {customerName}</p>
              <p><span className="font-medium">Phone:</span> {recipientPhoneNumber}</p>
              {recipientPhoneNumber !== phoneNumber && (
                <p className="text-xs text-amber-600">
                  (Changed from original: {phoneNumber})
                </p>
              )}
            </div>

            {/* Payment Reminder Summary (if applicable) */}
            {reminderDetails && (
              <div className="border-t pt-3">
                <p className="text-xs text-gray-500 mb-2">
                  This message includes payment promise details:
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium">{formatCurrency(reminderDetails.promised_amount)}</span>
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium">{formatDate(reminderDetails.promised_date)}</span>
                </div>
              </div>
            )}

            {/* Confirmation */}
            <div className="bg-yellow-50 p-3 rounded-lg">
              <p className="text-xs text-yellow-800">
                <strong>Note:</strong> This message will be sent via Advanta. 
                Standard SMS charges may apply.
              </p>
            </div>

            <DialogFooter className="pt-4">
              <Button variant="outline" onClick={() => setStep('choose')}>
                Back
              </Button>
              <Button 
                onClick={handleSend} 
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Now
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}