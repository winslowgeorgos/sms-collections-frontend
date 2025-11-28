// components/base/avatar/avatar.tsx
import { cn } from "@/lib/utils";
import Image from "next/image";

interface AvatarProps {
  src?: string;
  alt?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  fallback?: string;
}

export function Avatar({ 
  src, 
  alt = "Avatar", 
  size = "md", 
  className,
  fallback = "U" 
}: AvatarProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-12 w-12"
  };

  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base"
  };

  if (src) {
    return (
      <div className={cn(
        "relative rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700",
        sizeClasses[size],
        className
      )}>
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div className={cn(
      "flex items-center justify-center rounded-full bg-gradient-to-br from-gray-400 to-gray-600 text-white font-medium",
      sizeClasses[size],
      textSizes[size],
      className
    )}>
      {fallback}
    </div>
  );
}