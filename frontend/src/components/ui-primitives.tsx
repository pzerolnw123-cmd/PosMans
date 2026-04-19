import type { ReactNode } from "react";

export const eyebrowTextClass = "m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[#6b7a94]";

export const ghostPillClass =
  "inline-flex items-center gap-2 whitespace-nowrap rounded-[10px] border border-[var(--border)] bg-[var(--surface-muted)] px-[10px] py-[6px] text-[0.78rem] font-bold text-[var(--foreground-soft)]";

export const successPillClass =
  "inline-flex items-center gap-2 whitespace-nowrap rounded-[10px] border border-[rgba(46,212,122,0.24)] bg-[var(--success-soft)] px-[10px] py-[6px] text-[0.78rem] font-bold text-[var(--success)] before:h-[7px] before:w-[7px] before:rounded-full before:bg-current before:content-['']";

export const primaryButtonClass =
  "inline-flex min-h-[42px] items-center justify-center gap-[10px] rounded-[10px] border border-transparent bg-[linear-gradient(135deg,var(--brand)_0%,#8070f0_100%)] px-[18px] font-bold text-white shadow-[rgba(108,92,231,0.18)_0_6px_14px] transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-[0.62] disabled:shadow-none";

export const secondaryButtonClass =
  "inline-flex min-h-[42px] items-center justify-center gap-[10px] rounded-[10px] border border-[var(--border)] bg-[rgba(22,27,38,0.8)] px-[18px] font-bold text-[var(--foreground)] transition hover:-translate-y-px hover:border-[var(--border-strong)] hover:shadow-[rgba(0,0,0,0.15)_0_5px_10px] disabled:cursor-not-allowed disabled:opacity-[0.62] disabled:shadow-none";

export const ghostButtonClass =
  "inline-flex min-h-[42px] items-center justify-center gap-[10px] rounded-[10px] border border-[var(--border)] bg-[rgba(22,27,38,0.8)] px-[18px] font-bold text-[var(--foreground-soft)] transition hover:-translate-y-px hover:border-[var(--border-strong)] hover:shadow-[rgba(0,0,0,0.15)_0_5px_10px] disabled:cursor-not-allowed disabled:opacity-[0.62] disabled:shadow-none";

export const dangerButtonClass =
  "inline-flex min-h-[42px] items-center justify-center gap-[10px] rounded-[10px] border border-[rgba(232,93,117,0.24)] bg-[rgba(232,93,117,0.1)] px-[18px] font-bold text-[var(--danger)] transition hover:-translate-y-px hover:border-[rgba(232,93,117,0.35)] hover:shadow-[rgba(232,93,117,0.12)_0_5px_10px] disabled:cursor-not-allowed disabled:opacity-[0.62] disabled:shadow-none";

export const inputClass =
  "h-[46px] w-full rounded-[10px] border border-[rgba(100,120,160,0.22)] bg-[rgba(14,18,28,0.7)] px-[14px] pr-[18px] text-[var(--foreground)] outline-none transition placeholder:text-[#556070] focus:border-[rgba(108,92,231,0.55)] focus:shadow-[inset_0_0_0_1px_var(--ring)]";

export const selectClass = `${inputClass} appearance-none pr-[42px]`;

export function StatusPill({
  tone = "ghost",
  children,
}: {
  tone?: "ghost" | "success";
  children: ReactNode;
}) {
  return <span className={tone === "success" ? successPillClass : ghostPillClass}>{children}</span>;
}

export function PageHeader({
  eyebrow,
  title,
  actions,
  className = "",
}: {
  eyebrow: string;
  title: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex h-[156px] min-h-[156px] max-h-[156px] items-start justify-between overflow-hidden rounded-[20px] border border-[var(--border)] bg-[rgba(22,27,38,0.85)] px-5 py-6 shadow-[var(--shadow-soft)] max-[1180px]:h-auto max-[1180px]:min-h-[156px] max-[720px]:flex-col max-[720px]:items-stretch max-[720px]:gap-4 ${className}`.trim()}
    >
      <div>
        <p className={eyebrowTextClass}>{eyebrow}</p>
        <strong className="mt-2 block text-[1.35rem] leading-none tracking-[-0.04em] text-white">{title}</strong>
      </div>
      {actions ? <div className="flex flex-none items-center gap-3 max-[720px]:w-full">{actions}</div> : null}
    </div>
  );
}

export function Loader({
  label = "กำลังโหลด",
  size = 48,
  className = "",
}: {
  label?: string;
  size?: number;
  className?: string;
}) {
  return (
    <div className={`inline-flex items-center justify-center ${className}`.trim()} role="status" aria-live="polite" aria-label={label}>
      <span
        className="app-loader"
        style={
          {
            "--loader-size": `${size}px`,
            "--loader-stroke": `${Math.max(3, Math.round(size / 10))}px`,
          } as React.CSSProperties
        }
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}
