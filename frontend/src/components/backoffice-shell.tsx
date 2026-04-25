"use client";

import Link from "next/link";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type SidebarItem = {
  label: string;
  href: string;
  active?: boolean;
  icon?: ReactNode;
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
  profileRole: string;
  profileAction?: ReactNode;
  statusStoreContent?: ReactNode;
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
const storeBrandNameClass =
  "bg-[linear-gradient(135deg,#ffffff_0%,#e8ddff_28%,#b79cff_58%,#7f6cff_100%)] bg-clip-text font-black tracking-normal text-transparent drop-shadow-[0_8px_20px_rgba(127,108,255,0.22)]";
const statusStoreNameClass =
  "bg-[linear-gradient(135deg,#ffffff_0%,#e8fff4_30%,#8df0bb_66%,#34d47b_100%)] bg-clip-text font-black tracking-normal text-transparent drop-shadow-[0_8px_20px_rgba(46,212,122,0.18)]";
const successAlertClass =
  "border-[rgba(92,230,196,0.22)] bg-[linear-gradient(180deg,rgba(14,45,44,0.86),rgba(10,25,30,0.96))]";
const successAlertEyebrowClass = "text-[rgba(169,245,226,0.72)]";
const successAlertMessageClass = "text-[#b7f8e5]";

function ProfileSummaryCard({
  profileName,
  profileSubtitle,
  profileStatus,
  profileMeta,
  profileRole,
  profileAction,
}: Pick<
  BackofficeShellProps,
  "profileName" | "profileSubtitle" | "profileStatus" | "profileMeta" | "profileRole" | "profileAction"
>) {
  return (
    <div className="border-t border-t-[var(--border)] px-1 py-3">
      <div className="flex items-start justify-between gap-3 max-[720px]:flex-col max-[720px]:items-stretch">
        <div>
          <h2 className="m-0 text-[1.08rem] font-bold tracking-[-0.03em]">{profileName}</h2>
          <p className="mt-1 text-[0.92rem] text-[var(--foreground-soft)]">{profileSubtitle}</p>
        </div>
        <span className="inline-flex items-center whitespace-nowrap rounded-[8px] border border-[rgba(46,212,122,0.24)] bg-[var(--success-soft)] px-[8px] py-[4px] text-[0.7rem] font-bold text-[var(--success)]">
          {profileStatus}
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-3 text-[0.88rem] text-[var(--foreground-soft)]">
        <span>{profileMeta}</span>
        <span className="whitespace-nowrap text-right">{profileRole}</span>
      </div>
      {profileAction ? <div key="profile-action">{profileAction}</div> : null}
    </div>
  );
}

function StoreStatusSummary({
  brandName,
  statusStoreContent,
}: Pick<BackofficeShellProps, "brandName" | "statusStoreContent">) {
  return (
    <div className="px-[10px] pb-[18px] pt-[14px]">
      <p className={eyebrowClass}>STATUS STORE</p>
      <h2 className={`my-[10px] text-[clamp(1.65rem,1.9vw,2.08rem)] leading-[1.04] ${statusStoreNameClass}`}>{brandName}</h2>
      <div className="h-px w-full bg-[var(--border)]" />
      {statusStoreContent ? <div className="mt-4">{statusStoreContent}</div> : null}
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
  profileRole,
  profileAction,
  statusStoreContent,
  className = "",
  children,
}: BackofficeShellProps) {
  const [shellAlert, setShellAlert] = useState<ShellAlert | null>(null);
  const alertTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setTimedShellAlert = useCallback((alert: ShellAlert | null) => {
    if (alertTimeoutRef.current) {
      clearTimeout(alertTimeoutRef.current);
      alertTimeoutRef.current = null;
    }

    setShellAlert(alert);

    if (alert) {
      alertTimeoutRef.current = setTimeout(() => {
        setShellAlert(null);
        alertTimeoutRef.current = null;
      }, 4000);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current);
      }
    };
  }, []);

  const contextValue = useMemo(() => ({ setShellAlert: setTimedShellAlert }), [setTimedShellAlert]);

  return (
    <BackofficeShellAlertContext.Provider value={contextValue}>
      <div
        className={`relative mx-auto grid h-full min-h-0 w-full max-w-[1600px] translate-x-[-149px] grid-cols-[304px_minmax(0,1fr)] items-start gap-[18px] max-[1380px]:translate-x-0 max-[1180px]:gap-4 max-[1180px]:grid-cols-1 ${className}`.trim()}
      >
        <div className="grid gap-[14px] max-[1180px]:gap-4">
          <aside className="h-fit overflow-hidden rounded-none border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-card)] backdrop-blur-[14px] max-[1180px]:p-2.5 max-[640px]:p-2">
            <div className="border-b border-b-[var(--border)] px-[10px] pb-[18px] pt-[14px]">
              <p className={eyebrowClass}>{eyebrow}</p>
              <h1 className={`my-[10px] text-[clamp(2rem,2.4vw,2.6rem)] leading-[1.02] ${storeBrandNameClass}`}>{brandName}</h1>
              <p className="m-0 text-[0.99rem] leading-[1.7] text-[var(--foreground-soft)]">{brandSubtitle}</p>
            </div>

            <nav className="grid gap-[8px] px-[2px] py-3 max-[1180px]:grid-cols-2 max-[700px]:grid-cols-1 max-[640px]:gap-[6px]" aria-label="Primary navigation">
              {sidebarItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={
                    item.active
                      ? "inline-flex min-h-[48px] items-center gap-3 rounded-xl bg-[linear-gradient(135deg,#7b6cff_0%,#c86bff_48%,#ff7ac8_100%)] px-[18px] py-3 font-semibold text-white shadow-[rgba(255,122,200,0.26)_0_8px_18px] max-[640px]:min-h-[44px] max-[640px]:px-[14px] max-[640px]:py-2.5"
                      : "inline-flex min-h-[48px] items-center gap-3 rounded-xl px-[18px] py-3 font-semibold text-[var(--foreground)] transition duration-150 hover:translate-x-[2px] hover:bg-[rgba(108,92,231,0.08)] max-[640px]:min-h-[44px] max-[640px]:px-[14px] max-[640px]:py-2.5"
                  }
                  aria-current={item.active ? "page" : undefined}
                >
                  {item.icon ? <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center opacity-90">{item.icon}</span> : null}
                  <span className="leading-none">{item.label}</span>
                </Link>
              ))}
            </nav>
          </aside>

          {shellAlert ? (
            <section
              className={`rounded-none border px-4 py-3 shadow-[rgba(0,0,0,0.16)_0_8px_18px] ${
                shellAlert.tone === "success"
                  ? successAlertClass
                  : shellAlert.tone === "info"
                  ? "border-[rgba(108,92,231,0.26)] bg-[linear-gradient(180deg,rgba(30,20,52,0.88),rgba(22,14,30,0.94))]"
                  : "border-[rgba(232,93,117,0.26)] bg-[linear-gradient(180deg,rgba(52,20,30,0.88),rgba(30,14,22,0.94))]"
              }`}
            >
              <p
                className={`m-0 text-[0.72rem] font-bold uppercase tracking-[0.24em] ${
                  shellAlert.tone === "success"
                    ? successAlertEyebrowClass
                    : shellAlert.tone === "info"
                    ? "text-[rgba(200,178,255,0.72)]"
                    : "text-[rgba(255,178,194,0.72)]"
                }`}
              >
                {shellAlert.tone === "success" ? "Success" : shellAlert.tone === "info" ? "Information" : "System Alert"}
              </p>
              <p
                className={`mt-2 text-[0.95rem] leading-[1.55] ${
                  shellAlert.tone === "success" ? successAlertMessageClass : shellAlert.tone === "info" ? "text-[#c89dff]" : "text-[#ff9db0]"
                }`}
              >
                {shellAlert.message}
              </p>
            </section>
          ) : null}

          <div className="hidden rounded-none border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-card)] backdrop-blur-[14px] max-[1380px]:block">
            <StoreStatusSummary brandName={profileName} statusStoreContent={statusStoreContent} />
            <div className="mt-4">
              <ProfileSummaryCard
                profileName={profileName}
                profileSubtitle={profileSubtitle}
                profileStatus={profileStatus}
                profileMeta={profileMeta}
                profileRole={profileRole}
                profileAction={profileAction}
              />
            </div>
          </div>
        </div>

        <div className="grid h-full min-h-0 gap-[18px] overflow-hidden max-[1366px]:overflow-visible max-[1180px]:gap-4">{children}</div>

        <aside className="absolute left-full top-0 ml-[18px] flex h-fit w-[280px] rounded-none border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-card)] backdrop-blur-[14px] max-[1380px]:hidden">
          <div className="flex w-full flex-col">
            <StoreStatusSummary brandName={profileName} statusStoreContent={statusStoreContent} />
            <div className="mt-4">
              <ProfileSummaryCard
                profileName={profileName}
                profileSubtitle={profileSubtitle}
                profileStatus={profileStatus}
                profileMeta={profileMeta}
                profileRole={profileRole}
                profileAction={profileAction}
              />
            </div>
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
  titleClassName = "my-[10px] text-[clamp(2rem,2.9vw,3.3rem)] leading-[0.98] tracking-[-0.065em]",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  titleClassName?: string;
}) {
  return (
    <section
      className={`rounded-none border border-[var(--border)] bg-[var(--surface)] px-6 py-5 shadow-[var(--shadow-card)] backdrop-blur-[14px] max-[820px]:px-4 max-[820px]:py-4 max-[640px]:px-3.5 max-[640px]:py-3.5 ${className}`.trim()}
    >
      <div className="flex items-start justify-between gap-4 max-[720px]:flex-col max-[720px]:items-stretch">
        <div>
          {eyebrow ? <p className={eyebrowClass}>{eyebrow}</p> : null}
          <h2 className={titleClassName}>{title}</h2>
          {description ? <p className="m-0 max-w-[72ch] leading-[1.65] text-[var(--foreground-soft)]">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap justify-end gap-[10px] max-[720px]:justify-stretch max-[720px]:[&>*]:w-full">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}
