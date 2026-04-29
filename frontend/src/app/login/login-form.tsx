"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { csrfCookieName, ensureCsrfToken, readCookie } from "@/lib/csrf";
import { getWorkspaceHref } from "@/lib/workspace";
import { ghostPillClass, inputClass, primaryButtonClass } from "@/components/ui-primitives";

const keypad = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "backspace"] as const;
const pinLength = 6;

type ChallengeUser = {
  id: string;
  username: string;
  displayName: string;
};

type ChallengeMode = "verify" | "setup";

function PillLabel({ children }: { children: string }) {
  return <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[var(--eyebrow)]">{children}</p>;
}

function ErrorBox({ children, light = false }: { children: string; light?: boolean }) {
  return (
    <p
      className={
        light
          ? "mt-[18px] rounded-xl border border-[var(--danger-border)] bg-[var(--danger-soft)] px-[14px] py-3 text-[0.94rem] text-[var(--danger-bright)]"
          : "mt-4 rounded-xl border border-[var(--danger-border)] bg-[var(--danger-soft)] px-[14px] py-3 text-[0.94rem] text-[var(--danger)]"
      }
    >
      {children}
    </p>
  );
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

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [challengeUser, setChallengeUser] = useState<ChallengeUser | null>(null);
  const [challengeMode, setChallengeMode] = useState<ChallengeMode>("verify");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    void ensureCsrfToken().catch(() => undefined);
  }, []);

  async function getCsrfToken() {
    return (await ensureCsrfToken()) || readCookie(csrfCookieName);
  }

  async function completeAuth(url: "/api/auth/verify-pin" | "/api/auth/setup-pin", body: Record<string, string>, fallbackError: string) {
    const csrfToken = await getCsrfToken();
    if (!csrfToken) {
      setError("ไม่สามารถเตรียมเซสชันของหน้านี้ได้ กรุณารีเฟรชแล้วลองใหม่");
      return;
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      credentials: "same-origin",
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setPin("");
      setConfirmPin("");
      setError(data?.error || fallbackError);
      return;
    }

    const data = (await response.json().catch(() => null)) as
      | { user?: { platformRole: string; storeRole: string | null } }
      | null;

    startTransition(() => {
      router.push(data?.user ? getWorkspaceHref(data.user) : "/owner");
      router.refresh();
    });
  }

  async function submitPasswordStep() {
    setError(null);

    const normalizedUsername = username.trim().toLowerCase();
    if (!normalizedUsername || !password) {
      setError("กรอก username และ password ก่อน");
      return;
    }

    const csrfToken = await getCsrfToken();
    if (!csrfToken) {
      setError("ไม่สามารถเตรียมเซสชันของหน้านี้ได้ กรุณารีเฟรชแล้วลองใหม่");
      return;
    }

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      credentials: "same-origin",
      body: JSON.stringify({
        username: normalizedUsername,
        password,
      }),
    });

    const data = (await response.json().catch(() => null)) as
      | { error?: string; pinRequired?: boolean; pinSetupRequired?: boolean; user?: ChallengeUser }
      | null;

    if (!response.ok || !data?.user) {
      setError(data?.error || "เข้าสู่ระบบไม่สำเร็จ");
      return;
    }

    setPin("");
    setConfirmPin("");
    setChallengeUser(data.user);
    setChallengeMode(data.pinSetupRequired ? "setup" : "verify");
  }

  function appendDigit(value: string) {
    if (pending) return;

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
    if (pending) return;

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
    setPin("");
    setConfirmPin("");
    setError(null);
    setChallengeUser(null);
    setChallengeMode("verify");
  }

  function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
                    disabled={pending || (!pin.length && !confirmPin.length)}
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
                  disabled={pending || maxReached}
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
            >
              ล้างค่า
            </button>
            <button
              type="button"
              onClick={() => void (challengeMode === "setup" ? submitSetupPinStep() : submitVerifyPinStep())}
              className={primaryButtonClass}
              disabled={pending || (challengeMode === "setup" ? confirmPin.length !== pinLength : pin.length !== pinLength)}
            >
              {pending ? "กำลังตรวจสอบ..." : challengeMode === "setup" ? "บันทึก PIN และเข้าใช้งาน" : "ปลดล็อกหลังบ้าน"}
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
      className="w-[min(100%,520px)] rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-7 shadow-[var(--shadow-card)] backdrop-blur-[14px] max-[820px]:p-5 max-[640px]:p-4"
    >
      <PillLabel>Step 1 of 2</PillLabel>
      <h1 className="my-[10px] text-[clamp(2rem,2.9vw,3.3rem)] leading-[0.98] tracking-[-0.065em]">เข้าสู่ระบบด้วยบัญชีร้าน</h1>
      <p className="m-0 text-[var(--foreground-soft)]">กรอก username และ password ก่อน จากนั้นระบบจะพาไปยืนยัน PIN หรือสร้าง PIN ใหม่ทันที</p>

      <div className="mt-[18px] grid gap-[14px]">
        <label className="grid gap-2">
          <span className="text-[0.92rem] font-semibold text-[var(--eyebrow)]">Username</span>
          <input
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            className={inputClass}
            placeholder="owner.fastmanfoods"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-[0.92rem] font-semibold text-[var(--eyebrow)]">Password</span>
          <input
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            autoComplete="current-password"
            className={inputClass}
            placeholder="กรอกรหัสผ่านของคุณ"
          />
        </label>
      </div>

      {error ? <ErrorBox>{error}</ErrorBox> : null}

      <div className="mt-[18px] flex flex-wrap items-center justify-between gap-[10px] max-[720px]:[&>*]:w-full">
        <span className={ghostPillClass}>ระบบจะตรวจสอบเซสชันก่อนเข้าใช้งาน</span>
        <button type="submit" className={primaryButtonClass} disabled={pending || !username.trim() || !password}>
          {pending ? "กำลังตรวจบัญชี..." : "ดำเนินการต่อ"}
        </button>
      </div>
    </form>
    {renderPinChallengeModal()}
    </>
  );
}

