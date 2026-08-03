/* eslint-disable @next/next/no-img-element */
// BharatHR logo: the real Bharat Herbs Co. brand mark (served from /bharat-logo.png).

export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <img
      src="/bharat-logo.png"
      alt="Bharat Herbs"
      width={size}
      height={size}
      className="rounded-lg bg-white object-contain"
      style={{ width: size, height: size }}
    />
  );
}

/** Mark + wordmark lockup. `onDark` uses white text (navy sidebar / login). */
export function Logo({ size = 40, onDark = false, subtitle }: { size?: number; onDark?: boolean; subtitle?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark size={size} />
      <div className="leading-tight">
        <div className={`text-lg font-bold ${onDark ? 'text-white' : 'text-navy'}`}>
          Bharat<span className="text-herb">HR</span>
        </div>
        {subtitle && <div className={`text-xs ${onDark ? 'text-white/60' : 'text-slate-500'}`}>{subtitle}</div>}
      </div>
    </div>
  );
}
