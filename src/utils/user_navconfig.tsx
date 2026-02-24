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

// This function is for getting user details synchronously
export const getUserDetails = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const userDetailsString = localStorage.getItem('user_details');
    if (userDetailsString) {
      return JSON.parse(userDetailsString);
    }
  } catch (error) {
    console.error('Error parsing user details from localStorage:', error);
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
      const userDetailsString = localStorage.getItem('user_details');
      if (userDetailsString) {
        return JSON.parse(userDetailsString);
      }
    } catch (error) {
      console.error('Error parsing user details:', error);
    }
    
    // Wait before next attempt
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  
  console.warn('No user details found in localStorage after', maxAttempts, 'attempts');
  return null;
};

// Get current user ID synchronously
export const getCurrentUserId = (): number | null => {
  const userDetails = getUserDetails();
  return userDetails?.user?.id || null;
};