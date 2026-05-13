import { redirect } from "next/navigation";
import { AuthHeroPanel } from "@/components/auth-hero-panel";
import { getCurrentSession } from "@/lib/session";
import { getWorkspaceHref } from "@/lib/workspace";
import { RegisterForm } from "./register-form";

export default async function RegisterPage() {
  const session = await getCurrentSession();

  if (session) {
    redirect(getWorkspaceHref(session.user));
  }

  return (
    <main className="grid min-h-dvh overflow-hidden bg-white text-[#0f172a] md:h-dvh md:grid-cols-[45%_55%]">
      <section className="grid min-h-dvh place-items-center bg-white px-8 py-10 max-[720px]:px-5 md:min-h-dvh">
        <RegisterForm />
      </section>
      <AuthHeroPanel />
    </main>
  );
}
