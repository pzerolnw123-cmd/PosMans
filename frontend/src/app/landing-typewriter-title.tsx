"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";

const titleText = "จัดการร้านค้าอย่างมืออาชีพ ด้วยระบบ POS ที่ครบจบในที่เดียว";
const titleLetters = Array.from(
  new Intl.Segmenter("th", { granularity: "grapheme" }).segment(titleText),
  (segment) => segment.segment,
);

export function LandingTypewriterTitle() {
  const [visibleLength, setVisibleLength] = useState(0);

  useEffect(() => {
    const shouldReduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let timeout: number | undefined;
    let currentLength = 0;

    function scheduleNextTick(delay: number) {
      timeout = window.setTimeout(() => {
        currentLength += 1;
        setVisibleLength(currentLength);

        if (currentLength >= titleLetters.length) {
          return;
        }

        scheduleNextTick(shouldReduceMotion ? 42 : 82);
      }, delay);
    }

    scheduleNextTick(shouldReduceMotion ? 180 : 520);

    return () => {
      if (timeout) {
        window.clearTimeout(timeout);
      }
    };
  }, []);

  return (
    <h1 aria-label={titleText}>
      <span aria-hidden="true">{titleLetters.slice(0, visibleLength).join("")}</span>
      <span className={styles["landing-typewriter-cursor"]} aria-hidden="true" />
    </h1>
  );
}
