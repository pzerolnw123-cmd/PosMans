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
    let timeout: number | undefined;
    let currentLength = 0;
    let direction: "typing" | "erasing" = "typing";

    function scheduleNextTick(delay: number) {
      timeout = window.setTimeout(() => {
        if (direction === "typing") {
          currentLength += 1;
          setVisibleLength(currentLength);

          if (currentLength >= titleLetters.length) {
            direction = "erasing";
            scheduleNextTick(3600);
            return;
          }

          scheduleNextTick(82);
          return;
        }

        currentLength -= 1;
        setVisibleLength(currentLength);

        if (currentLength <= 0) {
          direction = "typing";
          scheduleNextTick(700);
          return;
        }

        scheduleNextTick(24);
      }, delay);
    }

    scheduleNextTick(520);

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
