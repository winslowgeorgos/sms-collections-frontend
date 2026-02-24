// context/permission-context.tsx
'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { useAuth } from './auth-context';

interface PermissionContextType {
  // Unified check: directly checks against raw permission codenames
  hasAccess: (
    requirement: string | string[] | { permissions: string | string[]; requireAll?: boolean },
  ) => boolean;

  // Original methods (kept for backward compatibility)
  hasPermission: (codename: string) => boolean;
  hasAnyPermission: (codenames: string[]) => boolean;
  hasAllPermissions: (codenames: string[]) => boolean;
  hasRole: (role: string | string[]) => boolean;

  // Raw permission set (from all_permissions)
  permissionSet: Set<string>;

  // Loading state
  isLoading: boolean;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export const PermissionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    userDetails,
    hasPermission: authHasPermission,
    hasAnyPermission: authHasAnyPermission,
    hasAllPermissions: authHasAllPermissions,
    isLoading,
  } = useAuth();

  // Build the set of raw permission codenames from all_permissions
  const permissionSet = useMemo(() => {
    if (!userDetails?.user.all_permissions) return new Set<string>();
    return new Set(userDetails.user.all_permissions.map(p => p.codename));
  }, [userDetails]);

  const isSuperuser = userDetails?.user.is_superuser || false;

  // Direct permission check – no mapping, no permission_checks
  const hasAccess = (
    requirement: string | string[] | { permissions: string | string[]; requireAll?: boolean },
  ): boolean => {
    // Normalize input
    let permissions: string[] = [];
    let requireAll = false;

    if (typeof requirement === 'string') {
      permissions = [requirement];
    } else if (Array.isArray(requirement)) {
      permissions = requirement;
    } else {
      const perms = requirement.permissions;
      permissions = Array.isArray(perms) ? perms : [perms];
      requireAll = requirement.requireAll ?? false;
    }

    // Single permission check – raw set membership
    const checkOne = (codename: string): boolean => {
      // Superuser has everything
      if (isSuperuser) return true;
      return permissionSet.has(codename);
    };

    return requireAll
      ? permissions.every(checkOne)
      : permissions.some(checkOne);
  };

  // Role check (unchanged)
  const hasRole = (role: string | string[]): boolean => {
    if (!userDetails?.user.roles) return false;

    const userRoles = userDetails.user.roles.map(r => r.name);
    const rolesToCheck = Array.isArray(role) ? role : [role];

    if (isSuperuser) return true;

    return rolesToCheck.some(r => userRoles.includes(r) || userDetails.user.role === r);
  };

  const value: PermissionContextType = {
    hasAccess,
    hasPermission: authHasPermission,
    hasAnyPermission: authHasAnyPermission,
    hasAllPermissions: authHasAllPermissions,
    hasRole,
    permissionSet,
    isLoading,
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermissions = () => {
  const context = useContext(PermissionContext);
  if (!context) throw new Error('usePermissions must be used within PermissionProvider');
  return context;
};