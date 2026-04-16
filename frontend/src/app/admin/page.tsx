import { requireSession } from "@/lib/session";
import { LogoutButton } from "./logout-button";

const quickStats = [
  { label: "Today sales", value: "THB 0.00", hint: "Connect real sales totals from the backend next." },
  { label: "Open tickets", value: "0", hint: "Ready for parked bills and hold-order flows." },
  { label: "Low stock items", value: "0", hint: "Pair this with stock tracking and reorder alerts." },
];

const nextSteps = [
  "Connect products, categories, and stock tables by store.",
  "Build POS checkout, held bills, and shift flows.",
  "Add fine-grained permissions for each store role.",
  "Extend daily, monthly, and audit reporting.",
];

function formatRoleLabel(session: Awaited<ReturnType<typeof requireSession>>) {
  if (session.user.platformRole !== "NONE") {
    return `Platform ${session.user.platformRole}`;
  }

  if (session.user.storeRole) {
    return `Store ${session.user.storeRole}`;
  }

  return "Unassigned";
}

export default async function AdminDashboardPage() {
  const session = await requireSession();
  const roleLabel = formatRoleLabel(session);
  const storeLabel = session.user.store ? `Store ${session.user.store.name}` : "No store assigned";

  return (
    <main className="min-h-screen px-6 py-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="glass-panel flex flex-col gap-6 rounded-[32px] p-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent-deep)]">
              POS MANS Control Room
            </p>
            <div>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
                Welcome back, {session.user.displayName}
              </h1>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {roleLabel} · {storeLabel} · Backend auth now understands platform and store access separately.
              </p>
            </div>
          </div>

          <LogoutButton />
        </header>

        <section className="grid gap-4 lg:grid-cols-3">
          {quickStats.map((item) => (
            <article key={item.label} className="glass-panel rounded-[28px] p-6">
              <p className="text-sm text-[var(--muted)]">{item.label}</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
                {item.value}
              </h2>
              <p className="mt-2 text-sm text-[var(--muted)]">{item.hint}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="glass-panel rounded-[32px] p-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--accent-deep)]">
                Architecture Split
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">What moved into the backend</h2>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {[
                ["Auth API", "Login, logout, session lookup, and CSRF now live in Express."],
                ["Identity", "Users can now belong to the platform team or to a specific store."],
                ["Session", "Session cookies and rolling expiry are enforced on the backend."],
                ["Uploads", "Upload signing is protected by the new access model."],
              ].map(([title, copy]) => (
                <div key={title} className="rounded-[24px] border border-white/80 bg-white/80 p-5">
                  <h3 className="text-base font-semibold text-[var(--foreground)]">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{copy}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="glass-panel rounded-[32px] p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--accent-deep)]">
              Next Build Queue
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
              What we should build next
            </h2>
            <ul className="mt-5 space-y-3">
              {nextSteps.map((step) => (
                <li
                  key={step}
                  className="rounded-[20px] border border-white/80 bg-white/80 px-4 py-4 text-sm leading-6 text-[var(--foreground)]"
                >
                  {step}
                </li>
              ))}
            </ul>
          </article>
        </section>
      </div>
    </main>
  );
}
