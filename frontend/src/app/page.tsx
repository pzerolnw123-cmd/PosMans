import Link from "next/link";
import { getCurrentSession } from "@/lib/session";

const productHighlights = [
  {
    title: "ขายหน้าร้านเร็ว",
    copy: "เปิดบิลไว รองรับงานหน้าร้านและการจัดการคำสั่งซื้อในหน้าจอเดียว",
  },
  {
    title: "หลังบ้านเข้าใจง่าย",
    copy: "เจ้าของร้านดูภาพรวมยอดขาย สต็อก และสิทธิ์ผู้ใช้งานได้แบบไม่ซับซ้อน",
  },
  {
    title: "แยกระบบชัดเจน",
    copy: "Frontend และ backend แยกบทบาท ทำให้ขยายระบบและดูแลความปลอดภัยได้ง่ายขึ้น",
  },
];

const featurePillars = [
  "แดชบอร์ดสำหรับเจ้าของร้าน",
  "ระบบสิทธิ์ Super Admin และ Owner",
  "Session และ auth แบบปลอดภัย",
  "พร้อมต่อยอดสินค้า สต็อก และรายงาน",
];

export default async function HomePage() {
  const session = await getCurrentSession();
  const primaryHref = session ? "/admin" : "/login";
  const primaryLabel = session ? "ไปที่แดชบอร์ด" : "เข้าสู่ระบบ";

  return (
    <main className="relative overflow-hidden">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 pb-12 pt-6 lg:px-10 lg:pb-16 lg:pt-8">
        <header className="flex items-center justify-between rounded-full border border-white/70 bg-white/70 px-5 py-4 shadow-[0_12px_35px_rgba(25,32,29,0.08)] backdrop-blur">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--accent-deep)]">POS MANS</p>
            <p className="mt-1 text-sm text-[var(--muted)]">Smart POS platform for modern stores</p>
          </div>

          <nav className="hidden items-center gap-6 text-sm text-[var(--muted)] md:flex">
            <a href="#features" className="transition hover:text-[var(--foreground)]">
              ฟีเจอร์
            </a>
            <a href="#workflow" className="transition hover:text-[var(--foreground)]">
              การใช้งาน
            </a>
            <Link
              href="/login"
              className="rounded-full border border-[var(--border)] bg-white/80 px-4 py-2 font-medium text-[var(--foreground)] transition hover:border-[var(--accent)]"
            >
              Login
            </Link>
          </nav>
        </header>

        <div className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:py-16">
          <section className="space-y-8">
            <div className="space-y-5">
              <span className="inline-flex rounded-full border border-white/80 bg-white/75 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-deep)] shadow-[0_8px_24px_rgba(29,31,30,0.08)]">
                Built for Store Owners
              </span>
              <div className="max-w-3xl space-y-5">
                <h1 className="text-5xl font-semibold leading-[0.94] tracking-[-0.07em] text-[var(--foreground)] sm:text-6xl lg:text-7xl">
                  ระบบ POS ที่ช่วยให้ร้านขายไวขึ้น และจัดการหลังบ้านได้ชัดขึ้น
                </h1>
                <p className="max-w-2xl text-base leading-8 text-[var(--muted)] sm:text-lg">
                  POS MANS ออกแบบมาสำหรับร้านที่อยากมีหน้าขายที่คล่องตัว และมีหลังบ้านที่เจ้าของร้านเข้าใจได้ทันที
                  ตั้งแต่ยอดขาย สต็อก ไปจนถึงการควบคุมสิทธิ์ของผู้ใช้งานในระบบ
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Link
                href={primaryHref}
                className="inline-flex items-center justify-center rounded-full bg-[var(--foreground)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent)]"
              >
                {primaryLabel}
              </Link>
              <a
                href="#features"
                className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-white/80 px-6 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)]"
              >
                ดูภาพรวมระบบ
              </a>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {productHighlights.map((item) => (
                <article key={item.title} className="rounded-[28px] border border-white/80 bg-white/75 p-5 shadow-[0_14px_34px_rgba(28,33,31,0.08)]">
                  <h2 className="text-lg font-semibold text-[var(--foreground)]">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.copy}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="relative">
            <div className="absolute -left-4 top-8 h-28 w-28 rounded-full bg-[rgba(217,72,95,0.12)] blur-2xl" />
            <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-[rgba(81,129,119,0.14)] blur-2xl" />

            <div className="glass-panel relative overflow-hidden rounded-[36px] p-6 sm:p-8">
              <div className="absolute inset-x-0 top-0 h-28 bg-[linear-gradient(180deg,rgba(217,72,95,0.16),transparent)]" />
              <div className="relative space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-deep)]">Owner View</p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-[var(--foreground)]">
                      คุมร้านจากภาพรวมเดียว
                    </h2>
                  </div>
                  <div className="rounded-full border border-white/70 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--foreground)]">
                    Live Ready
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <article className="rounded-[28px] border border-white/80 bg-white/85 p-5">
                    <p className="text-sm text-[var(--muted)]">ยอดขายวันนี้</p>
                    <h3 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-[var(--foreground)]">THB 28,450</h3>
                    <p className="mt-2 text-sm text-emerald-700">+12.4% จากเมื่อวาน</p>
                  </article>

                  <article className="rounded-[28px] border border-white/80 bg-[rgba(30,35,32,0.95)] p-5 text-white">
                    <p className="text-sm text-white/70">ผู้ใช้งานในระบบ</p>
                    <h3 className="mt-3 text-4xl font-semibold tracking-[-0.05em]">2 Roles</h3>
                    <p className="mt-2 text-sm text-white/70">Super Admin สำหรับทีมคุณ และ Owner สำหรับลูกค้า</p>
                  </article>
                </div>

                <div id="workflow" className="rounded-[32px] border border-white/80 bg-white/80 p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-deep)]">Workflow</p>
                      <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
                        จากหน้าร้านสู่หลังบ้านอย่างเป็นระบบ
                      </h3>
                    </div>
                    <span className="rounded-full bg-[rgba(217,72,95,0.1)] px-3 py-2 text-xs font-semibold text-[var(--accent-deep)]">
                      Clean split architecture
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3">
                    {[
                      "จัดการการล็อกอินและ session ผ่าน backend",
                      "ให้เจ้าของร้านเข้าถึงข้อมูลเฉพาะร้านตัวเอง",
                      "เปิดทางต่อยอดสินค้า สต็อก รายงาน และ POS checkout",
                    ].map((item) => (
                      <div
                        key={item}
                        className="rounded-[22px] border border-white/70 bg-[rgba(255,255,255,0.85)] px-4 py-4 text-sm text-[var(--foreground)]"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <section id="features" className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="glass-panel rounded-[32px] p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-deep)]">Why it works</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[var(--foreground)]">
              โครงสร้างพร้อมโตสำหรับงานขายจริง
            </h2>
            <p className="mt-4 text-base leading-7 text-[var(--muted)]">
              หน้าแรกนี้ออกแบบให้สื่อสารกับร้านค้าได้ทันทีว่า POS MANS ไม่ใช่แค่หน้าขาย แต่เป็นระบบที่มีฐานหลังบ้านพร้อมต่อยอด
              ทั้งเรื่อง auth, tenant access และ owner dashboard
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {featurePillars.map((item, index) => (
              <article key={item} className="glass-panel rounded-[28px] p-6">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-deep)]">
                  0{index + 1}
                </span>
                <h3 className="mt-3 text-xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">{item}</h3>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
