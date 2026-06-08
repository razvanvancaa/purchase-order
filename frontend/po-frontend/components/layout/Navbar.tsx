'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUser, clearAuth } from '@/lib/auth';
import { notificationsApi } from '@/lib/api';
import { Notification, UserRole } from '@/types';

const roleLabel: Record<UserRole, string> = {
  [UserRole.REQUESTER]: 'Requester',
  [UserRole.MANAGER]: 'Manager',
  [UserRole.IT]: 'IT Representative',
  [UserRole.FINANCE]: 'Finance',
  [UserRole.ADMIN]: 'Admin',
};

const LAST_READ_KEY = 'notifications_last_read';
const DARK_KEY = 'dark_mode';

export default function Navbar() {
  const router = useRouter();
  const user = getUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem(DARK_KEY) === 'true';
    setDark(stored);
    document.documentElement.classList.toggle('dark', stored);
  }, []);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem(DARK_KEY, String(next));
    document.documentElement.classList.toggle('dark', next);
  };

  const lastRead = typeof window !== 'undefined'
    ? localStorage.getItem(LAST_READ_KEY) ?? '1970-01-01'
    : '1970-01-01';

  const unread = notifications.filter((n) => n.timestamp > lastRead).length;

  useEffect(() => {
    const load = () => notificationsApi.recent().then(setNotifications).catch(() => null);
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => {
    setOpen((o) => !o);
    if (!open) localStorage.setItem(LAST_READ_KEY, new Date().toISOString());
  };

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  const actionLabel: Record<string, string> = {
    APPROVED: 'Approved',
    REJECTED: 'Sent back for rework',
    HARD_REJECTED: 'Permanently rejected',
    INVOICED: 'Invoiced',
  };

  return (
    <header className="h-14 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between px-6 shrink-0">
      <span className="font-semibold text-gray-800 dark:text-slate-100">Purchase Orders</span>

      <div className="flex items-center gap-4">
        {/* Bell icon */}
        <div ref={ref} className="relative">
          <button
            onClick={handleOpen}
            className="relative p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Notifications"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-10 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-950">Notifications</p>
              </div>
              {notifications.length === 0 ? (
                <p className="px-4 py-6 text-sm text-gray-400 text-center">No recent activity</p>
              ) : (
                <ul className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                  {notifications.map((n) => (
                    <li key={n.id}>
                      <Link
                        href={`/purchase-orders/${n.purchaseOrder.id}`}
                        className="flex flex-col gap-0.5 px-4 py-3 hover:bg-gray-50 transition-colors"
                        onClick={() => setOpen(false)}
                      >
                        <span className="text-sm font-medium text-gray-950 truncate">{n.purchaseOrder.title}</span>
                        <span className="text-xs text-gray-500">{actionLabel[n.action] ?? n.action}</span>
                        <span className="text-xs text-gray-400">{new Date(n.timestamp).toLocaleString()}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {user && (
          <div className="text-right">
            <p className="text-sm font-medium text-gray-800 dark:text-slate-100">{user.name || user.email}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400">{roleLabel[user.role]}</p>
          </div>
        )}
        <button
          onClick={toggleDark}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-gray-600 dark:text-slate-400"
          aria-label="Toggle dark mode"
          title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {dark ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
            </svg>
          )}
        </button>

        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 dark:text-slate-400 hover:text-red-600 transition-colors"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
