'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getUser } from '@/lib/auth';
import { UserRole } from '@/types';

const approverRoles: UserRole[] = [UserRole.MANAGER, UserRole.IT, UserRole.FINANCE, UserRole.ADMIN];

const links = [
  { href: '/dashboard', label: 'Dashboard', roles: null },
  { href: '/purchase-orders', label: 'Purchase Orders', roles: null },
  { href: '/purchase-orders/new', label: 'New PO', roles: null },
  { href: '/approvals', label: 'Approvals', roles: approverRoles },
  { href: '/admin/change-role', label: 'Change Role', roles: [UserRole.ADMIN] },
  { href: '/admin/budgets', label: 'Manage Budgets', roles: [UserRole.ADMIN] },
  { href: '/profile', label: 'Profile', roles: null },
];

export default function Sidebar() {
  const pathname = usePathname();
  const user = getUser();

  const visibleLinks = links.filter(
    (link) => !link.roles || (user && link.roles.includes(user.role)),
  );

  return (
    <aside className="w-56 bg-gray-50 dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700 flex flex-col py-4 shrink-0">
      <nav className="flex flex-col gap-1 px-3">
        {visibleLinks.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium'
                  : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-slate-100'
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
