"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useBackofficeShellAlert } from "@/components/backoffice-shell";
import { fetchWithCsrfRetry } from "@/lib/csrf";
import type { SubmitState } from "./shared";
import {
  fieldLabelClass,
  passwordInputClass,
  passwordInputWrapClass,
  passwordToggleClass,
  primaryButtonClass,
  readApiMessage,
} from "./shared";

// ── EyeIcon ──────────────────────────────────────────────────────────────────

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none">
      <path
        d="M3.5 12s3-5.5 8.5-5.5 8.5 5.5 8.5 5.5-3 5.5-8.5 5.5S3.5 12 3.5 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 14.6a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {!open ? <path d="M5 19 19 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /> : null}
    </svg>
  );
}

// ── PasswordField ────────────────────────────────────────────────────────────

function PasswordField({
  label,
  placeholder,
  autoComplete,
  value,
  visible,
  disabled,
  onChange,
  onToggle,
}: {
  label: string;
  placeholder: string;
  autoComplete: string;
  value: string;
  visible: boolean;
  disabled: boolean;
  onChange: (value: string) => void;
  onToggle: () => void;
}) {
  return (
    <label className="grid gap-2">
      <span className={fieldLabelClass}>{label}</span>
      <span className={passwordInputWrapClass}>
        <input
          className={passwordInputClass}
          placeholder={placeholder}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          maxLength={128}
        />
        <button
          type="button"
          className={passwordToggleClass}
          onClick={onToggle}
          disabled={disabled}
          aria-label={visible ? `ซ่อน${label}` : `แสดง${label}`}
          title={visible ? `ซ่อน${label}` : `แสดง${label}`}
        >
          <EyeIcon open={visible} />
        </button>
      </span>
    </label>
  );
}

// ── OwnerPasswordClient ──────────────────────────────────────────────────────

export function OwnerPasswordClient() {
  const { setShellAlert } = useBackofficeShellAlert();
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [visibleFields, setVisibleFields] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [submitState, setSubmitState] = useState<SubmitState>({
    status: "idle",
    message: "กรอกรหัสผ่านปัจจุบันและรหัสผ่านใหม่เพื่ออัปเดตบัญชีเจ้าของร้าน",
  });

  const pending = submitState.status === "saving";

  function showAlert(message: string, status: SubmitState["status"]) {
    setSubmitState({ status, message });
    setShellAlert({ message, tone: status === "error" ? "danger" : "success" });
  }

  function validatePasswordForm() {
    if (!form.currentPassword) {
      return "กรุณาระบุรหัสผ่านปัจจุบัน";
    }
    if (!form.newPassword) {
      return "กรุณาระบุรหัสผ่านใหม่";
    }
    if (!form.confirmPassword) {
      return "กรุณายืนยันรหัสผ่านใหม่";
    }

    if (form.currentPassword.length < 8 || form.newPassword.length < 8 || form.confirmPassword.length < 8) {
      return "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร";
    }

    if (form.newPassword !== form.confirmPassword) {
      return "รหัสผ่านใหม่และช่องยืนยันไม่ตรงกัน";
    }

    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validatePasswordForm();
    if (validationError) {
      showAlert(validationError, "error");
      return;
    }

    setSubmitState({ status: "saving", message: "กำลังอัปเดตรหัสผ่าน..." });

    try {
      const response = await fetchWithCsrfRetry("/api/auth/password", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        showAlert(await readApiMessage(response, "อัปเดตรหัสผ่านไม่สำเร็จ"), "error");
        return;
      }

      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      showAlert("อัปเดตรหัสผ่านเรียบร้อยแล้ว", "success");
    } catch {
      showAlert("เชื่อมต่อระบบไม่ได้ กรุณาลองอีกครั้ง", "error");
    }
  }

  return (
    <form className="mt-2" onSubmit={handleSubmit} noValidate>
      <div className="grid gap-4">
        <PasswordField
          label="รหัสผ่านปัจจุบัน"
          placeholder="รหัสผ่านปัจจุบัน"
          autoComplete="current-password"
          value={form.currentPassword}
          visible={visibleFields.currentPassword}
          disabled={pending}
          onChange={(value) => setForm((current) => ({ ...current, currentPassword: value }))}
          onToggle={() => setVisibleFields((current) => ({ ...current, currentPassword: !current.currentPassword }))}
        />
        <PasswordField
          label="รหัสผ่านใหม่"
          placeholder="รหัสผ่านใหม่"
          autoComplete="new-password"
          value={form.newPassword}
          visible={visibleFields.newPassword}
          disabled={pending}
          onChange={(value) => setForm((current) => ({ ...current, newPassword: value }))}
          onToggle={() => setVisibleFields((current) => ({ ...current, newPassword: !current.newPassword }))}
        />
        <PasswordField
          label="ยืนยันรหัสผ่านใหม่"
          placeholder="ยืนยันรหัสผ่านใหม่"
          autoComplete="new-password"
          value={form.confirmPassword}
          visible={visibleFields.confirmPassword}
          disabled={pending}
          onChange={(value) => setForm((current) => ({ ...current, confirmPassword: value }))}
          onToggle={() => setVisibleFields((current) => ({ ...current, confirmPassword: !current.confirmPassword }))}
        />
      </div>
      <div className="mt-5 flex flex-wrap justify-start gap-[10px] max-[900px]:[&>*]:w-full">
        <button type="submit" className={primaryButtonClass} disabled={pending}>
          {pending ? "กำลังอัปเดต..." : "อัปเดตรหัสผ่าน"}
        </button>
      </div>
    </form>
  );
}
