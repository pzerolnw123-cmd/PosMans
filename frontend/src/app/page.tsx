import Link from "next/link";
import { getCurrentSession } from "@/lib/session";
import { getWorkspaceHref } from "@/lib/workspace";
import { PanelCard } from "@/components/backoffice-shell";

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
      <div className="app-frame">
        <div className="topbar">
          <div>
            <p className="eyebrow-label">POS MANS</p>
            <p className="muted-text">Store-first interface system inspired by your reference screen</p>
          </div>
          <div className="button-row">
            <Link href="/login" className="secondary-button">
              เข้าสู่ระบบ
            </Link>
            <Link href={primaryHref} className="primary-button">
              {primaryLabel}
            </Link>
          </div>
        </div>

        <section className="hero-layout" style={{ marginTop: 18 }}>
          <article className="hero-card">
            <p className="eyebrow-label">Complete UI Refresh</p>
            <h1 className="hero-title">POS หลังบ้านที่ดูพร้อมใช้งานตั้งแต่หน้าบ้านถึงหน้าตั้งค่า</h1>
            <p className="hero-copy">
              เราปรับหน้าเว็บทุกหน้าที่มีอยู่ให้ไปในทิศทางเดียวกับภาพอ้างอิง:
              sidebar ชัด, card โปร่งสะอาด, ปุ่มเด่นอ่านง่าย, และ form ที่โฟกัสกับงานเจ้าของร้านจริง
            </p>

            <div className="button-row" style={{ justifyContent: "flex-start", marginTop: 22 }}>
              <Link href={primaryHref} className="primary-button">
                {primaryLabel}
              </Link>
              <a href="#overview" className="secondary-button">
                ดูภาพรวม
              </a>
            </div>
          </article>

          <PanelCard
            eyebrow="Preview"
            title="FastManFoods"
            description="ตัวอย่างทิศทาง UI ที่ยึดจากหน้าตั้งค่าร้านในภาพ และขยายให้ครอบคลุมทั้งระบบ"
          >
            <div className="stats-grid" style={{ marginTop: 20 }}>
              {statCards.map((item) => (
                <div key={item.label} className="metric-card">
                  <h3>{item.label}</h3>
                  <strong>{item.value}</strong>
                  <p className="muted-text">{item.hint}</p>
                </div>
              ))}
            </div>
          </PanelCard>
        </section>

        <section id="overview" className="marketing-grid" style={{ marginTop: 18 }}>
          {featureCards.map((item) => (
            <article key={item.title} className="mini-card">
              <p className="eyebrow-label">Feature</p>
              <h3>{item.title}</h3>
              <p className="muted-text">{item.copy}</p>
            </article>
          ))}
        </section>

        <section className="content-grid" style={{ marginTop: 18 }}>
          <PanelCard
            eyebrow="Included Pages"
            title="สิ่งที่ถูกยกดีไซน์ใหม่แล้ว"
            description="หน้าที่ผู้ใช้แตะจริงตอนนี้ทั้งหมดอยู่ใน visual language ชุดเดียวกันแล้ว"
          >
            <div className="settings-grid">
              {[
                "หน้าแรกสำหรับแนะนำระบบและพาไปยัง flow ที่ใช้งานต่อ",
                "หน้าเข้าสู่ระบบพร้อมสองขั้นตอน username/password และ PIN keypad",
                "หน้า owner ที่วางเป็นหน้าตั้งค่าร้านตามภาพอ้างอิง พร้อม sidebar และ profile card",
              ].map((item) => (
                <div key={item} className="metric-card">
                  <p className="muted-text" style={{ marginTop: 0 }}>
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </PanelCard>

          <PanelCard
            eyebrow="Experience"
            title="แนวทาง UX ที่ยึดไว้"
            description="ลดความรก เพิ่มการอ่านค่าเร็ว และจัดความสำคัญด้วยระยะห่าง น้ำหนักตัวอักษร และสถานะที่ชัด"
          >
            <div className="settings-grid">
              {[
                ["Sidebar ก่อน", "ผู้ใช้รู้ทันทีว่าตอนนี้อยู่ส่วนไหนของระบบ"],
                ["Card เป็นโมดูล", "ทุกพื้นที่ทำงานแยกหน้าที่ชัดเหมือน mockup"],
                ["Action เด่น", "ปุ่มหลักใช้สีแบรนด์และวางชิดมุมล่างขวาตาม flow บันทึก"],
              ].map(([title, copy]) => (
                <div key={title} className="inline-preview">
                  <div>
                    <h3>{title}</h3>
                    <p className="muted-text">{copy}</p>
                  </div>
                  <span className="ghost-pill">UX</span>
                </div>
              ))}
            </div>
          </PanelCard>
        </section>
      </div>
    </main>
  );
}
