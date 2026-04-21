"use client";

import Link from "next/link";
import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";

type SidebarItem = {
  label: string;
  href: string;
  active?: boolean;
};

type BackofficeShellProps = {
  brandName: string;
  brandSubtitle: string;
  eyebrow: string;
  sidebarItems: SidebarItem[];
  profileName: string;
  profileSubtitle: string;
  profileStatus: string;
  profileMeta: string;
  profileAction?: ReactNode;
  className?: string;
  children: ReactNode;
};

type ShellAlert = {
  message: string;
  tone?: "danger" | "success" | "info";
};

type BackofficeShellAlertContextValue = {
  setShellAlert: (alert: ShellAlert | null) => void;
};

const BackofficeShellAlertContext = createContext<BackofficeShellAlertContextValue | null>(null);

const eyebrowClass = "m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[#6b7a94]";

function ProfileSummaryCard({
  profileName,
  profileSubtitle,
  profileStatus,
  profileMeta,
  profileAction,
}: Pick<
  BackofficeShellProps,
  "profileName" | "profileSubtitle" | "profileStatus" | "profileMeta" | "profileAction"
>) {
  return (
    <div className="border-t border-t-[var(--border)] px-1 py-3">
      <div className="flex items-start justify-between gap-3 max-[720px]:flex-col max-[720px]:items-stretch">
        <div>
          <h2 className="m-0 text-[1.08rem] font-bold tracking-[-0.03em]">{profileName}</h2>
          <p className="mt-1 text-[0.92rem] text-[var(--foreground-soft)]">{profileSubtitle}</p>
          <p className="mt-1 text-[0.88rem] text-[var(--foreground-soft)]">{profileMeta}</p>
        </div>
        <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-[10px] border border-[rgba(46,212,122,0.24)] bg-[var(--success-soft)] px-[10px] py-[6px] text-[0.78rem] font-bold text-[var(--success)] before:h-[7px] before:w-[7px] before:rounded-full before:bg-current before:content-['']">
          {profileStatus}
        </span>
      </div>
      {profileAction}
    </div>
  );
}

export function BackofficeShell({
  brandName,
  brandSubtitle,
  eyebrow,
  sidebarItems,
  profileName,
  profileSubtitle,
  profileStatus,
  profileMeta,
  profileAction,
  className = "",
  children,
}: BackofficeShellProps) {
  const [shellAlert, setShellAlert] = useState<ShellAlert | null>(null);
  const contextValue = useMemo(() => ({ setShellAlert }), []);

  return (
    <BackofficeShellAlertContext.Provider value={contextValue}>
      <div
        className={`relative mx-auto grid h-full min-h-0 w-full max-w-[1600px] grid-cols-[304px_minmax(0,1fr)] items-start gap-[18px] max-[1180px]:grid-cols-1 ${className}`.trim()}
      >
        <div className="grid gap-[14px]">
          <aside className="h-fit overflow-hidden rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-card)] backdrop-blur-[14px]">
            <div className="border-b border-b-[var(--border)] px-[10px] pb-[18px] pt-[14px]">
              <p className={eyebrowClass}>{eyebrow}</p>
              <h1 className="my-[10px] text-[clamp(2rem,2.4vw,2.6rem)] leading-[0.98] tracking-[-0.06em]">{brandName}</h1>
              <p className="m-0 text-[0.99rem] leading-[1.7] text-[var(--foreground-soft)]">{brandSubtitle}</p>
            </div>

            <nav className="grid gap-[6px] px-0 py-2" aria-label="Primary navigation">
              {sidebarItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={
                    item.active
                      ? "rounded-xl bg-[linear-gradient(135deg,var(--brand)_0%,#8070f0_100%)] px-4 py-[14px] font-semibold text-white shadow-[rgba(108,92,231,0.22)_0_8px_18px]"
                      : "rounded-xl px-4 py-[14px] font-semibold text-[var(--foreground)] transition duration-150 hover:translate-x-[2px] hover:bg-[rgba(108,92,231,0.08)]"
                  }
                  aria-current={item.active ? "page" : undefined}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>

          {shellAlert ? (
            <section
              className={`rounded-[18px] border px-4 py-3 shadow-[rgba(0,0,0,0.16)_0_8px_18px] ${
                shellAlert.tone === "success"
                  ? "border-[rgba(46,212,122,0.26)] bg-[linear-gradient(180deg,rgba(20,52,36,0.88),rgba(14,30,22,0.94))]"
                  : shellAlert.tone === "info"
                  ? "border-[rgba(108,92,231,0.26)] bg-[linear-gradient(180deg,rgba(30,20,52,0.88),rgba(22,14,30,0.94))]"
                  : "border-[rgba(232,93,117,0.26)] bg-[linear-gradient(180deg,rgba(52,20,30,0.88),rgba(30,14,22,0.94))]"
              }`}
            >
              <p
                className={`m-0 text-[0.72rem] font-bold uppercase tracking-[0.24em] ${
                  shellAlert.tone === "success"
                    ? "text-[rgba(178,255,212,0.72)]"
                    : shellAlert.tone === "info"
                    ? "text-[rgba(200,178,255,0.72)]"
                    : "text-[rgba(255,178,194,0.72)]"
                }`}
              >
                {shellAlert.tone === "success" ? "Success" : shellAlert.tone === "info" ? "Information" : "System Alert"}
              </p>
              <p
                className={`mt-2 text-[0.95rem] leading-[1.55] ${
                  shellAlert.tone === "success" ? "text-[#9dffc8]" : shellAlert.tone === "info" ? "text-[#c89dff]" : "text-[#ff9db0]"
                }`}
              >
                {shellAlert.message}
              </p>
            </section>
          ) : null}
        </div>

        <div className="grid h-full min-h-0 gap-[18px] overflow-hidden">{children}</div>

        <aside className="absolute bottom-0 left-full top-0 ml-[18px] flex w-[280px] rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-card)] backdrop-blur-[14px] max-[1380px]:hidden">
          <div className="mt-auto w-full">
            <ProfileSummaryCard
              profileName={profileName}
              profileSubtitle={profileSubtitle}
              profileStatus={profileStatus}
              profileMeta={profileMeta}
              profileAction={profileAction}
            />
          </div>
        </aside>
      </div>
    </BackofficeShellAlertContext.Provider>
  );
}

export function useBackofficeShellAlert() {
  const context = useContext(BackofficeShellAlertContext);

  if (!context) {
    throw new Error("useBackofficeShellAlert must be used inside BackofficeShell");
  }

  return context;
}

export function PanelCard({
  eyebrow,
  title,
  description,
  actions,
  children,
  className = "",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[18px] border border-[var(--border)] bg-[var(--surface)] px-6 py-5 shadow-[var(--shadow-card)] backdrop-blur-[14px] ${className}`.trim()}
    >
      <div className="flex items-start justify-between gap-4 max-[720px]:flex-col max-[720px]:items-stretch">
        <div>
          {eyebrow ? <p className={eyebrowClass}>{eyebrow}</p> : null}
          <h2 className="my-[10px] text-[clamp(2rem,2.9vw,3.3rem)] leading-[0.98] tracking-[-0.065em]">{title}</h2>
          {description ? <p className="m-0 max-w-[72ch] leading-[1.65] text-[var(--foreground-soft)]">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap justify-end gap-[10px] max-[720px]:justify-stretch max-[720px]:[&>*]:w-full">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}
