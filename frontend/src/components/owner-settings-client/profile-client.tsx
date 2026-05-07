"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useBackofficeShellAlert } from "@/components/backoffice-shell";
import { fetchWithCsrfRetry } from "@/lib/csrf";
import type { SubmitState } from "./shared";
import {
  activeGhostButtonClass,
  fieldLabelClass,
  inputClass,
  primaryButtonClass,
  readApiMessage,
} from "./shared";

export function OwnerProfileClient({
  storeName,
  ownerName,
  storeNamePlaceholder = "ชื่อร้าน",
  ownerNamePlaceholder = "ชื่อเจ้าของร้าน",
}: {
  storeName: string;
  ownerName: string;
  storeNamePlaceholder?: string;
  ownerNamePlaceholder?: string;
}) {
  const { setShellAlert } = useBackofficeShellAlert();
  const router = useRouter();
  const [savedForm, setSavedForm] = useState({ storeName, ownerName });
  const [form, setForm] = useState({ storeName, ownerName });
  const [submitState, setSubmitState] = useState<SubmitState>({
    status: "idle",
    message: "แก้ชื่อร้านและชื่อเจ้าของร้าน แล้วบันทึกเพื่ออัปเดต Status Store",
  });

  const pending = submitState.status === "saving";
  const normalizedForm = {
    storeName: form.storeName.trim(),
    ownerName: form.ownerName.trim(),
  };
  const normalizedSavedForm = {
    storeName: savedForm.storeName.trim(),
    ownerName: savedForm.ownerName.trim(),
  };
  const profileChanged = normalizedForm.storeName !== normalizedSavedForm.storeName || normalizedForm.ownerName !== normalizedSavedForm.ownerName;
  const canSaveProfile = profileChanged && Boolean(normalizedForm.storeName && normalizedForm.ownerName);

  function handleRevert() {
    setForm(savedForm);
    setSubmitState({
      status: "idle",
      message: "แก้ชื่อร้านและชื่อเจ้าของร้าน แล้วบันทึกเพื่ออัปเดต Status Store",
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextForm = normalizedForm;

    if (!nextForm.storeName || !nextForm.ownerName) {
      setSubmitState({ status: "error", message: "กรอกชื่อร้านและชื่อเจ้าของร้านให้ครบก่อนบันทึก" });
      setShellAlert({ message: "กรอกชื่อร้านและชื่อเจ้าของร้านให้ครบก่อนบันทึก", tone: "danger" });
      return;
    }

    if (!profileChanged) {
      return;
    }

    setSubmitState({ status: "saving", message: "กำลังบันทึกข้อมูลร้าน..." });

    try {
      const response = await fetchWithCsrfRetry("/api/auth/owner-profile", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(nextForm),
      });

      if (!response.ok) {
        const errorMessage = await readApiMessage(response, "บันทึกข้อมูลร้านไม่สำเร็จ");
        setSubmitState({ status: "error", message: errorMessage });
        setShellAlert({ message: errorMessage, tone: "danger" });
        return;
      }

      setForm(nextForm);
      setSavedForm(nextForm);
      setSubmitState({ status: "success", message: "บันทึกข้อมูลร้านแล้ว Status Store จะอัปเดตตามข้อมูลล่าสุด" });
      setShellAlert({ message: "บันทึกข้อมูลร้านแล้ว", tone: "success" });
      router.refresh();
    } catch {
      setSubmitState({ status: "error", message: "เชื่อมต่อระบบไม่ได้ กรุณาลองอีกครั้ง" });
      setShellAlert({ message: "เชื่อมต่อระบบไม่ได้ กรุณาลองอีกครั้ง", tone: "danger" });
    }
  }

  return (
    <form className="mt-2" onSubmit={handleSubmit}>
      <div className="grid gap-4 min-[1024px]:grid-cols-2 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:grid-cols-1 [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:grid-cols-1">
        <label className="grid gap-2">
          <span className={fieldLabelClass}>ชื่อร้าน</span>
          <input
            className={inputClass}
            value={form.storeName}
            placeholder={storeNamePlaceholder}
            onChange={(event) => setForm((current) => ({ ...current, storeName: event.target.value }))}
            disabled={pending}
            required
            maxLength={80}
          />
        </label>
        <label className="grid gap-2">
          <span className={fieldLabelClass}>ชื่อเจ้าของร้าน</span>
          <input
            className={inputClass}
            value={form.ownerName}
            placeholder={ownerNamePlaceholder}
            onChange={(event) => setForm((current) => ({ ...current, ownerName: event.target.value }))}
            disabled={pending}
            required
            maxLength={80}
          />
        </label>
      </div>
      <div className="mt-5 flex flex-wrap justify-start gap-3 max-[900px]:[&>*]:w-full [@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:grid [@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:grid-cols-2 [@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:[&>*]:!w-auto [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:grid [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:grid [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:grid-cols-2 [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:grid-cols-2 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:[&>*]:!w-auto [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:[&>*]:!w-auto">
        <button
          type="button"
          className={`${activeGhostButtonClass} [@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:min-h-[40px] [@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:px-3 [@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:text-[0.9rem] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:min-h-[40px] [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:min-h-[40px] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:px-3 [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:px-3 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:text-[0.9rem] [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:text-[0.9rem]`}
          onClick={handleRevert}
          disabled={pending || !profileChanged}
        >
          ย้อนกลับ
        </button>
        <button
          type="submit"
          className={`${primaryButtonClass} [@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:min-h-[40px] [@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:px-3 [@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:text-[0.9rem] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:min-h-[40px] [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:min-h-[40px] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:px-3 [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:px-3 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:text-[0.9rem] [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:text-[0.9rem]`}
          disabled={pending || !canSaveProfile}
        >
          {pending ? "กำลังบันทึก..." : "บันทึก"}
        </button>
      </div>
    </form>
  );
}


