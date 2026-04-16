"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { csrfCookieName, ensureCsrfToken, readCookie } from "@/lib/csrf";

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
      setError("Unable to initialize security token. Please refresh and try again.");
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

    startTransition(() => {
      router.push("/admin");
      router.refresh();
    });
  }

  async function submitPasswordStep() {
    setError(null);

    const normalizedUsername = username.trim().toLowerCase();
    if (!normalizedUsername || !password) {
      setError("Enter your username and password first.");
      return;
    }

    const csrfToken = await getCsrfToken();
    if (!csrfToken) {
      setError("Unable to initialize security token. Please refresh and try again.");
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
      setError(data?.error || "Sign in failed");
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

    if (pin.length >= pinLength) return;
    setPin((current) => `${current}${value}`);
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
      setError("PIN must be 6 digits.");
      return;
    }

    await completeAuth("/api/auth/verify-pin", { pin }, "PIN verification failed");
  }

  async function submitSetupPinStep() {
    setError(null);

    if (pin.length !== pinLength || confirmPin.length !== pinLength) {
      setError("Enter and confirm all 6 PIN digits.");
      return;
    }

    if (pin !== confirmPin) {
      setError("PIN confirmation does not match.");
      setConfirmPin("");
      return;
    }

    await completeAuth("/api/auth/setup-pin", { pin, confirmPin }, "PIN setup failed");
  }

  function resetChallenge() {
    setPin("");
    setConfirmPin("");
    setError(null);
    setChallengeUser(null);
    setChallengeMode("verify");
  }

  if (challengeUser) {
    const title = challengeMode === "setup" ? "Set your new PIN" : "Current passcode";
    const description =
      challengeMode === "setup"
        ? `Create a 6-digit PIN for ${challengeUser.username}, then confirm it once more.`
        : `Enter the current PIN for ${challengeUser.username}.`;

    return (
      <div className="w-full max-w-md rounded-[34px] bg-[rgba(30,31,33,0.96)] p-5 text-white shadow-[0_24px_80px_rgba(16,18,21,0.35)]">
        <div className="space-y-6 rounded-[28px] border border-white/8 px-5 pb-6 pt-5 sm:px-7 sm:pb-8 sm:pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex rounded-full bg-white/8 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/70">
                {challengeMode === "setup" ? "Pin Setup" : "Pin Access"}
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white">{title}</h1>
                <p className="mt-2 text-sm text-white/60">{description}</p>
              </div>
            </div>

            <button type="button" onClick={resetChallenge} className="text-3xl leading-none text-white/80 transition hover:text-white">
              X
            </button>
          </div>

          <div className="py-2 text-sm text-white/55">Signed in as {challengeUser.displayName}</div>

          <div className="space-y-4">
            <div>
              <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.22em] text-white/45">
                {challengeMode === "setup" ? "New PIN" : "PIN"}
              </p>
              <div className="flex justify-center gap-4 py-1">
                {Array.from({ length: pinLength }).map((_, index) => {
                  const filled = index < pin.length;
                  return (
                    <div
                      key={index}
                      className={`h-4 w-4 rounded-full border transition ${filled ? "border-white bg-white" : "border-white/75 bg-transparent"}`}
                    />
                  );
                })}
              </div>
            </div>

            {challengeMode === "setup" ? (
              <div>
                <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.22em] text-white/45">Confirm PIN</p>
                <div className="flex justify-center gap-4 py-1">
                  {Array.from({ length: pinLength }).map((_, index) => {
                    const filled = index < confirmPin.length;
                    return (
                      <div
                        key={index}
                        className={`h-4 w-4 rounded-full border transition ${filled ? "border-white bg-white" : "border-white/75 bg-transparent"}`}
                      />
                    );
                  })}
                </div>
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => {
                setPin("");
                setConfirmPin("");
                setError(null);
              }}
              className="mx-auto block text-sm font-medium text-white/72 transition hover:text-white"
            >
              Clear
            </button>
          </div>

          {error ? (
            <p className="rounded-2xl border border-[rgba(255,92,92,0.25)] bg-[rgba(255,92,92,0.08)] px-4 py-3 text-sm text-[rgba(255,189,189,0.92)]">
              {error}
            </p>
          ) : null}

          <div className="grid grid-cols-3 gap-x-10 gap-y-6 pt-3">
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
                    className="h-16 rounded-full text-4xl font-light text-white transition hover:bg-white/8 disabled:opacity-40"
                    disabled={pending || (!pin.length && !confirmPin.length)}
                    aria-label="Delete last digit"
                  >
                    {"<-"}
                  </button>
                );
              }

              const maxReached = challengeMode === "setup" ? pin.length >= pinLength && confirmPin.length >= pinLength : pin.length >= pinLength;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => appendDigit(key)}
                  className="h-16 rounded-full text-4xl font-light text-white transition hover:bg-white/8 disabled:opacity-40"
                  disabled={maxReached || pending}
                >
                  {key}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => void (challengeMode === "setup" ? submitSetupPinStep() : submitVerifyPinStep())}
            disabled={pending || (challengeMode === "setup" ? confirmPin.length !== pinLength : pin.length !== pinLength)}
            className="mt-2 w-full rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-[#1d1e20] transition hover:bg-[rgba(255,255,255,0.88)] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {pending ? "Verifying..." : challengeMode === "setup" ? "Save PIN and enter" : "Unlock backoffice"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      action={async () => {
        await submitPasswordStep();
      }}
      className="glass-panel flex w-full max-w-md flex-col gap-5 rounded-[32px] p-8 shadow-[0_18px_50px_rgba(28,33,31,0.12)]"
    >
      <div className="space-y-3">
        <div className="inline-flex w-fit rounded-full bg-white/85 px-3 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-deep)]">
          Step 1 of 2
        </div>
        <h1 className="text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">Sign in with username</h1>
        <p className="text-sm text-[var(--muted)]">
          Enter your username and password first. If this is your first login, we will help you set a PIN next.
        </p>
      </div>

      <label className="space-y-2">
        <span className="text-sm font-medium text-[var(--foreground)]">Username</span>
        <input
          required
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="username"
          className="w-full rounded-2xl border border-[var(--border)] bg-white/80 px-4 py-3 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--ring)]"
          placeholder="loveptn123"
        />
      </label>

      <label className="space-y-2">
        <span className="text-sm font-medium text-[var(--foreground)]">Password</span>
        <input
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          autoComplete="current-password"
          className="w-full rounded-2xl border border-[var(--border)] bg-white/80 px-4 py-3 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--ring)]"
          placeholder="Enter your password"
        />
      </label>

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending || !username.trim() || !password}
        className="rounded-2xl bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? "Checking account..." : "Continue"}
      </button>
    </form>
  );
}
