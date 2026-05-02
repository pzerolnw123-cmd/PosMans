"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { setStoredCustomerDisplayIdle } from "@/components/customer-display-session";
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

const eyebrowClass = "m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[var(--eyebrow)]";
const statusStoreNameClass =
  "[background-image:var(--status-text-gradient)] bg-clip-text font-black tracking-normal text-transparent drop-shadow-[var(--status-text-shadow)]";
const successAlertClass = "border-[var(--alert-success-border)] [background:var(--alert-success-bg)]";
const successAlertEyebrowClass = "text-[var(--alert-success-eyebrow)]";
const successAlertMessageClass = "text-[var(--alert-success-text)]";
const dangerAlertClass = "border-[var(--alert-danger-border)] [background:var(--alert-danger-bg)]";
const dangerAlertEyebrowClass = "text-[var(--alert-danger-eyebrow)]";
const dangerAlertMessageClass = "text-[var(--alert-danger-text)]";
const sidebarShellClass =
  "h-fit overflow-hidden rounded-none border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-card)] backdrop-blur-[14px] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:p-2.5 [@media(min-width:821px)_and_(max-width:1240px)_and_(orientation:landscape)]:backdrop-blur-none max-[1180px]:p-2.5 max-[640px]:p-2";
const sidebarHeaderClass = "border-b border-b-[var(--border)] px-[10px] pb-[18px] pt-[14px]";
const sidebarEyebrowClass = eyebrowClass;
const sidebarBrandNameClass =
  "[background-image:var(--brand-text-gradient)] bg-clip-text font-black tracking-normal text-transparent";
const sidebarSubtitleClass = "m-0 text-[0.99rem] leading-[1.7] text-[var(--foreground-soft)] [@media(max-width:1366px)_and_(any-pointer:coarse)]:hidden";
const sidebarActiveLinkClass =
  "inline-flex min-h-[48px] items-center gap-3 rounded-xl border border-[var(--accent-border)] [background:var(--brand-gradient)] px-[18px] py-3 font-semibold text-[var(--button-text)] shadow-[var(--brand-shadow)_0_8px_18px] max-[640px]:min-h-[44px] max-[640px]:px-[14px] max-[640px]:py-2.5";
const sidebarInactiveLinkClass =
  "inline-flex min-h-[48px] items-center gap-3 rounded-xl px-[18px] py-3 font-semibold text-[var(--foreground)] transition duration-150 hover:translate-x-[2px] hover:bg-[var(--brand-soft)] max-[640px]:min-h-[44px] max-[640px]:px-[14px] max-[640px]:py-2.5";

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
        <span className="inline-flex items-center whitespace-nowrap rounded-[8px] border border-[var(--success-border)] bg-[var(--success-soft)] px-[8px] py-[4px] text-[0.7rem] font-bold text-[var(--success)]">
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

export const OwnerProfileContext = createContext<{
  profileName: string;
  profileSubtitle?: string;
  profileStatus?: string;
  profileMeta?: string;
  profileRole?: string;
  profileAction?: ReactNode;
  profileLogo?: ReactNode;
} | null>(null);

