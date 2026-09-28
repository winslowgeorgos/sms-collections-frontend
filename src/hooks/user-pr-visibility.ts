// hooks/use-pr-visibility.ts
// One place to decide which CBK PR-bucket figures the current user may see.
'use client';

import { usePermissions } from '@/context/permission-context';
import { PERMISSIONS } from '@/utils/permissions';

export interface PRVisibility {
  canViewTarget: boolean;
  canViewCommission: boolean;
  canViewPostedPRAmount: boolean;
  canViewPRBuckets: boolean;
}

/** Deny-by-default: use when permissions aren't known (e.g. plain helper functions). */
export const NO_PR_VISIBILITY: PRVisibility = {
  canViewTarget: false,
  canViewCommission: false,
  canViewPostedPRAmount: false,
  canViewPRBuckets: false,
};

export function usePRVisibility(): PRVisibility {
  const { hasAccess } = usePermissions();
  return {
    canViewTarget: hasAccess(PERMISSIONS.PR_METRICS.VIEW_TARGET),
    canViewCommission: hasAccess(PERMISSIONS.PR_METRICS.VIEW_COMMISSION),
    canViewPostedPRAmount: hasAccess(PERMISSIONS.PR_METRICS.VIEW_POSTED_PR_AMOUNT),
    canViewPRBuckets: hasAccess(PERMISSIONS.PR_METRICS.VIEW_PR_BUCKETS),
  };
}