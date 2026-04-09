// components/ui/modal.tsx
import React from 'react';
import { X, Loader } from 'lucide-react';
import { cn } from '@/lib/utils'; // Optional utility for class merging

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  scrollBehavior?: 'inside' | 'outside'; // Choose scrolling behavior
  closeOnBackdropClick?: boolean; // New prop to control backdrop click behavior
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  isLoading = false,
  scrollBehavior = 'inside', // Default to scrolling inside modal
  closeOnBackdropClick = false, // Default to false - won't close on backdrop click
}) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if explicitly enabled and not loading
    if (closeOnBackdropClick && e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  const modalContent = (
    <div className={`bg-white rounded-card w-full ${sizeClasses[size]} mx-auto flex flex-col max-h-[90vh]`}>
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-10 rounded-card">
          <Loader className="animate-spin text-accent-600" size={32} />
        </div>
      )}
      
      {/* Modal Header - Fixed */}
      <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        <button
          onClick={onClose}
          disabled={isLoading}
          className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
        >
          <X size={24} />
        </button>
      </div>
      
      {/* Modal Content - Scrollable */}
      <div className="flex-grow overflow-y-auto p-6">
        {children}
      </div>
    </div>
  );

  if (scrollBehavior === 'outside') {
    return (
      <div 
        className="fixed inset-0 z-50 overflow-y-auto"
        onClick={handleBackdropClick}
      >
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />
          {modalContent}
        </div>
      </div>
    );
  }

  // Default: 'inside' scroll behavior
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={handleBackdropClick}
    >
      {modalContent}
    </div>
  );
};