import Link from "next/link";
import { LoginForm } from "./login-form";
import { getCurrentSession } from "@/lib/session";
import { redirect } from "next/navigation";

const loginPoints = [
  "Use your assigned username only.",
  "Unlock access with a 6-digit PIN on the secure keypad.",
  "The backend still controls sessions, CSRF, and role checks.",
];

export default async function LoginPage() {
  const session = await getCurrentSession();

  if (session) {
    redirect("/admin");
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-6 py-8 lg:px-10">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-7xl flex-col gap-6">
        <div className="flex items-center justify-between rounded-full border border-white/70 bg-white/70 px-5 py-4 shadow-[0_12px_35px_rgba(25,32,29,0.08)] backdrop-blur">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--accent-deep)]">POS MANS</p>
            <p className="mt-1 text-sm text-[var(--muted)]">PIN-first access for Super Admin and Owner accounts</p>
          </div>

          <Link
            href="/"
            className="rounded-full border border-[var(--border)] bg-white/80 px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:border-[var(--accent)]"
          >
            Back to home
          </Link>
        </div>

        <div className="grid flex-1 items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="glass-panel flex min-h-[620px] flex-col justify-between rounded-[36px] p-8 lg:p-12">
            <div className="space-y-6">
              <span className="inline-flex rounded-full border border-white/80 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-deep)]">
                Secure Login
              </span>

              <div className="max-w-2xl space-y-4">
                <h1 className="text-4xl font-semibold leading-tight tracking-[-0.06em] text-[var(--foreground)] lg:text-6xl">
                  Sign in with username and unlock the dashboard using your PIN
                </h1>
                <p className="text-base leading-8 text-[var(--muted)]">
                  Each account signs in with a username and a 6-digit PIN,
                  while the backend keeps managing session security and access control behind the scenes.
                </p>
              </div>
            </div>

            <div className="grid gap-4">
              {loginPoints.map((item) => (
                <div
                  key={item}
                  className="rounded-[24px] border border-white/75 bg-white/80 px-5 py-4 text-sm leading-6 text-[var(--foreground)] shadow-[0_10px_24px_rgba(30,34,32,0.06)]"
                >
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="flex items-center justify-center">
            <LoginForm />
          </section>
        </div>
      </div>
    </main>
  );
}
