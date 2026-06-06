'use client';

import { useRouter } from 'next/navigation';
import { getUser, clearAuth } from '@/lib/auth';
import { UserRole } from '@/types';

const roleLabel: Record<UserRole, string> = {
  [UserRole.REQUESTER]: 'Requester',
  [UserRole.MANAGER]: 'Manager',
  [UserRole.IT]: 'IT Representative',
  [UserRole.FINANCE]: 'Finance',
  [UserRole.ADMIN]: 'Admin',
};

export default function Navbar() {
  const router = useRouter();
  const user = getUser();

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      <span className="font-semibold text-gray-800">Purchase Orders</span>

      <div className="flex items-center gap-4">
        {user && (
          <div className="text-right">
            <p className="text-sm font-medium text-gray-800">{user.name || user.email}</p>
            <p className="text-xs text-gray-500">{roleLabel[user.role]}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-red-600 transition-colors"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
