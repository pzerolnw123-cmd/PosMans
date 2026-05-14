import { navItems } from "./landing-nav-items";
import styles from "./page.module.css";

export function LandingNav() {
  return (
    <nav className={styles["landing-nav"]} aria-label="เมนูหน้าแรก">
      {navItems.map((item) => (
        <a key={item.id} href={item.href}>
          {item.label}
        </a>
      ))}
    </nav>
  );
}
