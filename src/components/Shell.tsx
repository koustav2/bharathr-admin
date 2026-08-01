'use client';

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { session } from '@/lib/api';

// Portal shell: navy sidebar with role-gated nav + top bar. Client-side auth
// gate — no token → /login.

type NavItem = { label: string; href: string; staff?: boolean; anyAdmin?: boolean };

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: 'Overview',
    items: [{ label: 'Dashboard', href: '/dashboard' }],
  },
  {
    section: 'People',
    items: [
      { label: 'Employees', href: '/employees', staff: true },
      { label: 'Onboarding review', href: '/onboarding', staff: true },
      { label: 'Resignations', href: '/resignations', staff: true },
      { label: 'My approvals', href: '/approvals' },
    ],
  },
  {
    section: 'Payroll',
    items: [
      { label: 'Payroll run', href: '/payroll', staff: true },
      { label: 'Salary template', href: '/payroll/template', staff: true },
    ],
  },
  {
    section: 'Workplace',
    items: [
      { label: 'Support desk', href: '/support', staff: true },
      { label: 'Policies', href: '/policies', staff: true },
      { label: 'Banners', href: '/banners', staff: true },
      { label: 'Holidays', href: '/holidays', staff: true },
      { label: 'Leave settings', href: '/leave-settings', staff: true },
    ],
  },
  {
    section: 'System',
    items: [
      { label: 'Users & roles', href: '/users', anyAdmin: true },
      { label: 'Approver matrix', href: '/matrix', staff: true },
      { label: 'Audit log', href: '/audit', anyAdmin: true },
      { label: 'Reports & exports', href: '/reports', staff: true },
    ],
  },
];

export default function Shell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!session.token) {
      router.replace('/login');
      return;
    }
    if (session.user?.mustChangePassword) {
      router.replace('/change-password');
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) return null;
  const user = session.user;
  const isStaff = session.isStaff;
  const isAnyAdmin = session.isAnyAdmin;

  const visible = NAV.map((s) => ({
    ...s,
    items: s.items.filter((i) => (i.staff ? isStaff : i.anyAdmin ? isAnyAdmin : true)),
  })).filter((s) => s.items.length > 0);

  function logout() {
    session.clear();
    router.replace('/login');
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 w-60 overflow-y-auto bg-navy text-white">
        <div className="border-b border-white/10 px-5 py-5">
          <div className="text-lg font-bold">Bharat<span className="text-herb">HR</span></div>
          <div className="mt-0.5 text-xs text-white/60">Admin portal</div>
        </div>
        <nav className="px-3 py-4">
          {visible.map((s) => (
            <div key={s.section} className="mb-4">
              <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-white/40">{s.section}</div>
              {s.items.map((i) => {
                const active = pathname?.startsWith(i.href);
                return (
                  <Link
                    key={i.href}
                    href={i.href}
                    className={`block rounded-lg px-3 py-2 text-sm ${
                      active ? 'bg-herb font-semibold text-white' : 'text-white/80 hover:bg-white/10'
                    }`}
                  >
                    {i.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>
      <div className="ml-60 flex-1">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <div className="text-sm text-slate-500">Bharat Herbs — HR platform</div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-semibold text-navy">{user?.name || user?.email}</div>
              <div className="text-xs text-slate-500">{user?.role?.replace('_', ' ')}</div>
            </div>
            <Link href="/change-password" className="text-xs text-slate-500 hover:text-navy">Password</Link>
            <button onClick={logout} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">
              Logout
            </button>
          </div>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
