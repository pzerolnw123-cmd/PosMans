"use client";

import { useState } from "react";

const inputClass =
  "h-[46px] w-full rounded-[10px] border border-[rgba(100,120,160,0.22)] bg-[rgba(14,18,28,0.7)] px-[14px] text-[var(--foreground)] outline-none transition placeholder:text-[#556070] focus:border-[rgba(108,92,231,0.5)] focus:shadow-[0_0_0_4px_var(--ring)]";

const primaryButtonClass =
  "inline-flex min-h-[42px] items-center justify-center gap-[10px] rounded-[10px] border border-transparent bg-[linear-gradient(135deg,var(--brand)_0%,#8070f0_100%)] px-[18px] font-bold text-white shadow-[rgba(108,92,231,0.18)_0_6px_14px] transition hover:-translate-y-px";

const ghostButtonClass =
  "inline-flex min-h-[42px] items-center justify-center gap-[10px] rounded-[10px] border border-[var(--border)] bg-[rgba(22,27,38,0.8)] px-[18px] font-bold text-[var(--foreground-soft)] transition hover:-translate-y-px hover:border-[var(--border-strong)] hover:shadow-[rgba(0,0,0,0.15)_0_5px_10px]";

const hintClass =
  "rounded-xl border border-dashed border-[rgba(100,120,160,0.22)] bg-[rgba(18,22,34,0.72)] px-[14px] py-3 text-[0.9rem] leading-[1.5] text-[var(--foreground-soft)]";

export function OwnerPasswordClient() {
  const [saved, setSaved] = useState<"idle" | "done">("idle");

  return (
    <>
      <div className="grid gap-[10px]">
        <input className={inputClass} placeholder="รหัสผ่านปัจจุบัน" type="password" />
        <input className={inputClass} placeholder="รหัสผ่านใหม่" type="password" />
        <input className={inputClass} placeholder="ยืนยันรหัสผ่านใหม่" type="password" />
      </div>
      <div className="mt-3 flex flex-wrap justify-end gap-[10px] max-[720px]:[&>*]:w-full">
        <button type="button" className={primaryButtonClass} onClick={() => setSaved("done")}>
          อัปเดตรหัสผ่าน
        </button>
      </div>
      <div className={hintClass}>
        {saved === "done"
          ? "ตัวอย่าง UX: แสดงสถานะอัปเดตสำเร็จในฝั่ง client โดยไม่ทำ SSR ซ้ำทั้งหน้า"
          : "ฟอร์มนี้ถูกแยกเป็น client component เพื่อให้ interaction ไม่ดึง shell ทั้งหน้าลงฝั่ง client"}
      </div>
    </>
  );
}

export function OwnerProfileClient({
  storeName,
  ownerName,
}: {
  storeName: string;
  ownerName: string;
}) {
  const [form, setForm] = useState({ storeName, ownerName });
  const [saved, setSaved] = useState<"idle" | "saved">("idle");

  return (
    <>
      <div className="grid gap-[10px]">
        <input
          className={inputClass}
          value={form.storeName}
          onChange={(event) => setForm((current) => ({ ...current, storeName: event.target.value }))}
        />
        <input
          className={inputClass}
          value={form.ownerName}
          onChange={(event) => setForm((current) => ({ ...current, ownerName: event.target.value }))}
        />
      </div>
      <div className="mt-3 flex flex-wrap justify-end gap-[10px] max-[720px]:[&>*]:w-full">
        <button type="button" className={ghostButtonClass} onClick={() => setForm({ storeName, ownerName })}>
          รีเซ็ต
        </button>
        <button type="button" className={primaryButtonClass} onClick={() => setSaved("saved")}>
          บันทึกข้อมูลร้าน
        </button>
      </div>
      <div className={hintClass}>
        {saved === "saved"
          ? `พร้อมส่งบันทึก: ${form.storeName} / ${form.ownerName}`
          : "แก้ชื่อร้านและชื่อเจ้าของแบบ client-side ได้ทันที แล้วค่อยต่อ backend ภายหลัง"}
      </div>
    </>
  );
}
