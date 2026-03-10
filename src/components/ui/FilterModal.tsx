// components/ui/FilterModal.tsx
'use client'
import React, { useState, useEffect } from 'react';
import { X, Filter } from 'lucide-react';

interface FilterField {
  id: string;
  label: string;
  type: 'text' | 'select' | 'range' | 'date_range';
  placeholder?: string;
  options?: { value: string; label: string }[];
  minField?: string;
  maxField?: string;
  startField?: string;
  endField?: string;
}

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: any) => void;
  onClear: () => void;
  fields: FilterField[];
  initialFilters: any;
}

export default function FilterModal({
  isOpen,
  onClose,
  onApply,
  onClear,
  fields,
  initialFilters
}: FilterModalProps) {
  const [filters, setFilters] = useState<any>({});

  useEffect(() => {
    setFilters(initialFilters || {});
  }, [initialFilters, isOpen]);

  if (!isOpen) return null;

  const handleChange = (key: string, value: string) => {
    setFilters((prev: any) => ({
      ...prev,
      [key]: value
    }));
  };

  const handleRangeChange = (minField: string, maxField: string, min: string, max: string) => {
    setFilters((prev: any) => ({
      ...prev,
      [minField]: min,
      [maxField]: max
    }));
  };

  const handleDateRangeChange = (startField: string, endField: string, start: string, end: string) => {
    setFilters((prev: any) => ({
      ...prev,
      [startField]: start,
      [endField]: end
    }));
  };

  const handleApply = () => {
    // Remove empty values before applying
    const cleanedFilters = Object.entries(filters).reduce((acc: any, [key, value]) => {
      if (value && value !== '') {
        acc[key] = value;
      }
      return acc;
    }, {});
    onApply(cleanedFilters);
  };

  const handleClear = () => {
    setFilters({});
    onClear();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />

        <div className="inline-block w-full max-w-2xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <Filter size={20} className="text-gray-500 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Filter Loans</h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-6">
              {fields.map((field) => {
                if (field.type === 'text') {
                  return (
                    <div key={field.id}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {field.label}
                      </label>
                      <input
                        type="text"
                        value={filters[field.id] || ''}
                        onChange={(e) => handleChange(field.id, e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  );
                }

                if (field.type === 'select' && field.options) {
                  return (
                    <div key={field.id}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {field.label}
                      </label>
                      <select
                        value={filters[field.id] || ''}
                        onChange={(e) => handleChange(field.id, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {field.options.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                }

                if (field.type === 'range' && field.minField && field.maxField) {
                  return (
                    <div key={field.id}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {field.label}
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="number"
                          value={filters[field.minField!] || ''}
                          onChange={(e) => handleRangeChange(
                            field.minField!,
                            field.maxField!,
                            e.target.value,
                            filters[field.maxField!] || ''
                          )}
                          placeholder={`Min ${field.placeholder}`}
                          className="w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="number"
                          value={filters[field.maxField!] || ''}
                          onChange={(e) => handleRangeChange(
                            field.minField!,
                            field.maxField!,
                            filters[field.minField!] || '',
                            e.target.value
                          )}
                          placeholder={`Max ${field.placeholder}`}
                          className="w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  );
                }

                if (field.type === 'date_range' && field.startField && field.endField) {
                  return (
                    <div key={field.id}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {field.label}
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="date"
                          value={filters[field.startField!] || ''}
                          onChange={(e) => handleDateRangeChange(
                            field.startField!,
                            field.endField!,
                            e.target.value,
                            filters[field.endField!] || ''
                          )}
                          className="w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="date"
                          value={filters[field.endField!] || ''}
                          onChange={(e) => handleDateRangeChange(
                            field.startField!,
                            field.endField!,
                            filters[field.startField!] || '',
                            e.target.value
                          )}
                          className="w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  );
                }

                return null;
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 px-6 py-4 border-t border-gray-200">
            <button
              onClick={handleClear}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Clear All
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}