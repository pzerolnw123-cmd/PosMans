import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { getWorkspaceHref } from "@/lib/workspace";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await getCurrentSession();

  if (session) {
    redirect(getWorkspaceHref(session.user));
  }

  return (
    <main className="grid h-dvh overflow-hidden [@media(max-height:620px)]:h-auto [@media(max-height:620px)]:overflow-auto">
      <div className="mx-auto grid h-full w-[min(1400px,calc(100%-32px))] py-3 max-[1180px]:w-[min(100%-24px,100%)] max-[720px]:w-[min(100%-16px,100%)] max-[720px]:py-2 [@media(max-height:620px)]:h-auto">
        <section className="grid min-h-0 items-center gap-[18px] [grid-template-columns:minmax(0,0.92fr)_minmax(420px,0.72fr)] max-[1180px]:grid-cols-[minmax(0,0.86fr)_minmax(390px,0.74fr)] max-[900px]:grid-cols-1 max-[900px]:items-start">
          <article className="grid min-h-0 gap-4 rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)] backdrop-blur-[14px] max-[1180px]:p-5 max-[900px]:hidden">
            <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[var(--eyebrow)]">Login Experience</p>
            <h1 className="m-0 max-w-[15ch] text-[clamp(2rem,3.1vw,3.35rem)] leading-[0.96] tracking-[-0.065em]">
              เข้าสู่ระบบแบบเป็นขั้นตอน และยังคงหน้าตาเดียวกับระบบจัดการร้าน
            </h1>
            <p className="m-0 max-w-[64ch] text-[0.94rem] leading-[1.55] text-[var(--foreground-soft)]">
              หน้า login ใหม่นี้ดึงภาษาดีไซน์เดียวกับหน้าตั้งค่าร้านมาใช้ทั้งหมด เพื่อให้การเริ่มต้นใช้งานรู้สึกต่อเนื่อง ไม่ใช่คนละระบบกับหลังบ้าน
            </p>

            <div className="grid grid-cols-3 gap-3">
              {["Password", "PIN", "Workspace"].map((item, index) => (
                <div key={item} className="rounded-[14px] border border-[var(--border)] [background:var(--panel-elevated)] p-4">
                  <span className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[var(--eyebrow)]">Step {index + 1}</span>
                  <strong className="mt-2 block text-[1rem] text-[var(--foreground)]">{item}</strong>
                </div>
              ))}
            </div>
          </article>

          <div className="grid min-h-0 items-center justify-items-end max-[900px]:h-full max-[900px]:justify-items-center">
            <LoginForm />
          </div>
        </section>
      </div>
    </main>
  );
}

