"use client";

import { FormEvent, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ensureCsrfToken, fetchWithCsrfRetry } from "@/lib/csrf";
import { isOwnerTheme, storeOwnerTheme } from "@/lib/owner-theme";
import { getWorkspaceHref } from "@/lib/workspace";
import { primaryButtonClass } from "@/components/ui-primitives";

const keypad = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "backspace"] as const;
const pinLength = 6;

type ChallengeUser = {
  id: string;
  username: string;
  displayName: string;
};

type ChallengeMode = "verify" | "setup";
type AuthErrorPayload = {
  code?: string;
  error?: string;
};

const authInputClass =
  "h-[34px] w-full rounded-[5px] border border-[#d7deea] bg-white px-3 text-[0.9rem] text-[#0f172a] outline-none transition placeholder:text-[#8ea0b7] focus:border-[#2388ff] focus:shadow-[0_0_0_3px_rgba(35,136,255,0.18)]";
const authPasswordInputClass =
  "auth-password-input h-[34px] w-full rounded-[5px] border border-[#d7deea] bg-white py-0 pl-3 pr-8 text-[0.9rem] text-[#0f172a] outline-none transition placeholder:text-[#8ea0b7] focus:border-[#2388ff] focus:shadow-[0_0_0_3px_rgba(35,136,255,0.18)]";
const authPrimaryButtonClass =
  "inline-flex h-[34px] w-full items-center justify-center rounded-[5px] bg-[#2388ff] px-4 text-[0.86rem] font-bold text-white transition hover:bg-[#0f75ee] disabled:cursor-not-allowed disabled:opacity-60";
const authPasswordToggleClass =
  "absolute right-1.5 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-[4px] text-[#2388ff] transition hover:bg-[#eaf4ff]";
const authLinkClass = "font-bold text-[#6d6bff] transition hover:text-[#8d8bff]";

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

function ErrorBox({ children, light = false }: { children: string; light?: boolean }) {
  return (
    <p
      className={
        light
          ? "fixed right-5 top-5 z-[420] flex min-h-[42px] w-[min(360px,calc(100vw-40px))] items-center rounded-[6px] border border-[var(--danger-border)] bg-[var(--danger-soft)] px-4 py-3 text-[0.86rem] leading-snug text-[var(--danger-bright)] shadow-[0_14px_34px_rgba(220,38,38,0.14)]"
          : "fixed right-5 top-5 z-[420] flex min-h-[42px] w-[min(360px,calc(100vw-40px))] items-center rounded-[6px] border border-[var(--danger-border)] bg-[var(--danger-soft)] px-4 py-3 text-[0.86rem] leading-snug text-[var(--danger)] shadow-[0_14px_34px_rgba(220,38,38,0.14)]"
      }
      role="alert"
    >
      {children}
    </p>
  );
}

function NoticeBox({ children }: { children: string }) {
  return (
    <p className="fixed right-5 top-5 z-[420] flex min-h-[42px] w-[min(360px,calc(100vw-40px))] items-center rounded-[6px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-[0.86rem] leading-snug text-emerald-700 shadow-[0_14px_34px_rgba(5,150,105,0.14)]" role="status">
      {children}
    </p>
  );
}

function resolveAuthErrorMessage(payload: AuthErrorPayload | null, fallback: string) {
  if (payload?.code === "BACKEND_TIMEOUT") {
    return "Backend ตอบช้าเกินไป กรุณารอสักครู่แล้วลองเข้าสู่ระบบอีกครั้ง";
  }

  if (payload?.code === "BACKEND_UNAVAILABLE") {
    return "เชื่อมต่อ backend ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
  }

  return payload?.error || fallback;
}

