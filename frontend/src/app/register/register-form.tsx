"use client";

import Link from "next/link";
import Image from "next/image";
import { FormEvent, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ensureCsrfToken, fetchWithCsrfRetry } from "@/lib/csrf";

const authInputClass =
  "h-[34px] w-full rounded-[5px] border border-[#d7deea] bg-white px-3 text-[0.9rem] text-[#0f172a] outline-none transition placeholder:text-[#8ea0b7] focus:border-[#2388ff] focus:shadow-[0_0_0_3px_rgba(35,136,255,0.18)]";
const authPasswordInputClass =
  "auth-password-input h-[34px] w-full rounded-[5px] border border-[#d7deea] bg-white py-0 pl-3 pr-8 text-[0.9rem] text-[#0f172a] outline-none transition placeholder:text-[#8ea0b7] focus:border-[#2388ff] focus:shadow-[0_0_0_3px_rgba(35,136,255,0.18)]";
const authPrimaryButtonClass =
  "inline-flex h-[34px] w-full items-center justify-center rounded-[5px] bg-[#2388ff] px-4 text-[0.86rem] font-bold text-white transition hover:bg-[#0f75ee] disabled:cursor-not-allowed disabled:opacity-60";
const authPasswordToggleClass =
  "absolute right-1.5 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-[4px] text-[#2388ff] transition hover:bg-[#eaf4ff]";
const authLinkClass = "font-bold text-[#6d6bff] transition hover:text-[#8d8bff]";
const usernamePattern = /^[a-z0-9._-]{3,32}$/;

