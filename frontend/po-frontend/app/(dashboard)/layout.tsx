'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { usersApi } from '@/lib/api';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [adminContact, setAdminContact] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    usersApi.adminContact().then(setAdminContact).catch(() => null);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-slate-950">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto flex flex-col p-6 dark:bg-slate-950">
          <div className="flex-1">{children}</div>
          <footer className="mt-auto pt-3 border-t border-gray-200 dark:border-slate-700 text-center">
            <p className="text-xs text-gray-400 dark:text-slate-500">
              For any questions please contact the administrator
              {adminContact && (
                <>
                  {' — '}
                  <a
                    href={`mailto:${adminContact.email}`}
                    className="text-blue-500 hover:underline"
                  >
                    {adminContact.email}
                  </a>
                </>
              )}
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
