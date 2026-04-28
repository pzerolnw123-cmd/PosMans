import type { ReactNode } from "react";

export const eyebrowTextClass = "m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[var(--eyebrow)]";

export const ghostPillClass =
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-[8px] border border-[var(--border)] bg-[var(--surface-muted)] px-[8px] py-[2.5px] text-[0.7rem] font-bold text-[var(--foreground-soft)]";

export const successPillClass =
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-[8px] border border-[var(--success-border)] bg-[var(--success-soft)] px-[8px] py-[2.5px] text-[0.7rem] font-bold text-[var(--success)]";

export const primaryButtonClass =
  "inline-flex min-h-[42px] items-center justify-center gap-[10px] rounded-[10px] border border-transparent [background:var(--brand-gradient)] px-[18px] font-bold text-[var(--button-text)] shadow-[var(--brand-shadow)_0_6px_14px] transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-[0.62] disabled:shadow-none";

export const secondaryButtonClass =
  "inline-flex min-h-[42px] items-center justify-center gap-[10px] rounded-[10px] border border-[var(--border)] bg-[var(--surface-muted)] px-[18px] font-bold text-[var(--foreground)] transition hover:-translate-y-px hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-hover)] disabled:cursor-not-allowed disabled:opacity-[0.62] disabled:shadow-none";

export const ghostButtonClass =
  "inline-flex min-h-[42px] items-center justify-center gap-[10px] rounded-[10px] border border-[var(--border)] bg-[var(--surface-muted)] px-[18px] font-bold text-[var(--foreground-soft)] transition hover:-translate-y-px hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-hover)] disabled:cursor-not-allowed disabled:opacity-[0.62] disabled:shadow-none";

export const dangerButtonClass =
  "inline-flex min-h-[42px] items-center justify-center gap-[10px] rounded-[10px] border border-[color-mix(in_srgb,var(--danger)_24%,transparent)] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] px-[18px] font-bold text-[var(--danger)] transition hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--danger)_35%,transparent)] hover:shadow-[0_5px_10px_color-mix(in_srgb,var(--danger)_12%,transparent)] disabled:cursor-not-allowed disabled:opacity-[0.62] disabled:shadow-none";

export const successButtonClass =
  "inline-flex min-h-[42px] items-center justify-center gap-[10px] rounded-[10px] border border-[color-mix(in_srgb,var(--success)_24%,transparent)] bg-[color-mix(in_srgb,var(--success)_10%,transparent)] px-[18px] font-bold text-[var(--success)] transition hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--success)_35%,transparent)] hover:shadow-[0_5px_10px_color-mix(in_srgb,var(--success)_12%,transparent)] disabled:cursor-not-allowed disabled:opacity-[0.62] disabled:shadow-none";

export const whiteButtonClass =
  "inline-flex min-h-[42px] items-center justify-center gap-[10px] rounded-[10px] border border-[var(--border)] bg-[var(--panel-subtle)] px-[18px] font-bold text-[var(--foreground)] transition hover:-translate-y-px hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)] hover:shadow-[var(--shadow-hover-subtle)] disabled:cursor-not-allowed disabled:opacity-[0.62] disabled:shadow-none";

export const inputClass =
  "h-[46px] w-full rounded-[10px] border border-[var(--border-field)] bg-[var(--field-bg)] px-[14px] pr-[18px] text-[var(--foreground)] outline-none transition placeholder:text-[var(--field-placeholder)] focus:border-[var(--brand-strong)] focus:shadow-[inset_0_0_0_1px_var(--ring)]";

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
  description,
  actions,
  className = "",
}: {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex h-[156px] min-h-[156px] max-h-[156px] items-start justify-between overflow-hidden rounded-none border border-[var(--border)] bg-[var(--surface)] px-5 py-6 shadow-[var(--shadow-soft)] max-[1180px]:h-auto max-[1180px]:min-h-0 max-[1024px]:px-4 max-[1024px]:py-5 max-[820px]:px-4 max-[820px]:py-5 max-[720px]:flex-col max-[720px]:items-stretch max-[720px]:gap-4 max-[640px]:px-3.5 max-[640px]:py-4 ${className}`.trim()}
    >
      <div>
        <p className={eyebrowTextClass}>{eyebrow}</p>
        <strong className="mt-2 block text-[clamp(1.8rem,3vw,2.4rem)] leading-none tracking-[-0.06em] text-[var(--foreground)] max-[1024px]:text-[1.7rem] max-[640px]:text-[1.55rem]">{title}</strong>
        {description ? <p className="mt-3 m-0 text-[0.95rem] leading-[1.6] text-[var(--foreground-soft)] max-w-[600px] max-[640px]:text-[0.9rem]">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-none flex-wrap items-center justify-end gap-3 max-[720px]:w-full max-[720px]:justify-stretch">{actions}</div> : null}
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

