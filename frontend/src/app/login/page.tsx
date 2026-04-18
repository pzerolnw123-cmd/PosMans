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
      <div className="mx-auto w-[min(1400px,calc(100%-32px))] px-0 pb-7 pt-[18px] max-[720px]:w-[min(100%-20px,100%)] max-[720px]:pt-2.5">
        <div className="flex items-center justify-between gap-4 rounded-[18px] border border-[var(--border)] bg-[rgba(22,27,38,0.85)] px-5 py-4 shadow-[var(--shadow-soft)] max-[720px]:flex-col max-[720px]:items-stretch">
          <div>
            <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[#6b7a94]">Secure Access</p>
            <p className="mt-1 text-[0.92rem] text-[var(--foreground-soft)]">Username + PIN flow redesigned to match the new backoffice direction</p>
          </div>
          <Link
            href="/"
            className="inline-flex min-h-[42px] items-center justify-center gap-[10px] rounded-[10px] border border-[var(--border)] bg-[rgba(22,27,38,0.8)] px-[18px] font-bold text-[var(--foreground)] transition hover:-translate-y-px hover:border-[var(--border-strong)] hover:shadow-[rgba(0,0,0,0.15)_0_5px_10px]"
          >
            กลับหน้าแรก
          </Link>
        </div>

        <section className="mt-[18px] grid gap-[18px] [grid-template-columns:minmax(0,0.98fr)_minmax(0,0.9fr)] max-[1180px]:grid-cols-1">
          <article className="min-h-full rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-7 shadow-[var(--shadow-card)] backdrop-blur-[14px]">
            <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[#6b7a94]">Login Experience</p>
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
                  className="flex justify-between gap-[14px] rounded-[14px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(22,27,38,0.96)_0%,rgba(18,22,34,0.96)_100%)] p-[18px] max-[720px]:flex-col"
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

          <div className="grid min-h-[calc(100vh-52px)] items-center max-[1180px]:min-h-0">
            <LoginForm />
          </div>
        </section>
      </div>
    </main>
  );
}
