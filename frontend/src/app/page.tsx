import Link from "next/link";
import { getCurrentSession } from "@/lib/session";
import { getWorkspaceHref } from "@/lib/workspace";
import { PanelCard } from "@/components/backoffice-shell";
import { ghostPillClass } from "@/components/ui-primitives";

const featureCards = [
  {
    title: "ขายไว",
    copy: "หน้า POS และหลังบ้านใช้ภาษาภาพแบบเดียวกัน ช่วยให้ทีมใหม่เข้าใจระบบเร็วและใช้งานมั่นใจขึ้น",
  },
  {
    title: "จัดการร้านชัด",
    copy: "แยกส่วนสินค้า รายงาน การตั้งค่า และสิทธิ์ผู้ใช้เป็นบล็อกชัดเจนตาม flow จริงของร้านอาหาร",
  },
  {
    title: "พร้อมต่อยอด",
    copy: "ดีไซน์นี้เปิดทางให้เพิ่มหน้าสินค้า สต็อก รายงาน และ checkout โดยยังรักษาโครงสร้างเดิมได้",
  },
];

const statCards = [
  { label: "Sections Ready", value: "3", hint: "Home, Login, Owner" },
  { label: "Design Tokens", value: "1 system", hint: "Shared cards, inputs, buttons, sidebar" },
  { label: "Visual Direction", value: "Store console", hint: "Clean glass panels with soft blue glow" },
];

