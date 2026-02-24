// components/auth/with-permission.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

interface WithPermissionProps {
  requiredPermissions?: string[];
  requiredRoles?: string[];
  requireAll?: boolean;
  fallbackUrl?: string;
}

export function withPermission<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: WithPermissionProps = {}
) {
  return function ProtectedComponent(props: P) {
    const {
      requiredPermissions = [],
      requiredRoles = [],
      requireAll = false,
      fallbackUrl = '/unauthorized',
    } = options;

    const { hasPermission, hasAnyPermission, hasAllPermissions, userDetails, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading) {
        // Debug logs – add a flag to disable in production if needed
          console.group('🔐 Permission Check');
          console.log('Required roles:', requiredRoles);
          console.log('Required permissions:', requiredPermissions);
          console.log('Require all:', requireAll);
          console.log('User details:', userDetails);
          if (userDetails?.user) {
            console.log('User roles:', userDetails.user.roles?.map(r => r.name));
            console.log('User permission codenames:', userDetails.user.permission_codenames);
          }
        

        let hasAccess = true;

        // Check roles first
        if (requiredRoles.length > 0) {
          const userRoles = userDetails?.user.roles.map(r => r.name) || [];
            console.log('User roles list:', userRoles);
          hasAccess = requiredRoles.some(role => 
            userRoles.includes(role) || userDetails?.user.role === role
          );
         
            console.log('Role check result:', hasAccess);
        }

        // Check permissions if no role check or role check passed
        if (hasAccess && requiredPermissions.length > 0) {
            console.log(requireAll ? 'Checking all permissions...' : 'Checking any permission...');
          if (requireAll) {
            hasAccess = hasAllPermissions(requiredPermissions);
          } else {
            hasAccess = hasAnyPermission(requiredPermissions);
          }
            console.log('Permission check result:', hasAccess);
        }

          console.log('Final access:', hasAccess);
          console.groupEnd();

        if (!hasAccess) {
          router.push(fallbackUrl);
        }
      }
    }, [isLoading, userDetails, router, requiredPermissions, requiredRoles, requireAll, fallbackUrl, hasPermission, hasAnyPermission, hasAllPermissions]);

    if (isLoading) {
      return (
        <div className="flex h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-200 border-t-accent-600" />
        </div>
      );
    }

    return <WrappedComponent {...props} />;
  };
}