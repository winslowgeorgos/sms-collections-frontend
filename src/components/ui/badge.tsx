// components/base/badges/badges.tsx
import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
  variant?: "modern" | "classic" | "outline" | "success" | "error" | "warning" | "secondary";
  className?: string;
}

export function Badge({ 
  children, 
  size = "md", 
  variant = "modern", 
  className 
}: BadgeProps) {
  const sizeClasses = {
    sm: "px-1.5 py-0.5 text-xs",
    md: "px-2 py-1 text-sm",
    lg: "px-3 py-1.5 text-base"
  };

  const variantClasses = {
    modern: "bg-blue-100 text-blue-800 border border-blue-200",
    classic: "bg-gray-100 text-gray-800 border border-gray-200",
    outline: "border border-gray-300 text-gray-700 bg-transparent",
    success: "bg-green-100 text-green-800 border border-green-200",
    error: "bg-red-100 text-red-800 border border-red-200",
    warning: "bg-yellow-100 text-yellow-800 border border-yellow-200",
    secondary: "bg-gray-100 text-gray-600 border border-gray-200"
  };

  return (
    <span
    id = "name"
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        sizeClasses[size],
        variantClasses[variant],
        
        className
      )}
    >
      {children}
    </span>
  );
}