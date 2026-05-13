"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ensureCsrfToken, fetchWithCsrfRetry } from "@/lib/csrf";

const authInputClass =
  "h-[34px] w-full rounded-[5px] border border-[#d7deea] bg-white px-3 text-[0.9rem] text-[#0f172a] outline-none transition placeholder:text-[#8ea0b7] focus:border-[#635bff] focus:shadow-[0_0_0_3px_rgba(99,91,255,0.16)]";
const authPrimaryButtonClass =
  "inline-flex h-[34px] w-full items-center justify-center rounded-[5px] bg-[#2388ff] px-4 text-[0.86rem] font-bold text-white transition hover:bg-[#0f75ee] disabled:cursor-not-allowed disabled:opacity-60";
const authSecondaryButtonClass =
  "inline-flex h-[34px] items-center justify-center rounded-[5px] border border-[#d7deea] bg-[#edf2f7] px-4 text-[0.86rem] font-bold text-[#0f172a] transition hover:border-[#c5cfde] hover:bg-[#e4ebf4]";
const authLinkClass = "font-bold text-[#6d6bff] transition hover:text-[#8d8bff]";
const usernamePattern = /^[a-z0-9._-]{3,32}$/;

function AuthMark() {
  return (
    <div className="mb-8 h-7 w-11 text-[#635bff]" aria-hidden="true">
      <svg viewBox="0 0 48 28" fill="none" className="h-full w-full">
        <path d="M2 18.5C7.5 9.5 15.5 9.5 24 16.5C31.5 22.6 38 21.5 46 11.5" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
        <path d="M5 24C11 17.5 17 18 24.5 23.5" stroke="currentColor" strokeWidth="8" strokeLinecap="round" opacity="0.78" />
      </svg>
    </div>
  );
}

function ErrorBox({ children }: { children: string }) {
  return <p className="mt-4 rounded-[6px] border border-red-300 bg-red-50 px-3 py-2 text-[0.84rem] text-red-700">{children}</p>;
}

export function RegisterForm() {
  const router = useRouter();
  const [storeName, setStoreName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    void ensureCsrfToken().catch(() => undefined);
  }, []);

  async function submitRegistration() {
    setError(null);

    const normalizedUsername = username.trim().toLowerCase();
    if (!storeName.trim() || !ownerName.trim() || !normalizedUsername || !password || !confirmPassword) {
      setError("กรอกข้อมูลสมัครสมาชิกให้ครบก่อน");
      return;
    }

    if (storeName.trim().length < 2) {
      setError("ชื่อร้านต้องมีอย่างน้อย 2 ตัวอักษร");
      return;
    }

    if (ownerName.trim().length < 2) {
      setError("ชื่อเจ้าของต้องมีอย่างน้อย 2 ตัวอักษร");
      return;
    }

    if (!usernamePattern.test(normalizedUsername)) {
      setError("Username ใช้ได้เฉพาะอังกฤษ ตัวเลข จุด ขีดกลาง หรือขีดล่าง 3-32 ตัว");
      return;
    }

    if (password.length < 8) {
      setError("Password ต้องมีอย่างน้อย 8 ตัวอักษร");
      return;
    }

    if (password !== confirmPassword) {
      setError("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
      return;
    }

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

    startTransition(() => {
      router.push("/login");
      router.refresh();
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitRegistration();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="w-[min(100%,438px)] rounded-[10px] bg-[#f6f7f9] p-6 text-[#0f172a] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <AuthMark />
      <h1 className="m-0 text-[1.35rem] font-extrabold leading-tight text-[#0f172a]">สมัครสมาชิก</h1>
      <p className="mt-3 text-[0.88rem] leading-relaxed text-[#64748b]">
        มีบัญชีแล้ว? <Link href="/login" className={authLinkClass}>เข้าสู่ระบบ</Link>
      </p>

      <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-5 max-[520px]:grid-cols-1">
        <label className="grid gap-2">
          <span className="text-[0.82rem] font-bold text-[#0f172a]">ชื่อร้าน</span>
          <input required value={storeName} onChange={(event) => setStoreName(event.target.value)} className={authInputClass} placeholder="Fast Man Foods" autoComplete="organization" />
        </label>

        <label className="grid gap-2">
          <span className="text-[0.82rem] font-bold text-[#0f172a]">ชื่อเจ้าของ</span>
          <input required value={ownerName} onChange={(event) => setOwnerName(event.target.value)} className={authInputClass} placeholder="ชื่อของคุณ" autoComplete="name" />
        </label>

        <label className="col-span-2 grid gap-2 max-[520px]:col-span-1">
          <span className="text-[0.82rem] font-bold text-[#0f172a]">Username</span>
          <input
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className={authInputClass}
            placeholder="owner.fastmanfoods"
            autoComplete="username"
            pattern="[A-Za-z0-9._-]{3,32}"
            title="ใช้ตัวอักษรอังกฤษ ตัวเลข จุด ขีดกลาง หรือขีดล่าง 3-32 ตัว"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-[0.82rem] font-bold text-[#0f172a]">Password</span>
          <input
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
            className={authInputClass}
            placeholder="อย่างน้อย 8 ตัวอักษร"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-[0.82rem] font-bold text-[#0f172a]">ยืนยัน Password</span>
          <input
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            type="password"
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
            className={authInputClass}
            placeholder="กรอกรหัสผ่านอีกครั้ง"
          />
        </label>
      </div>

      {error ? <ErrorBox>{error}</ErrorBox> : null}

      <div className="mt-6 grid gap-3">
        <button type="submit" className={authPrimaryButtonClass} disabled={pending}>
          {pending ? "กำลังสร้างบัญชี..." : "สร้างบัญชีร้าน"}
        </button>
        <Link href="/login" className={`${authSecondaryButtonClass} w-full`}>
          กลับไปหน้าเข้าสู่ระบบ
        </Link>
        <p className="m-0 text-center text-[0.78rem] leading-relaxed text-[#64748b]">PIN จะตั้งในขั้นตอน login ครั้งแรก</p>
      </div>
    </form>
  );
}
