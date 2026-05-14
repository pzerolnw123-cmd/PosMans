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
      const anchorOffset = 140;
      const current = sections.reduce((nearest, section) => {
        const distance = Math.abs(section.getBoundingClientRect().top - anchorOffset);
        if (!nearest || distance < nearest.distance) {
          return { id: section.id, distance };
        }
        return nearest;
      }, null as { id: string; distance: number } | null);

      if (current) {
        setActiveId(current.id);
      }
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
