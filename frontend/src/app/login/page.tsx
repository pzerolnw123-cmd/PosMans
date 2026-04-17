import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { getWorkspaceHref } from "@/lib/workspace";
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
      <div className="app-frame">
        <div className="topbar">
          <div>
            <p className="eyebrow-label">Secure Access</p>
            <p className="muted-text">Username + PIN flow redesigned to match the new backoffice direction</p>
          </div>
          <Link href="/" className="secondary-button">
            กลับหน้าแรก
          </Link>
        </div>

        <section className="login-layout" style={{ gridTemplateColumns: "minmax(0, 0.98fr) minmax(0, 0.9fr)", marginTop: 18 }}>
          <article className="hero-card">
            <p className="eyebrow-label">Login Experience</p>
            <h1 className="hero-title">เข้าสู่ระบบแบบเป็นขั้นตอน และยังคงหน้าตาเดียวกับระบบจัดการร้าน</h1>
            <p className="hero-copy">
              หน้า login ใหม่นี้ดึงภาษาดีไซน์เดียวกับหน้าตั้งค่าร้านมาใช้ทั้งหมด
              เพื่อให้การเริ่มต้นใช้งานรู้สึกต่อเนื่อง ไม่ใช่คนละระบบกับหลังบ้าน
            </p>

            <div className="settings-grid" style={{ marginTop: 22 }}>
              {loginPoints.map((item, index) => (
                <div key={item} className="inline-preview">
                  <div>
                    <h3>จุดเด่น {index + 1}</h3>
                    <p className="muted-text">{item}</p>
                  </div>
                  <span className="ghost-pill">Flow</span>
                </div>
              ))}
            </div>
          </article>

          <div className="auth-shell">
            <LoginForm />
          </div>
        </section>
      </div>
    </main>
  );
}
