"use client";

import { useState } from "react";

export function OwnerPasswordClient() {
  const [saved, setSaved] = useState<"idle" | "done">("idle");

  return (
    <>
      <div className="dense-grid">
        <input className="app-input" placeholder="รหัสผ่านปัจจุบัน" type="password" />
        <input className="app-input" placeholder="รหัสผ่านใหม่" type="password" />
        <input className="app-input" placeholder="ยืนยันรหัสผ่านใหม่" type="password" />
      </div>
      <div className="button-row" style={{ marginTop: 12 }}>
        <button
          type="button"
          className="primary-button"
          onClick={() => setSaved("done")}
        >
          อัปเดตรหัสผ่าน
        </button>
      </div>
      <div className="interactive-hint">
        {saved === "done" ? "ตัวอย่าง UX: แสดงสถานะอัปเดตสำเร็จในฝั่ง client โดยไม่ทำ SSR ซ้ำทั้งหน้า" : "ฟอร์มนี้ถูกแยกเป็น client component เพื่อให้ interaction ไม่ดึง shell ทั้งหน้าลงฝั่ง client"}
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
      <div className="dense-grid">
        <input
          className="app-input"
          value={form.storeName}
          onChange={(event) => setForm((current) => ({ ...current, storeName: event.target.value }))}
        />
        <input
          className="app-input"
          value={form.ownerName}
          onChange={(event) => setForm((current) => ({ ...current, ownerName: event.target.value }))}
        />
      </div>
      <div className="button-row" style={{ marginTop: 12 }}>
        <button type="button" className="ghost-button" onClick={() => setForm({ storeName, ownerName })}>
          รีเซ็ต
        </button>
        <button type="button" className="primary-button" onClick={() => setSaved("saved")}>
          บันทึกข้อมูลร้าน
        </button>
      </div>
      <div className="interactive-hint">
        {saved === "saved" ? `พร้อมส่งบันทึก: ${form.storeName} / ${form.ownerName}` : "แก้ชื่อร้านและชื่อเจ้าของแบบ client-side ได้ทันที แล้วค่อยต่อ backend ภายหลัง"}
      </div>
    </>
  );
}
