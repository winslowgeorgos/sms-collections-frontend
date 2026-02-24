// components/ui/tooltip.tsx
'use client';

import React, { createContext, useContext, useState } from 'react';

interface TooltipContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const TooltipContext = createContext<TooltipContextType | undefined>(undefined);

export const TooltipProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

export const Tooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);
  return (
    <TooltipContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block">{children}</div>
    </TooltipContext.Provider>
  );
};

export const TooltipTrigger: React.FC<{ children: React.ReactNode; asChild?: boolean }> = ({
  children,
  asChild,
}) => {
  const context = useContext(TooltipContext);
  if (!context) throw new Error('TooltipTrigger must be used within Tooltip');

  const handleMouseEnter = () => context.setOpen(true);
  const handleMouseLeave = () => context.setOpen(false);

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
    });
  }

  return (
    <span onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {children}
    </span>
  );
};

export const TooltipContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const context = useContext(TooltipContext);
  if (!context) throw new Error('TooltipContent must be used within Tooltip');

  if (!context.open) return null;

  return (
    <div className="absolute z-10 px-2 py-1 text-xs text-white bg-gray-900 rounded-md whitespace-nowrap bottom-full left-1/2 transform -translate-x-1/2 mb-1 shadow-lg">
      {children}
      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
    </div>
  );
};