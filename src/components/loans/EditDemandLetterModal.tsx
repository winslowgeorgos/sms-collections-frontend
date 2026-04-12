// components/loans/EditDemandLetterModal.tsx
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, X } from 'lucide-react';

interface EditDemandLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  letterData: {
    customer: {
      name: string;
      id_number: string;
      address_line1: string;
      address_line2: string;
      phone: string;
      email: string;
    };
    loan_info: {
      amount_due: number;
      principal_amount: number;
      loan_date: string;
      loan_term_months: number;
      monthly_installment: number;
      payment_due_day: string;
      first_payment_due_date: string;
    };
    reference: string;
  };
  onSave: (data: any) => void;
  isSaving: boolean;
}

export default function EditDemandLetterModal({
  isOpen,
  onClose,
  letterData,
  onSave,
  isSaving
}: EditDemandLetterModalProps) {
  const [formData, setFormData] = useState({
    customer_name: letterData?.customer?.name || '',
    id_number: letterData?.customer?.id_number || '',
    address_line1: letterData?.customer?.address_line1 || '',
    address_line2: letterData?.customer?.address_line2 || '',
    phone: letterData?.customer?.phone || '',
    email: letterData?.customer?.email || '',
    amount_due: letterData?.loan_info?.amount_due || 0,
    reference: letterData?.reference || ''
  });

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Edit Demand Letter</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X size={16} />
          </Button>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customer_name">Customer Name</Label>
              <Input
                id="customer_name"
                name="customer_name"
                value={formData.customer_name}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="id_number">ID Number</Label>
              <Input
                id="id_number"
                name="id_number"
                value={formData.id_number}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="address_line1">Address Line 1</Label>
            <Input
              id="address_line1"
              name="address_line1"
              value={formData.address_line1}
              onChange={handleChange}
              placeholder="P.O BOX ..."
            />
          </div>

          <div>
            <Label htmlFor="address_line2">Address Line 2 (City)</Label>
            <Input
              id="address_line2"
              name="address_line2"
              value={formData.address_line2}
              onChange={handleChange}
              placeholder="City"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount_due">Amount Due (KES)</Label>
              <Input
                id="amount_due"
                name="amount_due"
                type="number"
                step="0.01"
                value={formData.amount_due}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="reference">Reference Number</Label>
              <Input
                id="reference"
                name="reference"
                value={formData.reference}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Loan information like principal amount, loan date, 
              and installment details cannot be edited here. Please contact admin if 
              corrections are needed.
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}