"use client";

import Image from "next/image";

const authHeroImages = [
  "/auth-hero-1.png",
  "/auth-hero-2.png",
  "/auth-hero-3.png",
  "/auth-hero-4.png",
];

export function AuthHeroPanel() {
  return (
    <section className="relative hidden min-h-dvh overflow-hidden bg-white md:block">
      {authHeroImages.map((src, index) => (
        <Image
          key={src}
          src={src}
          alt=""
          fill
          unoptimized
          priority={index === 0}
          sizes="55vw"
          className="auth-hero-slide object-contain"
          style={{ animationDelay: `${index * 5}s` }}
        />
      ))}
      <div className="absolute bottom-6 left-1/2 z-[1] flex -translate-x-1/2 gap-2">
        {authHeroImages.map((src, index) => (
          <span
            key={`dot-${src}`}
            className="auth-hero-dot h-2 rounded-full"
            style={{ animationDelay: `${index * 5}s` }}
            aria-hidden="true"
          />
        ))}
      </div>
    </section>
  );
}
