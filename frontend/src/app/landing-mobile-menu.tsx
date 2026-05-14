"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { navItems } from "./landing-nav-items";
import styles from "./page.module.css";

type LandingMobileMenuProps = {
  primaryHref: string;
  primaryLabel: string;
};

export function LandingMobileMenu({ primaryHref, primaryLabel }: LandingMobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

  return (
    <div className={styles["landing-mobile-menu"]}>
      <button
        type="button"
        className={styles["landing-mobile-menu-button"]}
        aria-label={isOpen ? "Close menu" : "Open menu"}
        aria-expanded={isOpen}
        aria-controls="landing-mobile-menu-panel"
        onClick={() => setIsOpen((current) => !current)}
      >
        <span />
        <span />
        <span />
      </button>

      {isOpen ? (
        <div id="landing-mobile-menu-panel" className={styles["landing-mobile-menu-panel"]}>
          <nav className={styles["landing-mobile-menu-links"]} aria-label="Mobile landing menu">
            {navItems.map((item) => (
              <a key={item.id} href={item.href} onClick={() => setIsOpen(false)}>
                {item.label}
              </a>
            ))}
          </nav>
          <div className={styles["landing-mobile-menu-actions"]}>
            <Link href={primaryHref} onClick={() => setIsOpen(false)}>
              {primaryLabel}
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