export default async function HomePage() {
  const session = await getCurrentSession();
  const primaryHref = session ? getWorkspaceHref(session.user) : "/login";
  const primaryLabel = session ? "เปิดหลังบ้าน" : "เข้าสู่ระบบ";

  return (
    <main>
      <div className="mx-auto w-[min(1400px,calc(100%-32px))] px-0 pb-7 pt-[18px] max-[1180px]:w-[min(100%-24px,100%)] max-[720px]:w-[min(100%-16px,100%)] max-[720px]:pt-2.5">
        <div className="flex items-center justify-between gap-4 rounded-[18px] border border-[var(--border)] bg-[rgba(22,27,38,0.85)] px-5 py-4 shadow-[var(--shadow-soft)] max-[820px]:px-4 max-[720px]:flex-col max-[720px]:items-stretch max-[640px]:px-3.5">
          <div>
            <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[#6b7a94]">POS MANS</p>
            <p className="mt-1 max-w-[52ch] text-[0.92rem] leading-[1.6] text-[var(--foreground-soft)]">Store-first interface system inspired by your reference screen</p>
          </div>
          <div className="flex flex-wrap justify-end gap-[10px] max-[820px]:w-full max-[820px]:justify-stretch max-[820px]:[&>*]:flex-1 max-[720px]:[&>*]:w-full">
            <Link
              href="/login"
              className="inline-flex min-h-[42px] items-center justify-center gap-[10px] rounded-[10px] border border-[var(--border)] bg-[rgba(22,27,38,0.8)] px-[18px] font-bold text-[var(--foreground)] transition hover:-translate-y-px hover:border-[var(--border-strong)] hover:shadow-[rgba(0,0,0,0.15)_0_5px_10px]"
            >
              เข้าสู่ระบบ
            </Link>
            <Link
              href={primaryHref}
              className="inline-flex min-h-[42px] items-center justify-center gap-[10px] rounded-[10px] border border-transparent bg-[linear-gradient(135deg,var(--brand)_0%,#8070f0_100%)] px-[18px] font-bold text-white shadow-[rgba(108,92,231,0.18)_0_6px_14px] transition hover:-translate-y-px"
            >
              {primaryLabel}
            </Link>
          </div>
        </div>

        <section className="mt-[18px] grid gap-[18px] grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] max-[1280px]:grid-cols-1 max-[820px]:gap-4">
          <article className="min-h-full rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-7 shadow-[var(--shadow-card)] backdrop-blur-[14px] max-[820px]:p-5 max-[640px]:p-4">
            <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[#6b7a94]">Complete UI Refresh</p>
            <h1 className="mt-[10px] max-w-[12ch] text-[clamp(2rem,2.9vw,3.3rem)] leading-[0.98] tracking-[-0.065em]">
              POS หลังบ้านที่ดูพร้อมใช้งานตั้งแต่หน้าบ้านถึงหน้าตั้งค่า
            </h1>
            <p className="text-[var(--foreground-soft)]">
              เราปรับหน้าเว็บทุกหน้าที่มีอยู่ให้ไปในทิศทางเดียวกับภาพอ้างอิง: sidebar ชัด, card โปร่งสะอาด, ปุ่มเด่นอ่านง่าย,
              และ form ที่โฟกัสกับงานเจ้าของร้านจริง
            </p>

            <div className="mt-[22px] flex flex-wrap justify-start gap-[10px] max-[720px]:[&>*]:w-full">
              <Link
                href={primaryHref}
                className="inline-flex min-h-[42px] items-center justify-center gap-[10px] rounded-[10px] border border-transparent bg-[linear-gradient(135deg,var(--brand)_0%,#8070f0_100%)] px-[18px] font-bold text-white shadow-[rgba(108,92,231,0.18)_0_6px_14px] transition hover:-translate-y-px"
              >
                {primaryLabel}
              </Link>
              <a
                href="#overview"
                className="inline-flex min-h-[42px] items-center justify-center gap-[10px] rounded-[10px] border border-[var(--border)] bg-[rgba(22,27,38,0.8)] px-[18px] font-bold text-[var(--foreground)] transition hover:-translate-y-px hover:border-[var(--border-strong)] hover:shadow-[rgba(0,0,0,0.15)_0_5px_10px]"
              >
                ดูภาพรวม
              </a>
            </div>
          </article>

          <PanelCard
            eyebrow="Preview"
            title="FastManFoods"
            description="ตัวอย่างทิศทาง UI ที่ยึดจากหน้าตั้งค่าร้านในภาพ และขยายให้ครอบคลุมทั้งระบบ"
          >
            <div className="mt-5 grid grid-cols-3 gap-[14px] max-[980px]:grid-cols-2 max-[720px]:grid-cols-1">
              {statCards.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-[var(--border)] bg-[linear-gradient(180deg,rgba(22,27,38,0.94)_0%,rgba(18,22,34,0.94)_100%)] p-[18px]"
                >
                  <h3 className="m-0 text-[1.08rem] font-bold tracking-[-0.03em]">{item.label}</h3>
                  <strong className="mt-[10px] block text-[clamp(1.55rem,4vw,2rem)] leading-none tracking-[-0.05em]">{item.value}</strong>
                  <p className="mt-1 text-[0.92rem] text-[var(--foreground-soft)]">{item.hint}</p>
                </div>
              ))}
            </div>
          </PanelCard>
        </section>

        <section id="overview" className="mt-[18px] grid grid-cols-3 gap-[18px] max-[1180px]:grid-cols-2 max-[820px]:gap-4 max-[720px]:grid-cols-1">
          {featureCards.map((item) => (
            <article key={item.title} className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-[18px] shadow-[var(--shadow-card)] backdrop-blur-[14px]">
              <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[#6b7a94]">Feature</p>
              <h3 className="my-[10px] text-[1.36rem] tracking-[-0.04em]">{item.title}</h3>
              <p className="mt-1 text-[0.92rem] text-[var(--foreground-soft)]">{item.copy}</p>
            </article>
          ))}
        </section>

        <section className="mt-[18px] grid grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] gap-[18px] max-[1280px]:grid-cols-1 max-[820px]:gap-4">
          <PanelCard eyebrow="Included Pages" title="สิ่งที่ถูกยกดีไซน์ใหม่แล้ว" description="หน้าที่ผู้ใช้แตะจริงตอนนี้ทั้งหมดอยู่ใน visual language ชุดเดียวกันแล้ว">
            <div className="mt-4 grid gap-[14px]">
              {[
                "หน้าแรกสำหรับแนะนำระบบและพาไปยัง flow ที่ใช้งานต่อ",
                "หน้าเข้าสู่ระบบพร้อมสองขั้นตอน username/password และ PIN keypad",
                "หน้า owner ที่วางเป็นหน้าตั้งค่าร้านตามภาพอ้างอิง พร้อม sidebar และ profile card",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-[var(--border)] bg-[linear-gradient(180deg,rgba(22,27,38,0.94)_0%,rgba(18,22,34,0.94)_100%)] p-[18px]"
                >
                  <p className="m-0 text-[0.92rem] text-[var(--foreground-soft)]">{item}</p>
                </div>
              ))}
            </div>
          </PanelCard>

          <PanelCard eyebrow="Experience" title="แนวทาง UX ที่ยึดไว้" description="ลดความรก เพิ่มการอ่านค่าเร็ว และจัดความสำคัญด้วยระยะห่าง น้ำหนักตัวอักษร และสถานะที่ชัด">
            <div className="mt-4 grid gap-[14px]">
              {[
                ["Sidebar ก่อน", "ผู้ใช้รู้ทันทีว่าตอนนี้อยู่ส่วนไหนของระบบ"],
                ["Card เป็นโมดูล", "ทุกพื้นที่ทำงานแยกหน้าที่ชัดเหมือน mockup"],
                ["Action เด่น", "ปุ่มหลักใช้สีแบรนด์และวางชิดมุมล่างขวาตาม flow บันทึก"],
              ].map(([title, copy]) => (
                <div
                  key={title}
                  className="flex justify-between gap-[14px] rounded-[14px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(22,27,38,0.96)_0%,rgba(18,22,34,0.96)_100%)] p-[18px] max-[720px]:flex-col"
                >
                  <div>
                    <h3 className="m-0 text-[1.08rem] font-bold tracking-[-0.03em]">{title}</h3>
                    <p className="mt-1 text-[0.92rem] text-[var(--foreground-soft)]">{copy}</p>
                  </div>
                  <span className={`${ghostPillClass} self-start max-[720px]:self-auto`}>UX</span>
                </div>
              ))}
            </div>
          </PanelCard>
        </section>
      </div>
    </main>
  );
}
