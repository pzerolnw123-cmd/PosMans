"use client";

import { useContext } from "react";
import { OwnerProfileContext } from "@/components/backoffice-shell";
import { eyebrowTextClass } from "@/components/ui-primitives";
import { useOwnerLogo } from "@/components/owner-settings-client/logo-client";

export function ProfileHeaderInjector({ className = "" }: { className?: string }) {
  const profile = useContext(OwnerProfileContext);
  const { previewUrl } = useOwnerLogo();

  if (!profile) return null;

  return (
    <div
      className={`h-[156px] min-h-[156px] max-h-[156px] items-start justify-between overflow-hidden rounded-none border border-[var(--border)] bg-[var(--surface)] px-5 py-6 shadow-[var(--shadow-soft)] max-[1180px]:h-auto max-[1180px]:min-h-0 max-[1180px]:max-h-none max-[1024px]:px-4 max-[1024px]:py-5 max-[820px]:px-4 max-[820px]:py-5 max-[720px]:flex-col max-[720px]:items-stretch max-[720px]:gap-4 max-[640px]:px-3.5 max-[640px]:py-4 [@media(max-height:860px)_and_(max-width:820px)]:h-auto [@media(max-height:860px)_and_(max-width:820px)]:min-h-0 [@media(max-height:860px)_and_(max-width:820px)]:max-h-none ${className}`.trim()}
    >
      <div className="flex items-center gap-5 max-[720px]:gap-4">
        {previewUrl ? (
          <div className="flex h-[108px] w-[108px] shrink-0 items-center justify-center overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--surface-muted)] shadow-[var(--shadow-soft)] max-[720px]:h-[80px] max-[720px]:w-[80px]">
            <span
              className="h-[74%] w-[74%] bg-contain bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${previewUrl})` }}
              role="img"
              aria-label="โลโก้ร้าน"
            />
          </div>
        ) : null}
        <div>
          <p className={eyebrowTextClass}>STATUS STORE</p>
          <h2 className="my-2.5 text-[clamp(2.1rem,2.8vw,3.2rem)] font-bold leading-[1] tracking-[-0.035em]">
            <span className="[background-image:var(--status-text-gradient)] bg-clip-text font-black tracking-normal text-transparent drop-shadow-[var(--status-text-shadow)] pb-1">
              {profile.profileName}
            </span>
          </h2>
          {profile.profileMeta ? (
            <p className="m-0 max-w-[58ch] leading-[1.65] text-[var(--foreground-soft)]">
              {profile.profileMeta} • {profile.profileRole}
            </p>
          ) : null}
        </div>
      </div>
      {profile.profileAction ? (
        <div className="flex self-end flex-wrap items-center gap-3 max-[720px]:self-auto max-[720px]:justify-end">{profile.profileAction}</div>
      ) : null}
    </div>
  );
}
