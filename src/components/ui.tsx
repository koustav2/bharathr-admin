'use client';

import { ReactNode } from 'react';

// Shared UI primitives for the portal — keep every page visually consistent.

export function Card({ title, actions, children, className = '' }: {
  title?: string; actions?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          {title && <h2 className="text-sm font-semibold text-navy">{title}</h2>}
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

const CHIP_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-herb-soft text-herb-dark',
  ACTIVE: 'bg-herb-soft text-herb-dark',
  PUBLISHED: 'bg-herb-soft text-herb-dark',
  RESOLVED: 'bg-herb-soft text-herb-dark',
  PRESENT: 'bg-herb-soft text-herb-dark',
  COMPLETE: 'bg-herb-soft text-herb-dark',
  REJECTED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-slate-100 text-slate-600',
  WITHDRAWN: 'bg-slate-100 text-slate-600',
  INACTIVE: 'bg-slate-100 text-slate-600',
  DRAFT: 'bg-sky-100 text-sky-700',
  BYPASSED: 'bg-slate-100 text-slate-500',
  WAITING: 'bg-slate-100 text-slate-500',
};

export function Chip({ label }: { label?: string | null }) {
  if (!label) return null;
  const cls = CHIP_COLORS[label.toUpperCase()] || 'bg-slate-100 text-slate-600';
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>;
}

export function Button({ children, onClick, variant = 'primary', disabled, type = 'button', className = '' }: {
  children: ReactNode; onClick?: () => void; disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; type?: 'button' | 'submit'; className?: string;
}) {
  const styles = {
    primary: 'bg-herb text-white hover:bg-herb-dark disabled:bg-slate-300',
    secondary: 'bg-navy text-white hover:bg-navy-light disabled:bg-slate-300',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-slate-300',
    ghost: 'bg-transparent text-navy hover:bg-slate-100 border border-slate-200',
  }[variant];
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${styles} ${className}`}>
      {children}
    </button>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

export const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-herb focus:outline-none focus:ring-1 focus:ring-herb bg-white';

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className || ''}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputCls} ${props.className || ''}`} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputCls} ${props.className || ''}`} />;
}

export function Table({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            {headers.map((h) => (
              <th key={h} className="px-3 py-2 font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <td className={`px-3 py-2 align-top ${className}`}>{children}</td>;
}

export function Modal({ title, onClose, children, wide }: {
  title: string; onClose: () => void; children: ReactNode; wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4" onClick={onClose}>
      <div
        className={`max-h-[90vh] w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} overflow-y-auto rounded-xl bg-white p-6 shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-navy">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Loading() {
  return <div className="py-10 text-center text-sm text-slate-500">Loading…</div>;
}

export function ErrorText({ error }: { error?: string | null }) {
  if (!error) return null;
  return <p className="my-2 text-sm font-medium text-red-600">{error}</p>;
}

export function Empty({ message }: { message: string }) {
  return <div className="py-10 text-center text-sm text-slate-500">{message}</div>;
}

export function StatTile({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? 'border-herb bg-herb-soft' : 'border-slate-200 bg-white'}`}>
      <div className="text-2xl font-bold text-navy">{value}</div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}

export function Tabs({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {tabs.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
            active === t ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
