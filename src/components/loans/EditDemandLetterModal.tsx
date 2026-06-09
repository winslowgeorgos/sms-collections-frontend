// components/loans/EditDemandLetterModal.tsx
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, X, Plus, Trash2, Calendar } from 'lucide-react';

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
      manual_due_dates?: string[]; // Add manual due dates field
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
    reference: letterData?.reference || '',
    manual_due_dates: letterData?.loan_info?.manual_due_dates || []
  });

  const [newDueDate, setNewDueDate] = useState('');

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleAddDueDate = () => {
    if (newDueDate && !formData.manual_due_dates.includes(newDueDate)) {
      setFormData({
        ...formData,
        manual_due_dates: [...formData.manual_due_dates, newDueDate]
      });
      setNewDueDate('');
    }
  };

  const handleRemoveDueDate = (dateToRemove: string) => {
    setFormData({
      ...formData,
      manual_due_dates: formData.manual_due_dates.filter(date => date !== dateToRemove)
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddDueDate();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  // Format date for display (assuming format is "DD Month YYYY" like "19 April 2026")
  const formatDateForDisplay = (dateStr: string) => {
    return dateStr;
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

          {/* Installment Due Dates Section */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <Label className="text-base font-semibold mb-2 block">
              Installment Due Dates
            </Label>
            
            {/* Display first payment due date (read-only) */}
            <div className="mb-3">
              <Label className="text-sm text-gray-600">First Payment Due Date (from system)</Label>
              <Input
                value={letterData?.loan_info?.first_payment_due_date || 'N/A'}
                disabled
                className="bg-gray-100"
              />
            </div>

            {/* Manual due dates list */}
            <div className="mb-3">
              <Label className="text-sm text-gray-600 mb-2 block">
                Additional Overdue Installment Dates
                <span className="text-xs text-gray-500 ml-2">(Optional - add multiple dates)</span>
              </Label>
              
              {/* List of manual due dates */}
              {formData.manual_due_dates.length > 0 ? (
                <div className="space-y-2 mb-3">
                  {formData.manual_due_dates.map((date, index) => (
                    <div key={index} className="flex items-center justify-between bg-white border rounded-lg p-2">
                      <div className="flex items-center space-x-2">
                        <Calendar size={16} className="text-gray-500" />
                        <span className="text-sm">{formatDateForDisplay(date)}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveDueDate(date)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 mb-3">No additional due dates added</p>
              )}

              {/* Add new due date */}
              <div className="flex items-center space-x-2">
                <Input
                  type="text"
                  placeholder="Enter date (e.g., 19 April 2026)"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddDueDate}
                  disabled={!newDueDate}
                >
                  <Plus size={16} className="mr-1" />
                  Add
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Format example: 19 April 2026, 20 May 2026. These dates will appear in the demand letter.
              </p>
            </div>
          </div>

          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Loan information like principal amount, loan date, 
              and monthly installment details cannot be edited here. Please contact admin if 
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