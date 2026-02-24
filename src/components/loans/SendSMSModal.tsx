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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
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

interface SendSMSModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  loanId: string;                // loan.loan_id (string)
  loanUuid?: string;              // loan.id (UUID) – may be used for installment lookup
  customerName: string;
  phoneNumber: string;
  currentMonthInstallmentId?: string;   // optional, from loan details
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

  // Fetch templates when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
      // Reset state
      setStep('choose');
      setSelectedTemplateId('');
      setCustomMessage('');
      setUseTemplate(true);
      setPreviewDraftId(null);
      setPreviewMessage('');
      setError(null);
      setSuccess(null);
    }
  }, [isOpen]);

  const fetchTemplates = async () => {
    try {
      const client = apiClient.getClient();
      // Fetch all active templates (adjust endpoint if needed)
      const response = await client.get('/templates/?is_active=true');
      setTemplates(response.data.results || response.data);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
      setError('Could not load templates. Please try again.');
    }
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

    setIsLoading(true);
    setError(null);

    try {
      const client = apiClient.getClient();
      const payload: any = {
        loan_id: loanId,
      };
      if (useTemplate) {
        payload.template_id = selectedTemplateId;
      } else {
        payload.message = customMessage;
      }
      // Optionally include installment id if we want to force a specific one
      // (otherwise backend will use current month installment)
      if (currentMonthInstallmentId) {
        payload.installment_id = currentMonthInstallmentId;
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
      await client.post(`/sms-logs/${previewDraftId}/send-approved/`);
      setSuccess('SMS sent successfully!');
      onSuccess();  // refresh parent data (e.g., SMS logs tab)
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
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {step === 'choose' && 'Send SMS to Customer'}
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
            <div className="text-sm text-gray-600 mb-2">
              Send to: <span className="font-medium">{customerName}</span> ({phoneNumber})
            </div>

            <div className="flex items-center space-x-4">
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
                    {templates.map((tpl) => (
                      <SelectItem key={tpl.id} value={tpl.id}>
                        {tpl.template_name}
                        {tpl.is_campaign_template && ' (Campaign)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedTemplateId && (
                  <p className="text-xs text-gray-500 mt-1">
                    {templates.find(t => t.id === selectedTemplateId)?.template_desc.substring(0, 100)}...
                  </p>
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
                  placeholder="Enter your message. You can use {{variable}} placeholders like {{balance}}, {{due_date}}, etc."
                />
                <p className="text-xs text-gray-500">
                  Available variables: loan fields (balance, due_date, days_overdue, etc.), 
                  current month installment (installment_balance, installment_due_date, etc.), 
                  and latest payment promise (promised_amount, promised_date).
                </p>
              </div>
            )}

            <DialogFooter className="pt-4">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handlePreview} disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Preview Message
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="rounded-lg border p-4 bg-gray-50">
              <p className="whitespace-pre-wrap text-sm">{previewMessage}</p>
            </div>

            <div className="text-sm text-gray-600">
              <p>Recipient: {customerName} ({phoneNumber})</p>
              <p>This message will be sent via Advanta. Are you sure?</p>
            </div>

            <DialogFooter className="pt-4">
              <Button variant="outline" onClick={() => setStep('choose')}>
                Back
              </Button>
              <Button onClick={handleSend} disabled={isLoading}>
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