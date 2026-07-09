// components/ui/modal.tsx
import React from 'react';
import { X, Loader } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string | React.ReactNode; // ✅ Allow string or ReactNode
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  scrollBehavior?: 'inside' | 'outside';
  closeOnBackdropClick?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  isLoading = false,
  scrollBehavior = 'inside',
  closeOnBackdropClick = false,
}) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnBackdropClick && e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  const modalContent = (
    <div className={`bg-white rounded-lg w-full ${sizeClasses[size]} mx-auto flex flex-col max-h-[90vh] relative shadow-xl`}>
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-10 rounded-lg">
          <Loader className="animate-spin text-blue-600" size={32} />
        </div>
      )}
      
      {/* Modal Header - Fixed */}
      <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-gray-200">
        <div className="text-xl font-semibold text-gray-900">
          {title}
        </div>
        <button
          onClick={onClose}
          disabled={isLoading}
          className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 p-1 rounded-lg hover:bg-gray-100"
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