function PasswordEyeIcon({ hidden }: { hidden: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill="none" aria-hidden="true">
      <path d="M3.5 12s3.1-5.2 8.5-5.2 8.5 5.2 8.5 5.2-3.1 5.2-8.5 5.2S3.5 12 3.5 12Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" stroke="currentColor" strokeWidth="1.8" />
      {hidden ? <path d="M4.5 19.5 19.5 4.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /> : null}
    </svg>
  );
}

function AuthMark() {
  return (
    <Link href="/" aria-label="กลับไปหน้าแรก" className="mb-5 block h-12 w-[196px] overflow-hidden">
      <Image src="/logo.png" alt="" width={488} height={111} className="h-12 w-auto -translate-x-[9px]" priority />
    </Link>
  );
}

function ErrorBox({ children }: { children: string }) {
  return <p className="fixed right-5 top-5 z-[420] flex min-h-[42px] w-[min(360px,calc(100vw-40px))] items-center rounded-[6px] border border-red-300 bg-red-50 px-4 py-3 text-[0.86rem] leading-snug text-red-700 shadow-[0_14px_34px_rgba(220,38,38,0.14)]" role="alert">{children}</p>;
}

export function RegisterForm() {
  const router = useRouter();
  const [storeName, setStoreName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationCooldown, setValidationCooldown] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    void ensureCsrfToken().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!error) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setError(null);
    }, 3000);

    return () => window.clearTimeout(timeout);
  }, [error]);

  function showValidationError(message: string) {
    setError(message);
    setValidationCooldown(true);
    window.setTimeout(() => {
      setValidationCooldown(false);
    }, 500);
  }

  async function submitRegistration() {
    if (submitting || pending || validationCooldown) {
      return;
    }

    setError(null);

    const normalizedUsername = username.trim().toLowerCase();
    if (!storeName.trim() || !ownerName.trim() || !normalizedUsername || !password || !confirmPassword) {
      showValidationError("กรอกข้อมูลสมัครสมาชิกให้ครบก่อน");
      return;
    }

    if (storeName.trim().length < 2) {
      showValidationError("ชื่อร้านต้องมีอย่างน้อย 2 ตัวอักษร");
      return;
    }

    if (ownerName.trim().length < 2) {
      showValidationError("ชื่อเจ้าของต้องมีอย่างน้อย 2 ตัวอักษร");
      return;
    }

    if (!usernamePattern.test(normalizedUsername)) {
      showValidationError("Username ใช้ได้เฉพาะอังกฤษ ตัวเลข จุด ขีดกลาง หรือขีดล่าง 3-32 ตัว");
      return;
    }

    if (password.length < 8) {
      showValidationError("Password ต้องมีอย่างน้อย 8 ตัวอักษร");
      return;
    }

    if (password !== confirmPassword) {
      showValidationError("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
      return;
    }

    setSubmitting(true);
    let shouldKeepSubmitting = false;

    try {
      const response = await fetchWithCsrfRetry("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storeName: storeName.trim(),
          ownerName: ownerName.trim(),
          username: normalizedUsername,
          password,
          confirmPassword,
        }),
      });

      const data = (await response.json().catch(() => null)) as { error?: string; success?: boolean } | null;
      if (!response.ok || !data?.success) {
        setError(data?.error || "สมัครสมาชิกไม่สำเร็จ");
        return;
      }

      shouldKeepSubmitting = true;
      startTransition(() => {
        router.push("/login?registered=1");
        router.refresh();
      });
    } catch {
      setError("สมัครสมาชิกไม่สำเร็จ กรุณาลองอีกครั้ง");
    } finally {
      if (!shouldKeepSubmitting) {
        setSubmitting(false);
      }
    }
  }

  function togglePasswordVisibility() {
    setShowPassword((current) => !current);
  }

  function toggleConfirmPasswordVisibility() {
    setShowConfirmPassword((current) => !current);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitRegistration();
  }

  const registrationBusy = submitting || pending;
  const submitDisabled = registrationBusy || validationCooldown;

  return (
    <form onSubmit={handleSubmit} noValidate className="relative z-[1] w-[min(100%,438px)] rounded-[10px] bg-[#f6f7f9] p-6 text-[#0f172a] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <AuthMark />
      <h1 className="m-0 text-[1.35rem] font-extrabold leading-tight text-[#0f172a]">สมัครสมาชิก</h1>
      <p className="mt-3 text-[0.88rem] leading-relaxed text-[#64748b]">
        มีบัญชีแล้ว? <Link href="/login" className={authLinkClass}>เข้าสู่ระบบ</Link>
      </p>

      <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-5 max-[520px]:grid-cols-1">
        <label className="grid gap-2">
          <span className="text-[0.82rem] font-bold text-[#0f172a]">ชื่อร้าน</span>
          <input required value={storeName} onChange={(event) => setStoreName(event.target.value)} className={authInputClass} placeholder="ชื่อร้านของคุณ" autoComplete="organization" disabled={registrationBusy} />
        </label>

        <label className="grid gap-2">
          <span className="text-[0.82rem] font-bold text-[#0f172a]">ชื่อเจ้าของ</span>
          <input required value={ownerName} onChange={(event) => setOwnerName(event.target.value)} className={authInputClass} placeholder="ชื่อของคุณ" autoComplete="name" disabled={registrationBusy} />
        </label>

        <label className="col-span-2 grid gap-2 max-[520px]:col-span-1">
          <span className="text-[0.82rem] font-bold text-[#0f172a]">Username</span>
          <input
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className={authInputClass}
            placeholder="owner.yourshop"
            autoComplete="username"
            pattern="[A-Za-z0-9._-]{3,32}"
            title="ใช้ตัวอักษรอังกฤษ ตัวเลข จุด ขีดกลาง หรือขีดล่าง 3-32 ตัว"
            disabled={registrationBusy}
          />
        </label>

        <label className="grid gap-2">
          <span className="text-[0.82rem] font-bold text-[#0f172a]">Password</span>
          <span className="relative block">
            <input
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type={showPassword ? "text" : "password"}
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              className={authPasswordInputClass}
              placeholder="อย่างน้อย 8 ตัวอักษร"
              disabled={registrationBusy}
            />
            <button
              type="button"
              className={authPasswordToggleClass}
              onClick={togglePasswordVisibility}
              aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
            >
              <PasswordEyeIcon hidden={showPassword} />
            </button>
          </span>
        </label>

        <label className="grid gap-2">
          <span className="text-[0.82rem] font-bold text-[#0f172a]">ยืนยัน Password</span>
          <span className="relative block">
            <input
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              type={showConfirmPassword ? "text" : "password"}
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              className={authPasswordInputClass}
              placeholder="กรอกรหัสผ่านอีกครั้ง"
              disabled={registrationBusy}
            />
            <button
              type="button"
              className={authPasswordToggleClass}
              onClick={toggleConfirmPasswordVisibility}
              aria-label={showConfirmPassword ? "ซ่อนรหัสผ่านยืนยัน" : "แสดงรหัสผ่านยืนยัน"}
            >
              <PasswordEyeIcon hidden={showConfirmPassword} />
            </button>
          </span>
        </label>
      </div>

      <div className="mt-6 grid gap-3">
        <button type="submit" className={authPrimaryButtonClass} disabled={submitDisabled}>
          {registrationBusy ? "กำลังสร้างบัญชี..." : "สร้างบัญชีร้าน"}
        </button>
      </div>

      {error ? <ErrorBox>{error}</ErrorBox> : null}
    </form>
  );
}
