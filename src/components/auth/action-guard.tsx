// components/auth/action-guard.tsx
'use client';

import { ReactNode } from 'react';
import { usePermissions } from '@/context/permission-context';
import { PermissionRequirement } from '@/utils/permission-registry';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'; // adjust import as needed

interface ActionGuardProps {
  /** Permission requirement (single, array, or object) */
  requirement: PermissionRequirement;
  /** Content to render if allowed */
  children: ReactNode;
  /** Optional fallback content if not allowed (e.g., disabled button) */
  fallback?: ReactNode;
  /** If true, shows a tooltip with denial reason (requires fallback to be a button/disabled element) */
  showTooltip?: boolean;
  /** Tooltip message (default: "You don't have permission to perform this action") */
  tooltipMessage?: string;
}

export function ActionGuard({
  requirement,
  children,
  fallback,
  showTooltip = false,
  tooltipMessage = "You don't have permission to perform this action",
}: ActionGuardProps) {
  const { hasAccess, isLoading } = usePermissions();

  if (isLoading) {
    // Optionally return a placeholder or null
    return null;
  }

  const allowed = hasAccess(requirement);

  if (allowed) {
    return <>{children}</>;
  }

  if (fallback) {
    if (showTooltip) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>{fallback}</TooltipTrigger>
            <TooltipContent>
              <p>{tooltipMessage}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    return <>{fallback}</>;
  }

  return null;
}

/**
 * Hook to check action permission without rendering logic.
 * Useful for conditional logic inside components.
 */
export function useActionPermission(requirement: PermissionRequirement) {
  const { hasAccess, isLoading } = usePermissions();
  const allowed = hasAccess(requirement);
  return { allowed, isLoading };
}