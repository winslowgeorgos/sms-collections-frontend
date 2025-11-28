// components/ui/button.tsx
import { CSSProperties } from 'react';

interface ButtonProps {
  children?: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  className?: string;
  loading?: boolean;
}

export function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  size = "md",
  disabled = false,
  className = "",
  loading = false,
}: ButtonProps) {
  // Base styles
  const baseStyles: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 500,
    borderRadius: '0.5rem',
    transition: 'all 0.2s ease-in-out',
    outline: 'none',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    lineHeight: 1.5,
  };

  // Variant styles
  const variantStyles: Record<string, CSSProperties> = {
    primary: {
      backgroundColor: 'var(--accent-600, #2563eb)',
      color: 'white',
    },
    secondary: {
      backgroundColor: 'var(--gray-600, #4b5563)',
      color: 'white',
    },
    outline: {
      backgroundColor: 'white',
      color: 'var(--gray-700, #374151)',
      border: '1px solid var(--gray-300, #d1d5db)',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: 'var(--gray-700, #374151)',
    },
    danger: {
      backgroundColor: 'var(--error-600, #dc2626)',
      color: 'white',
    },
  };

  // Size styles
  const sizeStyles: Record<string, CSSProperties> = {
    sm: {
      padding: '0.375rem 0.75rem',
      fontSize: '0.875rem',
    },
    md: {
      padding: '0.5rem 1rem',
      fontSize: '0.875rem',
    },
    lg: {
      padding: '0.75rem 1.5rem',
      fontSize: '1rem',
    },
  };

  // State styles
  const getStateStyles = (): CSSProperties => {
    if (disabled || loading) {
      return {
        opacity: 0.5,
        cursor: 'not-allowed',
      };
    }
    if (loading) {
      return {
        cursor: 'wait',
      };
    }
    return {};
  };

  // Hover styles (for non-disabled buttons)
  const getHoverStyles = (): CSSProperties => {
    if (disabled || loading) return {};
    
    const hoverStyles: Record<string, CSSProperties> = {
      primary: { backgroundColor: 'var(--accent-700, #1d4ed8)' },
      secondary: { backgroundColor: 'var(--gray-700, #374151)' },
      outline: { backgroundColor: 'var(--gray-50, #f9fafb)' },
      ghost: { backgroundColor: 'var(--gray-100, #f3f4f6)' },
      danger: { backgroundColor: 'var(--error-700, #b91c1c)' },
    };
    
    return hoverStyles[variant] || {};
  };

  // Focus styles
  const focusStyles: CSSProperties = {
    boxShadow: '0 0 0 2px var(--ring-color, #3b82f6), 0 0 0 4px rgba(59, 130, 246, 0.1)',
  };

  // Loading spinner styles
  const spinnerStyles: CSSProperties = {
    animation: 'spin 1s linear infinite',
    marginRight: '0.5rem',
  };

  const spinnerCircleStyles: CSSProperties = {
    opacity: 0.25,
    stroke: 'currentColor',
    strokeWidth: 4,
  };

  const spinnerPathStyles: CSSProperties = {
    opacity: 0.75,
    fill: 'currentColor',
  };

  // Combine all styles
  const combinedStyles: CSSProperties = {
    ...baseStyles,
    ...variantStyles[variant],
    ...sizeStyles[size],
    ...getStateStyles(),
  };

  // Handle mouse events for hover effects
  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return;
    const hoverStyle = getHoverStyles();
    Object.assign(e.currentTarget.style, hoverStyle);
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return;
    Object.assign(e.currentTarget.style, variantStyles[variant]);
  };

  const handleFocus = (e: React.FocusEvent<HTMLButtonElement>) => {
    Object.assign(e.currentTarget.style, focusStyles);
  };

  const handleBlur = (e: React.FocusEvent<HTMLButtonElement>) => {
    e.currentTarget.style.boxShadow = 'none';
  };

  return (
    <>
      {/* Inline styles for animations */}
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
      
      <button
        type={type}
        onClick={onClick}
        disabled={disabled || loading}
        style={combinedStyles}
        className={className}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
      >
        {loading ? (
          <>
            <svg
              style={spinnerStyles}
              width="16"
              height="16"
              viewBox="0 0 24 24"
            >
              <circle
                style={spinnerCircleStyles}
                cx="12"
                cy="12"
                r="10"
              />
              <path
                style={spinnerPathStyles}
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Loading...
          </>
        ) : (
          children
        )}
      </button>
    </>
  );
}

// CSS Variables definition component (optional - can be placed in your global CSS)
export function ButtonStyles() {
  return (
    <style>
      {`
        :root {
          /* Accent colors */
          --accent-50: #eff6ff;
          --accent-500: #3b82f6;
          --accent-600: #2563eb;
          --accent-700: #1d4ed8;
          
          /* Gray colors */
          --gray-50: #f9fafb;
          --gray-100: #f3f4f6;
          --gray-300: #d1d5db;
          --gray-500: #6b7280;
          --gray-600: #4b5563;
          --gray-700: #374151;
          
          /* Error colors */
          --error-500: #ef4444;
          --error-600: #dc2626;
          --error-700: #b91c1c;
          
          /* Ring colors for focus states */
          --ring-color: var(--accent-500, #3b82f6);
        }
      `}
    </style>
  );
}