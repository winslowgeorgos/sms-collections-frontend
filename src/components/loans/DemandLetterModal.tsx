// components/loans/DemandLetterModal.tsx
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, Edit, Mail, X, Loader2 } from 'lucide-react';

// Simple modal implementation without Dialog component if Dialog is causing issues
interface DemandLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  letterData: any;
  onEdit: () => void;
  onDownload: () => void;
  onSendEmail: () => void;
  isSendingEmail: boolean;
}

export default function DemandLetterModal({
  isOpen,
  onClose,
  letterData,
  onEdit,
  onDownload,
  onSendEmail,
  isSendingEmail
}: DemandLetterModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">
            Demand Letter - {letterData?.reference || 'N/A'}
          </h2>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit size={16} className="mr-2" />
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={onDownload}>
              <Download size={16} className="mr-2" />
              Download PDF
            </Button>
            <Button 
              size="sm" 
              onClick={onSendEmail}
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
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X size={16} />
            </Button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {/* Letter info summary */}
          {letterData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Document ID</p>
                  <p className="text-sm font-mono">{letterData.document_id || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Verification Code</p>
                  <p className="text-sm font-mono">{letterData.verification_code || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Amount Due</p>
                  <p className="text-sm font-bold text-red-600">
                    KES {(letterData.amount_due || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Generated</p>
                  <p className="text-sm">
                    {letterData.generated_at ? new Date(letterData.generated_at).toLocaleString() : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Letter preview */}
          {letterData?.preview_html ? (
            <div 
              className="border rounded-lg p-4 bg-white overflow-auto max-h-[500px]"
              dangerouslySetInnerHTML={{ __html: letterData.preview_html }}
            />
          ) : letterData?.pdf_url ? (
            <iframe 
              src={letterData.pdf_url} 
              className="w-full h-[500px] border rounded-lg"
              title="Demand Letter"
            />
          ) : (
            <div className="text-center py-12">
              <p>No preview available. Click Download to view the letter.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}