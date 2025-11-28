// components/ui/FormInput.tsx
import React from 'react';

interface FormInputProps {
  label: string;
  name: string;
  type?: 'text' | 'number' | 'email' | 'password' | 'date' | 'datetime-local' | 'textarea' | 'select' | 'file';
  value: any;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  disabled?: boolean;
  rows?: number;
}

export const FormInput: React.FC<FormInputProps> = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  required = false,
  placeholder,
  options = [],
  disabled = false,
  rows = 3,
}) => {
  const inputClass = `w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 ${
    error ? 'border-error-500' : 'border-gray-300'
  } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`;

  return (
    <div className="mb-4">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-error-500">*</span>}
      </label>
      
      {type === 'textarea' ? (
        <textarea
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          rows={rows}
          placeholder={placeholder}
          disabled={disabled}
          className={inputClass}
        />
      ) : type === 'select' ? (
        <select
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={inputClass}
        >
          <option value="">Select {label}</option>
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : type === 'file' ? (
        <input
          id={name}
          name={name}
          type="file"
          onChange={onChange}
          disabled={disabled}
          className={inputClass}
          accept={name === 'customer_file' ? '.csv,.xlsx,.xls' : undefined}
        />
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={inputClass}
        />
      )}
      
      {error && (
        <p className="mt-1 text-sm text-error-500">{error}</p>
      )}
    </div>
  );
};