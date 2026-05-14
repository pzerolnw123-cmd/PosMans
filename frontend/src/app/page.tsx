import Image from "next/image";
import Link from "next/link";
import { getCurrentSession } from "@/lib/session";
import { getWorkspaceHref } from "@/lib/workspace";
import { features, footerPendingItems, plans, showcase } from "./landing-content";
import type { FeatureIconName } from "./landing-content";
import { LandingMobileMenu } from "./landing-mobile-menu";
import { LandingNav } from "./landing-nav";
import { LandingTypewriterTitle } from "./landing-typewriter-title";
import styles from "./page.module.css";

function cx(...names: string[]) {
  return names.map((name) => styles[name]).join(" ");
}

function FeatureIcon({ name }: { name: FeatureIconName }) {
  switch (name) {
    case "products":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 6h16v12H4z" />
          <path d="M8 10h3M8 14h8" />
        </svg>
      );
    case "reports":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 19V8M12 19V5M19 19v-9" />
          <path d="M4 19h16" />
        </svg>
      );
    case "receipts":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 8h12M7 12h10M9 16h6" />
          <path d="M5 4h14v16H5z" />
        </svg>
      );
    case "store-types":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3 4 7l8 4 8-4-8-4Z" />
          <path d="M4 12l8 4 8-4M4 17l8 4 8-4" />
        </svg>
      );
    case "screens":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 7h16v10H4z" />
          <path d="M8 21h8M12 17v4M7 11h10" />
        </svg>
      );
    case "sales":
    default:
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 7h14M7 12h10M9 17h6" />
        </svg>
      );
  }
}

export default async function HomePage() {
  const session = await getCurrentSession();
  const primaryHref = session ? getWorkspaceHref(session.user) : "/register";
  const primaryLabel = session ? "เปิดหลังบ้าน" : "สมัครสมาชิก";
  const loginHref = session ? getWorkspaceHref(session.user) : "/login";
  const loginLabel = session ? "ไปที่ระบบ" : "เข้าสู่ระบบ";

  return (
    <main id="top" className={cx("landing-page")}>
      <header className={cx("landing-header")}>
        <Link href="/" className={cx("landing-logo")} aria-label="POS MANS หน้าแรก">
          <Image src="/logo.png" alt="POS MANS" width={488} height={111} priority />
        </Link>
        <LandingNav />
        <div className={cx("landing-header-actions")}>
          <Link href={primaryHref} className={cx("landing-button", "landing-button-primary")}>
            {primaryLabel}
          </Link>
          <LandingMobileMenu primaryHref={primaryHref} primaryLabel={primaryLabel} />
        </div>
      </header>

      <section className={cx("landing-hero")}>
        <div className={cx("landing-hero-background")} aria-hidden="true">
          <span className={cx("landing-hero-background-image", "landing-hero-background-one")} />
          <span className={cx("landing-hero-background-image", "landing-hero-background-two")} />
          <span className={cx("landing-hero-background-image", "landing-hero-background-three")} />
        </div>
        <div className={cx("landing-hero-copy")}>
          <p className={cx("landing-eyebrow")}>POS SYSTEM FOR MODERN STORES</p>
          <LandingTypewriterTitle />
          <p>
            POS MANS ช่วยให้เจ้าของร้านขายหน้าร้าน จัดการสินค้า ดูรายงาน และดูแลหลังบ้านได้ในระบบเดียว
            พร้อมหน้าตาที่สะอาด ใช้ง่าย และเหมาะกับงานประจำวันของร้านจริง
          </p>
          <div className={cx("landing-hero-actions")}>
            <Link href={loginHref} className={cx("landing-button", "landing-button-primary")}>
              {loginLabel}
            </Link>
          </div>
        </div>

      </section>

      <section id="features" className={cx("landing-section", "landing-section-soft")}>
        <div className={cx("landing-section-heading")}>
          <p className={cx("landing-eyebrow")}>FEATURES</p>
          <h2>ฟีเจอร์สำคัญสำหรับเจ้าของร้าน</h2>
          <p>ออกแบบให้ครบในสิ่งที่ร้านต้องใช้ทุกวัน โดยยังอ่านง่ายและไม่ทำให้หน้าจอดูแน่นเกินไป</p>
        </div>
        <div className={cx("landing-feature-grid")}>
          {features.map((feature) => (
            <article className={cx("landing-feature-card")} key={feature.title}>
              <span className={cx("landing-feature-icon")}>
                <FeatureIcon name={feature.icon} />
              </span>
              <h3>{feature.title}</h3>
              <p>{feature.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="showcase" className={cx("landing-section", "landing-showcase")}>
        <div className={cx("landing-section-heading")}>
          <p className={cx("landing-eyebrow")}>WORKFLOW</p>
          <h2>ทุกหน้าจอสำคัญของร้าน อยู่ในระบบเดียว</h2>
          <p>ขายหน้าร้าน รับชำระเงิน เช็กบิล ดูรายงาน จัดการสินค้า และปรับหน้าร้านได้ต่อเนื่อง โดยออกแบบให้ใช้งานง่ายในจังหวะงานจริง</p>
        </div>
        <div className={cx("landing-showcase-list")}>
          {showcase.map((item, index) => (
            <article className={cx("landing-showcase-item")} key={item.title}>
              <div className={cx("landing-showcase-image")}>
                <Image src={item.image} alt={item.title} width={1920} height={1280} />
              </div>
              <div className={cx("landing-showcase-copy")}>
                <p className={cx("landing-eyebrow")}>{item.eyebrow}</p>
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
                <span>{index + 1 < 10 ? `0${index + 1}` : index + 1}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="pricing" className={cx("landing-section", "landing-section-soft", "landing-pricing-section")}>
        <div className={cx("landing-pricing")}>
          <div className={cx("landing-pricing-heading")}>
            <p className={cx("landing-eyebrow")}>PLANS</p>
            <h2>เลือกแพลนให้เหมาะกับจังหวะของร้าน</h2>
            <p>เริ่มจาก Start เพื่อทดลองใช้งาน แล้วขยับเป็น Plus เมื่อร้านต้องการขายจริงแบบไม่ติดเพดานการใช้งาน</p>
          </div>
          <div className={cx("landing-price-grid")}>
            {plans.map((plan) => (
              <article className={plan.highlighted ? cx("landing-price-card", "landing-price-card-highlight") : cx("landing-price-card")} key={plan.name}>
                <p className={cx("landing-price-eyebrow")}>{plan.eyebrow}</p>
                <h3>{plan.name}</h3>
                <strong>
                  {plan.price}
                  {plan.suffix ? <span>{plan.suffix}</span> : null}
                </strong>
                <p className={cx("landing-price-description")}>{plan.description}</p>
                <ul>
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <Link href={primaryHref} className={cx("landing-button", plan.highlighted ? "landing-button-primary" : "landing-button-secondary")}>
                  เริ่มใช้งาน
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className={cx("landing-footer")}>
        <div className={cx("landing-footer-main")}>
          <div className={cx("landing-footer-brand")}>
            <Link href="#top">POS MANS</Link>
            <p>© 2024 POS MANS. All rights reserved.</p>
          </div>
          <nav className={cx("landing-footer-nav")} aria-label="Product footer links">
            <a href="#features">Product</a>
            <a href="#showcase">Solutions</a>
            <a href="#pricing">Pricing</a>
          </nav>
          <div className={cx("landing-footer-nav")} aria-label="Company footer items">
            {footerPendingItems.map((item) => (
              <span key={item} aria-disabled="true">
                {item}
              </span>
            ))}
          </div>
        </div>
      </footer>
    </main>
  );
}
