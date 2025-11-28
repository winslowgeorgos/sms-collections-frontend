'use client';

import React from 'react';
import { useAuth } from '@/context/auth-context';
import { LogOut, User, Bell, Search } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex justify-between items-center px-6 py-4">
        <div className="flex-1 max-w-2xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search templates, campaigns, logs..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell size={20} />
            <span className="absolute -top-1 -right-1 bg-error-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              3
            </span>
          </button>
          
          {/* User Profile */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 text-gray-700">
              <div className="w-8 h-8 bg-accent-600 rounded-full flex items-center justify-center">
                <User size={16} className="text-white" />
              </div>
              <div className="text-left">
                <p className="font-medium text-sm">{user?.username}</p>
                <p className="text-xs text-gray-500">Admin</p>
              </div>
            </div>
            
            <button
              onClick={logout}
              className="flex items-center space-x-2 px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};