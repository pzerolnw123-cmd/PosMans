"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { csrfCookieName, ensureCsrfToken, readCookie } from "@/lib/csrf";
import { getWorkspaceHref } from "@/lib/workspace";

const keypad = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "backspace"] as const;
const pinLength = 6;

type ChallengeUser = {
  id: string;
  username: string;
  displayName: string;
};

type ChallengeMode = "verify" | "setup";

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
      setError("ไม่สามารถเริ่มต้น security token ได้ กรุณารีเฟรชหน้าแล้วลองใหม่");
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
      setError("ไม่สามารถเริ่มต้น security token ได้ กรุณารีเฟรชหน้าแล้วลองใหม่");
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

  if (challengeUser) {
    const title = challengeMode === "setup" ? "ตั้งค่า PIN ใหม่" : "ยืนยัน PIN";
    const description =
      challengeMode === "setup"
        ? `สร้าง PIN 6 หลักสำหรับ ${challengeUser.username} แล้วกรอกยืนยันอีกครั้ง`
        : `กรอก PIN ปัจจุบันของ ${challengeUser.username} เพื่อเข้าสู่หลังบ้าน`;

    return (
      <div className="pin-shell">
        <div className="pin-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow-label" style={{ color: "rgba(255,255,255,0.58)" }}>
                {challengeMode === "setup" ? "PIN Setup" : "PIN Access"}
              </p>
              <h1 style={{ color: "#fff", fontSize: "2.2rem" }}>{title}</h1>
              <p style={{ color: "rgba(255,255,255,0.68)" }}>{description}</p>
            </div>
            <button type="button" onClick={resetChallenge} className="ghost-button" style={{ background: "rgba(255,255,255,0.08)", color: "#fff", borderColor: "rgba(255,255,255,0.1)" }}>
              เปลี่ยนบัญชี
            </button>
          </div>

          <p style={{ color: "rgba(255,255,255,0.74)", margin: "18px 0 0" }}>Signed in as {challengeUser.displayName}</p>

          <div style={{ marginTop: 18 }}>
            <p className="form-caption" style={{ color: "rgba(255,255,255,0.58)", textAlign: "center", marginBottom: 12 }}>
              {challengeMode === "setup" ? "PIN ใหม่" : "PIN"}
            </p>
            <div className="pin-dots">
              {Array.from({ length: pinLength }).map((_, index) => (
                <span key={index} className={index < pin.length ? "pin-dot is-filled" : "pin-dot"} />
              ))}
            </div>
          </div>

          {challengeMode === "setup" ? (
            <div style={{ marginTop: 18 }}>
              <p className="form-caption" style={{ color: "rgba(255,255,255,0.58)", textAlign: "center", marginBottom: 12 }}>
                ยืนยัน PIN
              </p>
              <div className="pin-dots">
                {Array.from({ length: pinLength }).map((_, index) => (
                  <span key={index} className={index < confirmPin.length ? "pin-dot is-filled" : "pin-dot"} />
                ))}
              </div>
            </div>
          ) : null}

          {error ? (
            <p className="alert-error" style={{ marginTop: 18, background: "rgba(208,87,111,0.12)", color: "#ffc6d0", borderColor: "rgba(255,158,180,0.18)" }}>
              {error}
            </p>
          ) : null}

          <div className="keypad-grid">
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
                    className="keypad-button"
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
                  className="keypad-button"
                  disabled={pending || maxReached}
                >
                  {key}
                </button>
              );
            })}
          </div>

          <div className="button-row" style={{ marginTop: 16 }}>
            <button
              type="button"
              onClick={() => {
                setPin("");
                setConfirmPin("");
                setError(null);
              }}
              className="ghost-button"
              style={{ background: "rgba(255,255,255,0.06)", color: "#fff", borderColor: "rgba(255,255,255,0.1)" }}
            >
              ล้างค่า
            </button>
            <button
              type="button"
              onClick={() => void (challengeMode === "setup" ? submitSetupPinStep() : submitVerifyPinStep())}
              className="primary-button"
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
    <form
      action={async () => {
        await submitPasswordStep();
      }}
      className="auth-card"
    >
      <p className="eyebrow-label">Step 1 of 2</p>
      <h1>เข้าสู่ระบบด้วยบัญชีร้าน</h1>
      <p>กรอก username และ password ก่อน จากนั้นระบบจะพาไปยืนยัน PIN หรือสร้าง PIN ใหม่ทันที</p>

      <div className="settings-grid" style={{ marginTop: 18 }}>
        <label className="field-row">
          <span>Username</span>
          <input
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            className="app-input"
            placeholder="owner.fastmanfoods"
          />
        </label>

        <label className="field-row">
          <span>Password</span>
          <input
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            autoComplete="current-password"
            className="app-input"
            placeholder="กรอกรหัสผ่านของคุณ"
          />
        </label>
      </div>

      {error ? <p className="alert-error" style={{ marginTop: 16 }}>{error}</p> : null}

      <div className="button-row" style={{ marginTop: 18, justifyContent: "space-between" }}>
        <span className="ghost-pill">หลังบ้านจะตรวจ session และ CSRF ต่อที่ backend</span>
        <button type="submit" className="primary-button" disabled={pending || !username.trim() || !password}>
          {pending ? "กำลังตรวจบัญชี..." : "ดำเนินการต่อ"}
        </button>
      </div>
    </form>
  );
}
