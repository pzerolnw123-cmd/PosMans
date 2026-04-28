import type { ReactNode } from "react";

export function ThreeUpStats({ items }: { items: Array<[string, string]> }) {
  return (
    <div className="grid grid-cols-3 gap-[10px] max-[1280px]:grid-cols-2 max-[720px]:grid-cols-1">
      {items.map(([label, value]) => (
        <div
          key={label}
          className="rounded-[14px] border border-[var(--border)] [background:var(--panel-elevated)] p-[14px]"
        >
          <span className="text-[0.9rem] text-[var(--foreground-soft)]">{label}</span>
          <strong className="mt-[6px] block text-[1.28rem] leading-[1.05] tracking-[-0.04em]">{value}</strong>
        </div>
      ))}
    </div>
  );
}

export function NoteStack({ items }: { items: string[] }) {
  return (
    <div className="grid gap-[10px]">
      {items.map((item) => (
        <div
          key={item}
          className="rounded-[14px] border border-[var(--border)] [background:var(--panel-elevated)] px-4 py-[14px] leading-[1.5] text-[0.9rem] text-[var(--foreground-soft)]"
        >
          {item}
        </div>
      ))}
    </div>
  );
}

export function ListStack({ items }: { items: Array<{ title: string; subtitle: string; value: ReactNode }> }) {
  return (
    <div className="grid gap-[10px]">
      {items.map((item) => (
        <div
          key={`${item.title}-${item.subtitle}`}
          className="flex items-center justify-between gap-[14px] rounded-[14px] border border-[var(--border)] [background:var(--panel-elevated)] px-4 py-[14px] max-[640px]:flex-col max-[640px]:items-start"
        >
          <div>
            <strong className="block text-[1.28rem] leading-[1.05] tracking-[-0.04em]">{item.title}</strong>
            <p className="mt-[6px] text-[0.9rem] text-[var(--foreground-soft)]">{item.subtitle}</p>
          </div>
          <span className="text-[0.92rem] font-bold text-[var(--foreground)] max-[640px]:text-left">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
