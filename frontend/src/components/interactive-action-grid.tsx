"use client";

import { useState } from "react";

type InteractiveActionGridProps = {
  items: string[];
  columns?: 2 | 3;
  initialSelected?: string | null;
};

export function InteractiveActionGrid({
  items,
  columns = 3,
  initialSelected = null,
}: InteractiveActionGridProps) {
  const [selected, setSelected] = useState<string | null>(initialSelected);

  return (
    <div className="grid gap-[10px]">
      <div className={columns === 2 ? "grid grid-cols-2 gap-[10px] max-[720px]:grid-cols-1" : "grid grid-cols-3 gap-[10px] max-[1180px]:grid-cols-2 max-[720px]:grid-cols-1"}>
        {items.map((item) => {
          const selectedClass = selected === item;

          return (
            <button
              key={item}
              type="button"
              onClick={() => setSelected(item)}
              className={
                selectedClass
                  ? "inline-flex min-h-12 items-center justify-center rounded-[10px] border border-[rgba(108,92,231,0.45)] bg-[linear-gradient(135deg,rgba(108,92,231,0.18)_0%,rgba(108,92,231,0.1)_100%)] px-[18px] font-bold text-[var(--brand-strong)] shadow-[rgba(108,92,231,0.12)_0_6px_12px] transition hover:-translate-y-px"
                  : "inline-flex min-h-12 items-center justify-center rounded-[10px] border border-[var(--border)] bg-[rgba(22,27,38,0.8)] px-[18px] font-bold text-[var(--foreground)] transition hover:-translate-y-px hover:border-[var(--border-strong)] hover:shadow-[rgba(0,0,0,0.15)_0_5px_10px]"
              }
            >
              {item}
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-dashed border-[rgba(100,120,160,0.22)] bg-[rgba(18,22,34,0.72)] px-[14px] py-3 text-[0.9rem] leading-[1.5] text-[var(--foreground-soft)]">
        {selected ? `กำลังโฟกัส: ${selected}` : "เลือก action ที่ใช้บ่อยเพื่อโฟกัสงานในจอนี้"}
      </div>
    </div>
  );
}
