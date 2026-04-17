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
    <div className="dense-grid">
      <div className={columns === 2 ? "dense-grid two-up" : "dense-grid three-up"}>
        {items.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setSelected(item)}
            className={selected === item ? "secondary-button quick-button is-selected" : "secondary-button quick-button"}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="interactive-hint">
        {selected ? `กำลังโฟกัส: ${selected}` : "เลือก action ที่ใช้บ่อยเพื่อโฟกัสงานในจอนี้"}
      </div>
    </div>
  );
}
