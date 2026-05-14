"use client";

import { useEffect, useState } from "react";
import { navItems } from "./landing-nav-items";
import styles from "./page.module.css";

export function LandingNav() {
  const [activeId, setActiveId] = useState(navItems[0]?.id || "");

  useEffect(() => {
    const sections = navItems.map((item) => document.getElementById(item.id)).filter((section): section is HTMLElement => Boolean(section));

    if (sections.length === 0) {
      return undefined;
    }

    function syncActiveSection() {
      const referenceY = window.scrollY + Math.max(96, window.innerHeight * 0.38);
      const currentSection = sections.reduce((current, section) => {
        if (section.offsetTop <= referenceY) {
          return section;
        }

        return current;
      }, sections[0]);

      setActiveId(currentSection.id);
    }

    syncActiveSection();
    window.addEventListener("scroll", syncActiveSection, { passive: true });
    window.addEventListener("resize", syncActiveSection);

    return () => {
      window.removeEventListener("scroll", syncActiveSection);
      window.removeEventListener("resize", syncActiveSection);
    };
  }, []);

  return (
    <nav className={styles["landing-nav"]} aria-label="เมนูหน้าแรก">
      {navItems.map((item) => (
        <a key={item.id} href={item.href} aria-current={activeId === item.id ? "page" : undefined}>
          {item.label}
        </a>
      ))}
    </nav>
  );
}
