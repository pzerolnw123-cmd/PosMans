import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { getWorkspaceHref } from "@/lib/workspace";
import { ghostPillClass } from "@/components/ui-primitives";
import { LoginForm } from "./login-form";

const loginPoints = [
  "แยกการตรวจ username/password ออกจาก PIN เพื่อให้ flow ปลอดภัยและเข้าใจง่าย",
  "ทุก input และ keypad ใช้สไตล์เดียวกับหลังบ้าน ลดความรู้สึกว่ากระโดดข้ามระบบ",
  "หน้าจอนี้ออกแบบให้พร้อมขยายไปสู่ kiosk หรือ staff login ได้ต่อทันที",
];

export default async function LoginPage() {
  const session = await getCurrentSession();

  if (session) {
    redirect(getWorkspaceHref(session.user));
  }

  return (
    <main>
      <div className="mx-auto w-[min(1400px,calc(100%-32px))] px-0 pb-7 pt-[18px] max-[1180px]:w-[min(100%-24px,100%)] max-[720px]:w-[min(100%-16px,100%)] max-[720px]:pt-2.5">
        <div className="flex items-center justify-between gap-4 rounded-[18px] border border-[var(--border)] bg-[var(--surface-glass)] px-5 py-4 shadow-[var(--shadow-soft)] max-[820px]:px-4 max-[720px]:flex-col max-[720px]:items-stretch max-[640px]:px-3.5">
          <div>
            <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[var(--eyebrow)]">Secure Access</p>
            <p className="mt-1 max-w-[52ch] text-[0.92rem] leading-[1.6] text-[var(--foreground-soft)]">Username + PIN flow redesigned to match the new backoffice direction</p>
          </div>
          <Link
            href="/"
            className="inline-flex min-h-[42px] items-center justify-center gap-[10px] rounded-[10px] border border-[var(--border)] bg-[var(--surface-muted)] px-[18px] font-bold text-[var(--foreground)] transition hover:-translate-y-px hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-hover)]"
          >
            กลับหน้าแรก
          </Link>
        </div>

        <section className="mt-[18px] grid gap-[18px] [grid-template-columns:minmax(0,0.98fr)_minmax(0,0.9fr)] max-[1280px]:grid-cols-1 max-[820px]:gap-4">
          <article className="min-h-full rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-7 shadow-[var(--shadow-card)] backdrop-blur-[14px] max-[820px]:p-5 max-[640px]:p-4">
            <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[var(--eyebrow)]">Login Experience</p>
            <h1 className="mt-[10px] max-w-[12ch] text-[clamp(2rem,2.9vw,3.3rem)] leading-[0.98] tracking-[-0.065em]">
              เข้าสู่ระบบแบบเป็นขั้นตอน และยังคงหน้าตาเดียวกับระบบจัดการร้าน
            </h1>
            <p className="text-[var(--foreground-soft)]">
              หน้า login ใหม่นี้ดึงภาษาดีไซน์เดียวกับหน้าตั้งค่าร้านมาใช้ทั้งหมด เพื่อให้การเริ่มต้นใช้งานรู้สึกต่อเนื่อง ไม่ใช่คนละระบบกับหลังบ้าน
            </p>

            <div className="mt-[22px] grid gap-[14px]">
              {loginPoints.map((item, index) => (
                <div
                  key={item}
                  className="flex justify-between gap-[14px] rounded-[14px] border border-[var(--border)] [background:var(--panel-elevated)] p-[18px] max-[720px]:flex-col"
                >
                  <div>
                    <h3 className="m-0 text-[1.08rem] font-bold tracking-[-0.03em]">จุดเด่น {index + 1}</h3>
                    <p className="mt-1 text-[0.92rem] text-[var(--foreground-soft)]">{item}</p>
                  </div>
                  <span className={ghostPillClass}>Flow</span>
                </div>
              ))}
            </div>
          </article>

          <div className="grid min-h-[calc(100vh-52px)] items-center justify-items-end max-[1280px]:min-h-0 max-[1280px]:justify-items-center">
            <LoginForm />
          </div>
        </section>
      </div>
    </main>
  );
}