export function BackofficeShell({
  // ... (skip down to the render)
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
  const pathname = usePathname();
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

  const handleSidebarNavigation = useCallback(
    (href: string) => {
      if (pathname === "/owner/payments" && href !== "/owner/payments") {
        void setStoredCustomerDisplayIdle().catch(() => undefined);
      }
    },
    [pathname],
  );

  return (
    <BackofficeShellAlertContext.Provider value={contextValue}>
      <div
        className={`relative mx-auto grid h-full min-h-0 w-full max-w-[1700px] grid-cols-[clamp(244px,18vw,304px)_minmax(0,1fr)_clamp(232px,17vw,280px)] items-start gap-[18px] overflow-hidden [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)]:grid-cols-[252px_minmax(0,1fr)] [@media(max-width:1366px)_and_(any-pointer:coarse)]:grid-cols-[clamp(244px,18vw,304px)_minmax(0,1fr)] max-[1024px]:gap-4 max-[820px]:grid-cols-1 ${className}`.trim()}
      >
        <div className="relative grid max-h-full content-start gap-[14px] overflow-visible max-[1280px]:max-h-none max-[820px]:gap-4">
          <aside className={sidebarShellClass}>
            <div className={sidebarHeaderClass}>
              <p className={sidebarEyebrowClass}>{eyebrow}</p>
              <h1 className={`my-[10px] text-[clamp(2rem,2.4vw,2.6rem)] leading-[1.02] ${sidebarBrandNameClass}`}>{brandName}</h1>
              <p className={sidebarSubtitleClass}>{brandSubtitle}</p>
            </div>

            <nav className="grid gap-[8px] px-[2px] py-3 max-[820px]:grid-cols-2 max-[700px]:grid-cols-1 max-[640px]:gap-[6px]" aria-label="Primary navigation">
              {sidebarItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={item.active ? sidebarActiveLinkClass : sidebarInactiveLinkClass}
                  aria-current={item.active ? "page" : undefined}
                  onClick={() => handleSidebarNavigation(item.href)}
                >
                  {item.icon ? (
                    <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center ${item.active ? "text-[var(--button-text)] opacity-100" : "opacity-90"}`}>{item.icon}</span>
                  ) : null}
                  <span className={`leading-none ${item.active ? "text-[var(--button-text)]" : ""}`}>{item.label}</span>
                </Link>
              ))}
            </nav>
          </aside>

          {shellAlert ? (
            <section
              className={`rounded-none border px-4 py-3 shadow-[var(--shadow-pop)] [@media(min-width:821px)_and_(max-width:1240px)_and_(orientation:landscape)]:pointer-events-none [@media(min-width:821px)_and_(max-width:1240px)_and_(orientation:landscape)]:absolute [@media(min-width:821px)_and_(max-width:1240px)_and_(orientation:landscape)]:left-0 [@media(min-width:821px)_and_(max-width:1240px)_and_(orientation:landscape)]:top-full [@media(min-width:821px)_and_(max-width:1240px)_and_(orientation:landscape)]:z-30 [@media(min-width:821px)_and_(max-width:1240px)_and_(orientation:landscape)]:mt-[14px] [@media(min-width:821px)_and_(max-width:1240px)_and_(orientation:landscape)]:w-full ${shellAlert.tone === "success"
                ? successAlertClass
                : shellAlert.tone === "info"
                  ? "border-[var(--accent-border)] [background:var(--active-surface)]"
                  : dangerAlertClass
                }`}
            >
              <p
                className={`m-0 text-[0.72rem] font-bold uppercase tracking-[0.24em] ${shellAlert.tone === "success"
                  ? successAlertEyebrowClass
                  : shellAlert.tone === "info"
                    ? "text-[var(--accent-text)]"
                    : dangerAlertEyebrowClass
                  }`}
              >
                {shellAlert.tone === "success" ? "Success" : shellAlert.tone === "info" ? "Information" : "System Alert"}
              </p>
              <p
                className={`mt-2 text-[0.95rem] leading-[1.55] ${shellAlert.tone === "success" ? successAlertMessageClass : shellAlert.tone === "info" ? "text-[var(--foreground)]" : dangerAlertMessageClass
                  }`}
              >
                {shellAlert.message}
              </p>
            </section>
          ) : null}

          <div className="hidden rounded-none border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-card)] backdrop-blur-[14px] max-[820px]:block [@media(max-width:1366px)_and_(any-pointer:coarse)]:hidden">
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

        <div className="workspace-main-scroll grid h-full min-h-0 gap-[18px] overflow-y-auto overflow-x-hidden pr-3 [scrollbar-gutter:stable] max-[820px]:h-auto max-[820px]:overflow-visible max-[820px]:pr-0 max-[820px]:gap-4">
          <OwnerProfileContext.Provider value={{ profileName, profileSubtitle, profileStatus, profileMeta, profileRole, profileAction, profileLogo: statusStoreContent }}>
            {children}
          </OwnerProfileContext.Provider>
        </div>

        <aside className="flex max-h-full min-w-0 self-start overflow-visible rounded-none border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-card)] backdrop-blur-[14px] [@media(min-width:821px)_and_(max-width:1240px)_and_(orientation:landscape)]:backdrop-blur-none max-[1240px]:hidden [@media(max-width:1366px)_and_(any-pointer:coarse)]:hidden">
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
  headerClassName = "",
  titleClassName = "my-[10px] text-[clamp(2rem,2.9vw,3.3rem)] leading-[0.98] tracking-[-0.065em]",
  mobileEyebrow,
  mobileTitle,
  mobileDescription,
  mobileActions,
  mobileHeaderClassName = "",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  headerClassName?: string;
  titleClassName?: string;
  mobileEyebrow?: string;
  mobileTitle?: ReactNode;
  mobileDescription?: string;
  mobileActions?: ReactNode;
  mobileHeaderClassName?: string;
}) {
  return (
    <section
      className={`rounded-none border border-[var(--border)] bg-[var(--surface)] px-6 py-5 shadow-[var(--shadow-card)] backdrop-blur-[14px] [@media(min-width:821px)_and_(max-width:1240px)_and_(orientation:landscape)]:backdrop-blur-none max-[820px]:px-4 max-[820px]:py-4 max-[640px]:px-3.5 max-[640px]:py-3.5 ${className}`.trim()}
    >
      <div className={`flex items-start justify-between gap-4 max-[720px]:flex-col max-[720px]:items-stretch ${headerClassName}`.trim()}>
        <div>
          {eyebrow ? <p className={eyebrowClass}>{eyebrow}</p> : null}
          <h2 className={titleClassName}>{title}</h2>
          {description ? <p className="m-0 max-w-[72ch] leading-[1.65] text-[var(--foreground-soft)]">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap justify-end gap-[10px] max-[720px]:justify-stretch max-[720px]:[&>*]:w-full">{actions}</div> : null}
      </div>

      {mobileHeaderClassName ? (
        <div className={`flex items-start justify-between gap-4 max-[720px]:flex-col max-[720px]:items-stretch ${mobileHeaderClassName}`.trim()}>
          <div>
            {mobileEyebrow ? <p className={eyebrowClass}>{mobileEyebrow}</p> : null}
            <div className={titleClassName}>{mobileTitle}</div>
            {mobileDescription ? <p className="m-0 max-w-[72ch] leading-[1.65] text-[var(--foreground-soft)]">{mobileDescription}</p> : null}
          </div>
          {mobileActions ? <div className="flex flex-wrap justify-end gap-[10px] max-[720px]:justify-stretch max-[720px]:[&>*]:w-full">{mobileActions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
