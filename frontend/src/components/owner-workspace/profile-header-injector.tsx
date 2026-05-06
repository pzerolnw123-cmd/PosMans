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
      className={`h-[156px] min-h-[156px] max-h-[156px] items-start justify-between overflow-hidden rounded-none border border-[var(--border)] bg-[var(--surface)] px-5 py-6 shadow-[var(--shadow-soft)] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:h-auto [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:h-auto [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:min-h-0 [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:min-h-0 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:max-h-none [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:max-h-none [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:flex-col [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:flex-col [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:items-stretch [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:items-stretch [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:gap-3 [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:gap-3 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:px-4 [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:px-4 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:py-4 [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:py-4 max-[1180px]:h-auto max-[1180px]:min-h-0 max-[1180px]:max-h-none max-[1024px]:px-4 max-[1024px]:py-5 max-[820px]:px-4 max-[820px]:py-5 max-[720px]:flex-col max-[720px]:items-stretch max-[720px]:gap-4 max-[640px]:px-3.5 max-[640px]:py-4 [@media(max-height:860px)_and_(max-width:820px)]:h-auto [@media(max-height:860px)_and_(max-width:820px)]:min-h-0 [@media(max-height:860px)_and_(max-width:820px)]:max-h-none ${className}`.trim()}
    >
      <div className="hidden [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:grid [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:grid [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:grid-cols-[72px_minmax(0,1fr)] [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:grid-cols-[72px_minmax(0,1fr)] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:grid-rows-[auto_auto] [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:grid-rows-[auto_auto] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:items-stretch [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:items-stretch [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:gap-x-4 [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:gap-x-4 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:gap-y-2 [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:gap-y-2">
        {previewUrl ? (
          <div className="row-span-2 flex h-[72px] w-[72px] shrink-0 self-center items-center justify-center overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--surface-muted)] shadow-[var(--shadow-soft)]">
            <span
              className="h-[74%] w-[74%] bg-contain bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${previewUrl})` }}
              role="img"
              aria-label="โลโก้ร้าน"
            />
          </div>
        ) : null}

        <div className="min-w-0 self-start text-right">
          <p className={`${eyebrowTextClass} mb-0`}>STATUS STORE</p>
          <h2 className="mt-2 mb-0 text-[1.45rem] font-bold leading-[0.9] tracking-[-0.05em]">
            <span className="[background-image:var(--status-text-gradient)] bg-clip-text font-black tracking-normal text-transparent drop-shadow-[var(--status-text-shadow)] pb-1">
              {profile.profileName}
            </span>
          </h2>
          {profile.profileMeta ? (
            <p className="mt-1 m-0 text-[0.72rem] leading-[1.2] text-[var(--foreground-soft)]">
              {profile.profileMeta} • {profile.profileRole}
            </p>
          ) : null}
        </div>

        {profile.profileAction ? (
          <div className="w-fit justify-self-end self-end [&>*]:mt-0 [&>*]:w-auto [&>*]:min-h-[28px] [&>*]:px-2.5 [&>*]:text-[0.72rem] [&>*]:leading-none [&>*]:whitespace-nowrap">
            {profile.profileAction}
          </div>
        ) : null}
      </div>

      <div className="[@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:hidden [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:hidden flex items-center gap-5 max-[720px]:gap-4">
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
        <div className="min-w-0 flex-1">
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
        <div className="[@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:hidden [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:hidden flex self-end flex-wrap items-center gap-3 max-[720px]:self-auto max-[720px]:justify-end">
          {profile.profileAction}
        </div>
      ) : null}
    </div>
  );
}