function PinDots({ filled }: { filled: number }) {
  return (
    <div className="flex justify-center gap-3 max-[420px]:gap-2">
      {Array.from({ length: pinLength }).map((_, index) => (
        <span
          key={index}
          className={
            index < filled
              ? "h-[13px] w-[13px] rounded-full border border-[var(--brand)] bg-[var(--brand)]"
              : "h-[13px] w-[13px] rounded-full border border-[var(--border-strong)]"
          }
        />
      ))}
    </div>
  );
}

export function LoginForm({ initialNotice = null }: { initialNotice?: string | null }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [challengeUser, setChallengeUser] = useState<ChallengeUser | null>(null);
  const [challengeMode, setChallengeMode] = useState<ChallengeMode>("verify");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(initialNotice);
  const [authBusy, setAuthBusy] = useState(false);
  const authBusyRef = useRef(false);
  const [pending, startTransition] = useTransition();
  const isSubmitting = pending || authBusy;

  function beginAuthRequest() {
    if (pending || authBusyRef.current) {
      return false;
    }

    authBusyRef.current = true;
    setAuthBusy(true);
    return true;
  }

  function endAuthRequest() {
    authBusyRef.current = false;
    setAuthBusy(false);
  }

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

  async function completeAuth(url: "/api/auth/verify-pin" | "/api/auth/setup-pin", body: Record<string, string>, fallbackError: string) {
    if (!beginAuthRequest()) {
      return;
    }

    try {
      const response = await fetchWithCsrfRetry(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as AuthErrorPayload | null;
        setPin("");
        setConfirmPin("");
        setError(resolveAuthErrorMessage(data, fallbackError));
        return;
      }

      const data = (await response.json().catch(() => null)) as
        | { user?: { ownerTheme?: string; platformRole: string; storeRole: string | null } }
        | null;

      if (data?.user?.storeRole === "OWNER" && isOwnerTheme(data.user.ownerTheme)) {
        storeOwnerTheme(data.user.ownerTheme);
      }

      startTransition(() => {
        router.push(data?.user ? getWorkspaceHref(data.user) : "/owner");
        router.refresh();
      });
    } finally {
      endAuthRequest();
    }
  }

  async function submitPasswordStep() {
    if (!beginAuthRequest()) {
      return;
    }

    setError(null);
    setNotice(null);

    const normalizedUsername = username.trim().toLowerCase();
    if (!normalizedUsername || !password) {
      setError("กรอก username และ password ก่อน");
      endAuthRequest();
      return;
    }

    try {
      const response = await fetchWithCsrfRetry("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: normalizedUsername,
          password,
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | (AuthErrorPayload & { pinRequired?: boolean; pinSetupRequired?: boolean; user?: ChallengeUser })
        | null;

      if (!response.ok || !data?.user) {
        setError(resolveAuthErrorMessage(data, "เข้าสู่ระบบไม่สำเร็จ"));
        return;
      }

      setPin("");
      setConfirmPin("");
      setChallengeUser(data.user);
      setChallengeMode(data.pinSetupRequired ? "setup" : "verify");
    } finally {
      endAuthRequest();
    }
  }

  function appendDigit(value: string) {
    if (isSubmitting) return;

    if (challengeMode === "setup") {
      if (pin.length < pinLength) {
        setPin((current) => `${current}${value}`);
        return;
      }

      if (confirmPin.length < pinLength) {
        setConfirmPin((current) => `${current}${value}`);
      }

      return;
    }

    if (pin.length < pinLength) {
      setPin((current) => `${current}${value}`);
    }
  }

  function removeDigit() {
    if (isSubmitting) return;

    if (challengeMode === "setup") {
      if (confirmPin.length) {
        setConfirmPin((current) => current.slice(0, -1));
        return;
      }

      if (pin.length) {
        setPin((current) => current.slice(0, -1));
      }

      return;
    }

    setPin((current) => current.slice(0, -1));
  }

  async function submitVerifyPinStep() {
    setError(null);

    if (pin.length !== pinLength) {
      setError("PIN ต้องมี 6 หลัก");
      return;
    }

    await completeAuth("/api/auth/verify-pin", { pin }, "ตรวจสอบ PIN ไม่สำเร็จ");
  }

  async function submitSetupPinStep() {
    setError(null);

    if (pin.length !== pinLength || confirmPin.length !== pinLength) {
      setError("กรอก PIN ให้ครบทั้งสองช่อง");
      return;
    }

    if (pin !== confirmPin) {
      setError("PIN ทั้งสองชุดไม่ตรงกัน");
      setConfirmPin("");
      return;
    }

    await completeAuth("/api/auth/setup-pin", { pin, confirmPin }, "ตั้งค่า PIN ไม่สำเร็จ");
  }

  function resetChallenge() {
    if (isSubmitting) {
      return;
    }

    setPin("");
    setConfirmPin("");
    setError(null);
    setChallengeUser(null);
    setChallengeMode("verify");
  }

  function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }
    void submitPasswordStep();
  }

  function renderPinChallengeModal() {
    if (!challengeUser) {
      return null;
    }

    const title = challengeMode === "setup" ? "ตั้งค่า PIN ใหม่" : "ยืนยัน PIN";
    const description =
      challengeMode === "setup"
        ? "สร้าง PIN 6 หลัก แล้วกรอกยืนยันอีกครั้งเพื่อเปิดใช้งานบัญชีนี้"
        : "กรอก PIN 6 หลักเพื่อปลดล็อกและเข้าสู่หลังบ้าน";

    return (
      <div className="fixed inset-0 z-[360] grid place-items-center bg-[var(--modal-backdrop)] p-4 backdrop-blur-[16px] max-[640px]:p-3">
        <div className="absolute inset-0 [background:var(--modal-brand-glow)]" />
        <div
          className="relative z-[1] w-[min(100%,460px)] rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-7 text-[var(--foreground)] shadow-[var(--modal-shadow)] max-[640px]:p-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pin-challenge-title"
        >
          <div className="flex items-start justify-between gap-4 max-[720px]:flex-col max-[720px]:items-stretch">
            <div>
              <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[var(--eyebrow)]">
                {challengeMode === "setup" ? "PIN Setup" : "PIN Access"}
              </p>
              <h1 id="pin-challenge-title" className="my-[10px] text-[clamp(1.8rem,5vw,2.2rem)] leading-none tracking-[-0.065em] text-[var(--foreground)]">{title}</h1>
              <p className="m-0 text-[var(--foreground-soft)]">{description}</p>
            </div>
            <button
              type="button"
              onClick={resetChallenge}
              className="inline-flex min-h-[42px] shrink-0 items-center justify-center gap-[10px] whitespace-nowrap rounded-[10px] border border-[var(--border)] bg-[var(--surface-muted)] px-[18px] font-bold text-[var(--foreground)] transition hover:-translate-y-px max-[720px]:self-start"
              disabled={isSubmitting}
            >
              เปลี่ยนบัญชี
            </button>
          </div>

          <div className="mt-[18px]">
            <p className="mb-3 text-center text-[0.92rem] font-semibold text-[var(--foreground-soft)]">
              {challengeMode === "setup" ? "PIN ใหม่" : "PIN"}
            </p>
            <PinDots filled={pin.length} />
          </div>

          {challengeMode === "setup" ? (
            <div className="mt-[18px]">
              <p className="mb-3 text-center text-[0.92rem] font-semibold text-[var(--foreground-soft)]">ยืนยัน PIN</p>
              <PinDots filled={confirmPin.length} />
            </div>
          ) : null}

          {error ? <ErrorBox>{error}</ErrorBox> : null}

          <div className="mx-auto mt-[18px] grid w-full max-w-[360px] grid-cols-3 gap-x-[10px] gap-y-[14px] max-[420px]:gap-[10px]">
            {keypad.map((key) => {
              if (key === "") {
                return <div key="empty" />;
              }

              if (key === "backspace") {
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={removeDigit}
                    className="h-16 rounded-full bg-transparent text-[2rem] text-[var(--foreground)] transition hover:-translate-y-px hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-40 max-[420px]:h-14 max-[420px]:text-[1.7rem]"
                    disabled={isSubmitting || (!pin.length && !confirmPin.length)}
                    aria-label="Delete last digit"
                  >
                    ←
                  </button>
                );
              }

              const maxReached =
                challengeMode === "setup" ? pin.length >= pinLength && confirmPin.length >= pinLength : pin.length >= pinLength;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => appendDigit(key)}
                  className="h-16 rounded-full bg-transparent text-[2rem] text-[var(--foreground)] transition hover:-translate-y-px hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-40 max-[420px]:h-14 max-[420px]:text-[1.7rem]"
                  disabled={isSubmitting || maxReached}
                >
                  {key}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap justify-end gap-[10px] max-[720px]:[&>*]:w-full">
            <button
              type="button"
              onClick={() => {
                setPin("");
                setConfirmPin("");
                setError(null);
              }}
              className="inline-flex min-h-[42px] items-center justify-center gap-[10px] rounded-[10px] border border-[var(--border)] bg-[var(--surface-muted)] px-[18px] font-bold text-[var(--foreground)] transition hover:-translate-y-px"
              disabled={isSubmitting}
            >
              ล้างค่า
            </button>
            <button
              type="button"
              onClick={() => void (challengeMode === "setup" ? submitSetupPinStep() : submitVerifyPinStep())}
              className={primaryButtonClass}
              disabled={isSubmitting || (challengeMode === "setup" ? confirmPin.length !== pinLength : pin.length !== pinLength)}
            >
              {isSubmitting ? "กำลังตรวจสอบ..." : challengeMode === "setup" ? "บันทึก PIN และเข้าใช้งาน" : "เข้าสู่ระบบ"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <form
      onSubmit={handlePasswordSubmit}
      noValidate
      className="relative z-[1] w-[min(100%,390px)] rounded-[10px] bg-[#f6f7f9] p-6 text-[#0f172a] shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
    >
      <AuthMark />
      <h1 className="m-0 text-[1.35rem] font-extrabold leading-tight text-[#0f172a]">เข้าสู่ระบบบัญชีร้าน</h1>
      <p className="mt-3 text-[0.88rem] leading-relaxed text-[#64748b]">
        ยังไม่มีบัญชี? <Link href="/register" className={authLinkClass}>สมัครสมาชิก</Link>
      </p>

      <div className="mt-9 grid gap-6">
        <label className="grid gap-2">
          <span className="text-[0.82rem] font-bold text-[#0f172a]">Username</span>
          <input
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            className={authInputClass}
            placeholder="owner.yourshop"
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
              autoComplete="current-password"
              className={authPasswordInputClass}
              placeholder="กรอกรหัสผ่านของคุณ"
            />
            <button
              type="button"
              className={authPasswordToggleClass}
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
            >
              <PasswordEyeIcon hidden={showPassword} />
            </button>
          </span>
        </label>
      </div>

      <div className="mt-6 grid gap-5">
        <div className="flex items-center gap-3 text-[0.82rem]">
          <label className="inline-flex items-center gap-3 text-[#475569]">
            <input type="checkbox" className="h-[14px] w-[14px] rounded-[3px] border border-[#cbd5e1] bg-white" />
            จำบัญชีนี้ไว้
          </label>
        </div>
        <button type="submit" className={authPrimaryButtonClass} disabled={isSubmitting || !username.trim() || !password}>
          {isSubmitting ? "กำลังตรวจบัญชี..." : "เข้าสู่ระบบ"}
        </button>
      </div>

      {notice ? <NoticeBox>{notice}</NoticeBox> : error ? <ErrorBox>{error}</ErrorBox> : null}
    </form>
    {renderPinChallengeModal()}
    </>
  );
}
