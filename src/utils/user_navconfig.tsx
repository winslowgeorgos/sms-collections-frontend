// utils/navigation-config.tsx
import { 
  BarChart3, 
  Calendar, 
  Settings, 
  FileText, 
  PieChart, 
  LayoutGrid, 
  Users,
  Shield,
  Database,
  MessageSquare,
  ChevronRight,
  DollarSign,
  FolderOpen,
  UserCheck,
  UserPlus,
  PhoneCall,
  Clock,
  AlertCircle,
  TrendingUp,
  Award,
  ListTodo,
  Bell,
  Activity,
  Server,
  Zap,
  Eye,
  CheckSquare,
  XCircle,
  Home,
  BarChart
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { NavItemType } from '@/utils/config';
import { USER_DETAILS_KEY } from '@/lib/constants';
import { retrieveAndDecrypt } from '@/utils/sec';

// Retrieve user details asynchronously from the encrypted vault
export const getUserDetails = async (): Promise<any> => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const userDetails = await retrieveAndDecrypt<any>(USER_DETAILS_KEY);
    if (userDetails) {
      return userDetails;
    }
  } catch (error) {
    console.error('Error retrieving user details from encrypted vault:', error);
  }
  
  return null;
};

// This function is for getting user details with retry (async)
export const getUserDetailsWithRetry = async (maxAttempts = 10, delayMs = 500): Promise<any> => {
  if (typeof window === 'undefined') {
    return null;
  }

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const userDetails = await retrieveAndDecrypt<any>(USER_DETAILS_KEY);
      if (userDetails) {
        return userDetails;
      }
    } catch (error) {
      console.error('Error parsing user details:', error);
    }
    
    // Wait before next attempt
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  
  console.warn('No user details found in encrypted vault after', maxAttempts, 'attempts');
  return null;
};

// Get current user ID asynchronously
export const getCurrentUserId = async (): Promise<number | null> => {
  const userDetails = await getUserDetails();
  return userDetails?.user?.id ? Number(userDetails.user.id) : null;
};