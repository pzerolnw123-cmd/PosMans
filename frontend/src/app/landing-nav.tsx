"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";

const navItems = [
  { href: "#top", id: "top", label: "Home" },
  { href: "#features", id: "features", label: "Features" },
  { href: "#showcase", id: "showcase", label: "Overview" },
  { href: "#pricing", id: "pricing", label: "Pricing" },
];

export function LandingNav() {
  const [activeId, setActiveId] = useState("top");

  useEffect(() => {
    const sections = navItems
      .map((item) => document.getElementById(item.id))
      .filter((section): section is HTMLElement => Boolean(section));

    if (!sections.length) {
      return undefined;
    }

    function updateActiveSection() {
      const activationOffset = 160;
      let currentId = sections[0].id;

      for (const section of sections) {
        if (section.getBoundingClientRect().top <= activationOffset) {
          currentId = section.id;
        }
      }

      setActiveId(currentId);
    }

    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);

    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
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
