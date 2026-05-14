import { redirect } from "next/navigation";
import { AuthFloatingBackground } from "@/components/auth-floating-background";
import { AuthHeroPanel } from "@/components/auth-hero-panel";
import { getCurrentSession } from "@/lib/session";
import { getWorkspaceHref } from "@/lib/workspace";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getCurrentSession();
  const resolvedSearchParams = await searchParams;
  const registered = resolvedSearchParams.registered === "1";

  if (session) {
    redirect(getWorkspaceHref(session.user));
  }

  return (
    <main className="grid min-h-dvh overflow-hidden bg-white text-[#0f172a] md:h-dvh md:grid-cols-[45%_55%]">
      <section className="relative grid min-h-dvh place-items-center overflow-hidden bg-white px-8 py-10 max-[720px]:px-5 md:min-h-dvh">
        <AuthFloatingBackground />
        <LoginForm initialNotice={registered ? "สร้างบัญชีแล้ว กรุณาเข้าสู่ระบบ" : null} />
      </section>
      <AuthHeroPanel />
    </main>
  );
}
