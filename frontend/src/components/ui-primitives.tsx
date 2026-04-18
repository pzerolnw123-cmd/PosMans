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
  "h-[46px] w-full rounded-[10px] border border-[rgba(100,120,160,0.22)] bg-[rgba(14,18,28,0.7)] px-[14px] text-[var(--foreground)] outline-none transition placeholder:text-[#556070] focus:border-[rgba(108,92,231,0.5)] focus:shadow-[0_0_0_4px_var(--ring)]";

export function StatusPill({
  tone = "ghost",
  children,
}: {
  tone?: "ghost" | "success";
  children: ReactNode;
}) {
  return <span className={tone === "success" ? successPillClass : ghostPillClass}>{children}</span>;
}
