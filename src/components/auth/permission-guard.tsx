// components/auth/permission-guard.tsx
'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/context/auth-context';

interface PermissionGuardProps {
  children: ReactNode;
  permissions?: string | string[];
  requireAll?: boolean;
  fallback?: ReactNode;
}

export function PermissionGuard({ 
  children, 
  permissions, 
  requireAll = false,
  fallback = null 
}: PermissionGuardProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isLoading } = useAuth();

  if (isLoading) {
    return null; // Or a loading spinner
  }

  console.log('PermissionGuard check:', { permissions, requireAll });

  if (!permissions) {
    return <>{children}</>;
  }

  const permissionArray = Array.isArray(permissions) ? permissions : [permissions];
  
  let hasAccess = false;
  if (requireAll) {
    hasAccess = hasAllPermissions(permissionArray);
  } else {
    hasAccess = hasAnyPermission(permissionArray);
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

interface RoleGuardProps {
  children: ReactNode;
  roles: string | string[];
  fallback?: ReactNode;
}

export function RoleGuard({ children, roles, fallback = null }: RoleGuardProps) {
  const { userDetails, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  const userRoles = userDetails?.user.roles.map(r => r.name) || [];
  const requiredRoles = Array.isArray(roles) ? roles : [roles];

  console.log('RoleGuard check:', { requiredRoles, userRoles });
  
  const hasRole = requiredRoles.some(role => 
    userRoles.includes(role) || userDetails?.user.role === role
  );

  console.log('RoleGuard result:', hasRole);

  return hasRole ? <>{children}</> : <>{fallback}</>;
}