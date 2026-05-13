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
  profilePlanContent?: ReactNode;
  profileAction?: ReactNode;
  sidebarAction?: ReactNode;
  statusStoreContent?: ReactNode;
  hideDesktopStatusStore?: boolean;
  className?: string;
  children: ReactNode;
};

type ShellAlert = {
  message: string;
  tone?: "danger" | "success" | "info";
  placement?: "default" | "top-right";
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
  "workspace-main-scroll h-fit overflow-hidden rounded-none border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-card)] backdrop-blur-[14px] [@media(min-width:821px)_and_(max-width:1240px)_and_(orientation:portrait)]:p-2.5 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:max-h-full [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:overflow-y-auto [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:overflow-x-hidden [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:p-2 [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:p-2.5 [@media(min-width:821px)_and_(max-width:1240px)_and_(orientation:landscape)]:backdrop-blur-none [@media(width:1440px)_and_(height:900px)_and_(orientation:landscape)]:flex [@media(width:1440px)_and_(height:900px)_and_(orientation:landscape)]:!h-full [@media(width:1440px)_and_(height:900px)_and_(orientation:landscape)]:!max-h-full [@media(width:1440px)_and_(height:900px)_and_(orientation:landscape)]:flex-col [@media(width:1440px)_and_(height:900px)_and_(orientation:landscape)]:!p-[14px] [@media(width:1600px)_and_(height:900px)_and_(orientation:landscape)]:flex [@media(width:1600px)_and_(height:900px)_and_(orientation:landscape)]:!h-full [@media(width:1600px)_and_(height:900px)_and_(orientation:landscape)]:!max-h-full [@media(width:1600px)_and_(height:900px)_and_(orientation:landscape)]:flex-col [@media(width:1600px)_and_(height:900px)_and_(orientation:landscape)]:!p-[14px] max-[1180px]:p-2.5 max-[640px]:p-2";
const sidebarHeaderClass =
  "border-b border-b-[var(--border)] px-[10px] pb-[18px] pt-[14px] [@media(width:1366px)_and_(height:768px)_and_(orientation:landscape)]:border-b-0 [@media(width:1366px)_and_(height:768px)_and_(orientation:landscape)]:pb-0 [@media(width:1366px)_and_(height:768px)_and_(orientation:landscape)]:pt-0 [@media(width:1280px)_and_(height:720px)_and_(orientation:landscape)]:border-b-0 [@media(width:1280px)_and_(height:720px)_and_(orientation:landscape)]:pb-0 [@media(width:1280px)_and_(height:720px)_and_(orientation:landscape)]:pt-0 [@media(width:1024px)_and_(height:768px)_and_(orientation:landscape)]:border-b-0 [@media(width:1024px)_and_(height:768px)_and_(orientation:landscape)]:pb-0 [@media(width:1024px)_and_(height:768px)_and_(orientation:landscape)]:pt-0 [@media(width:1280px)_and_(height:800px)_and_(orientation:landscape)]:border-b-0 [@media(width:1280px)_and_(height:800px)_and_(orientation:landscape)]:pb-0 [@media(width:1280px)_and_(height:800px)_and_(orientation:landscape)]:pt-0 [@media(width:1366px)_and_(height:720px)_and_(orientation:landscape)]:border-b-0 [@media(width:1366px)_and_(height:720px)_and_(orientation:landscape)]:pb-0 [@media(width:1366px)_and_(height:720px)_and_(orientation:landscape)]:pt-0 [@media(width:1440px)_and_(height:900px)_and_(orientation:landscape)]:px-2 [@media(width:1440px)_and_(height:900px)_and_(orientation:landscape)]:pb-[20px] [@media(width:1440px)_and_(height:900px)_and_(orientation:landscape)]:pt-[14px] [@media(width:1600px)_and_(height:900px)_and_(orientation:landscape)]:px-2 [@media(width:1600px)_and_(height:900px)_and_(orientation:landscape)]:pb-[20px] [@media(width:1600px)_and_(height:900px)_and_(orientation:landscape)]:pt-[14px] [@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:border-b-0 [@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:pb-0 [@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:pt-0 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:border-b-0 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:pb-0 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:pt-0 [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:border-b-0 [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:pb-0 [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:pt-0";
const sidebarEyebrowClass = `${eyebrowClass} [@media(width:1280px)_and_(height:720px)_and_(orientation:landscape)]:hidden [@media(width:1024px)_and_(height:768px)_and_(orientation:landscape)]:hidden [@media(width:1280px)_and_(height:800px)_and_(orientation:landscape)]:hidden [@media(width:1366px)_and_(height:768px)_and_(orientation:landscape)]:hidden [@media(width:1366px)_and_(height:720px)_and_(orientation:landscape)]:hidden [@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:hidden [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:hidden [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:hidden`;
const sidebarBrandNameClass =
  "[background-image:var(--brand-text-gradient)] bg-clip-text font-black tracking-normal text-transparent [@media(width:1366px)_and_(height:768px)_and_(orientation:landscape)]:hidden [@media(width:1366px)_and_(height:720px)_and_(orientation:landscape)]:hidden [@media(width:1280px)_and_(height:720px)_and_(orientation:landscape)]:hidden [@media(width:1280px)_and_(height:800px)_and_(orientation:landscape)]:hidden [@media(width:1024px)_and_(height:768px)_and_(orientation:landscape)]:hidden [@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:hidden [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:hidden";
const sidebarSubtitleClass =
  "m-0 text-[0.99rem] leading-[1.7] text-[var(--foreground-soft)] [@media(max-width:1366px)_and_(any-pointer:coarse)]:hidden [@media(min-width:744px)_and_(max-width:1024px)_and_(orientation:portrait)]:hidden [@media(min-width:821px)_and_(max-width:1366px)_and_(max-height:1024px)_and_(orientation:landscape)]:hidden [@media(width:1440px)_and_(height:900px)_and_(orientation:landscape)]:hidden [@media(width:1600px)_and_(height:900px)_and_(orientation:landscape)]:hidden";
const sidebarActiveLinkClass =
  "inline-flex min-h-[48px] items-center gap-3 rounded-xl border border-[var(--accent-border)] [background:var(--brand-gradient)] px-[18px] py-3 font-semibold text-[var(--button-text)] shadow-[var(--brand-shadow)_0_8px_18px] [@media(min-width:1900px)_and_(max-width:1920px)_and_(min-height:900px)_and_(max-height:980px)_and_(orientation:landscape)_and_(pointer:fine)]:!min-h-[42px] [@media(min-width:1900px)_and_(max-width:1920px)_and_(min-height:900px)_and_(max-height:980px)_and_(orientation:landscape)_and_(pointer:fine)]:!rounded-[9px] [@media(min-width:1900px)_and_(max-width:1920px)_and_(min-height:900px)_and_(max-height:980px)_and_(orientation:landscape)_and_(pointer:fine)]:!px-[14px] [@media(min-width:1900px)_and_(max-width:1920px)_and_(min-height:900px)_and_(max-height:980px)_and_(orientation:landscape)_and_(pointer:fine)]:!py-[7px] [@media(width:1536px)_and_(height:864px)_and_(orientation:landscape)]:!min-h-[40px] [@media(width:1536px)_and_(height:864px)_and_(orientation:landscape)]:!rounded-[10px] [@media(width:1536px)_and_(height:864px)_and_(orientation:landscape)]:!px-[14px] [@media(width:1536px)_and_(height:864px)_and_(orientation:landscape)]:!py-[7px] [@media(width:1920px)_and_(height:1080px)_and_(orientation:landscape)]:!min-h-[42px] [@media(width:1920px)_and_(height:1080px)_and_(orientation:landscape)]:!rounded-[10px] [@media(width:1920px)_and_(height:1080px)_and_(orientation:landscape)]:!px-4 [@media(width:1920px)_and_(height:1080px)_and_(orientation:landscape)]:!py-2 [@media(width:1366px)_and_(height:768px)_and_(orientation:landscape)]:min-h-[44px] [@media(width:1366px)_and_(height:768px)_and_(orientation:landscape)]:px-[14px] [@media(width:1366px)_and_(height:768px)_and_(orientation:landscape)]:py-[7px] [@media(width:1280px)_and_(height:720px)_and_(orientation:landscape)]:!min-h-[44px] [@media(width:1280px)_and_(height:720px)_and_(orientation:landscape)]:!px-[14px] [@media(width:1280px)_and_(height:720px)_and_(orientation:landscape)]:!py-[7px] [@media(width:1366px)_and_(height:720px)_and_(orientation:landscape)]:!min-h-[44px] [@media(width:1366px)_and_(height:720px)_and_(orientation:landscape)]:!px-[14px] [@media(width:1366px)_and_(height:720px)_and_(orientation:landscape)]:!py-[7px] [@media(width:1440px)_and_(height:900px)_and_(orientation:landscape)]:!min-h-[40px] [@media(width:1440px)_and_(height:900px)_and_(orientation:landscape)]:!rounded-[10px] [@media(width:1440px)_and_(height:900px)_and_(orientation:landscape)]:!px-4 [@media(width:1440px)_and_(height:900px)_and_(orientation:landscape)]:!py-2.5 [@media(width:1600px)_and_(height:900px)_and_(orientation:landscape)]:!min-h-[40px] [@media(width:1600px)_and_(height:900px)_and_(orientation:landscape)]:!rounded-[10px] [@media(width:1600px)_and_(height:900px)_and_(orientation:landscape)]:!px-4 [@media(width:1600px)_and_(height:900px)_and_(orientation:landscape)]:!py-2.5 [@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:min-h-[41px] [@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:px-[15px] [@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:py-[10px] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:min-h-[38px] [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:min-h-[41px] [@media(min-width:1181px)_and_(max-width:1366px)_and_(max-height:999px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:min-h-[42px] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:px-[12px] [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:px-[15px] [@media(min-width:1181px)_and_(max-width:1366px)_and_(max-height:999px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:px-[16px] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:py-[8px] [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:py-[10px] [@media(min-width:1181px)_and_(max-width:1366px)_and_(max-height:999px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:py-[9px] max-[640px]:min-h-[44px] max-[640px]:px-[14px] max-[640px]:py-2.5";
const sidebarInactiveLinkClass =
  "inline-flex min-h-[48px] items-center gap-3 rounded-xl px-[18px] py-3 font-semibold text-[var(--foreground)] transition duration-150 hover:translate-x-[2px] hover:bg-[var(--brand-soft)] [@media(min-width:1900px)_and_(max-width:1920px)_and_(min-height:900px)_and_(max-height:980px)_and_(orientation:landscape)_and_(pointer:fine)]:!min-h-[42px] [@media(min-width:1900px)_and_(max-width:1920px)_and_(min-height:900px)_and_(max-height:980px)_and_(orientation:landscape)_and_(pointer:fine)]:!rounded-[9px] [@media(min-width:1900px)_and_(max-width:1920px)_and_(min-height:900px)_and_(max-height:980px)_and_(orientation:landscape)_and_(pointer:fine)]:!px-[14px] [@media(min-width:1900px)_and_(max-width:1920px)_and_(min-height:900px)_and_(max-height:980px)_and_(orientation:landscape)_and_(pointer:fine)]:!py-[7px] [@media(width:1536px)_and_(height:864px)_and_(orientation:landscape)]:!min-h-[40px] [@media(width:1536px)_and_(height:864px)_and_(orientation:landscape)]:!rounded-[10px] [@media(width:1536px)_and_(height:864px)_and_(orientation:landscape)]:!px-[14px] [@media(width:1536px)_and_(height:864px)_and_(orientation:landscape)]:!py-[7px] [@media(width:1920px)_and_(height:1080px)_and_(orientation:landscape)]:!min-h-[42px] [@media(width:1920px)_and_(height:1080px)_and_(orientation:landscape)]:!rounded-[10px] [@media(width:1920px)_and_(height:1080px)_and_(orientation:landscape)]:!px-4 [@media(width:1920px)_and_(height:1080px)_and_(orientation:landscape)]:!py-2 [@media(width:1366px)_and_(height:768px)_and_(orientation:landscape)]:min-h-[44px] [@media(width:1366px)_and_(height:768px)_and_(orientation:landscape)]:px-[14px] [@media(width:1366px)_and_(height:768px)_and_(orientation:landscape)]:py-[7px] [@media(width:1280px)_and_(height:720px)_and_(orientation:landscape)]:!min-h-[44px] [@media(width:1280px)_and_(height:720px)_and_(orientation:landscape)]:!px-[14px] [@media(width:1280px)_and_(height:720px)_and_(orientation:landscape)]:!py-[7px] [@media(width:1366px)_and_(height:720px)_and_(orientation:landscape)]:!min-h-[44px] [@media(width:1366px)_and_(height:720px)_and_(orientation:landscape)]:!px-[14px] [@media(width:1366px)_and_(height:720px)_and_(orientation:landscape)]:!py-[7px] [@media(width:1440px)_and_(height:900px)_and_(orientation:landscape)]:!min-h-[40px] [@media(width:1440px)_and_(height:900px)_and_(orientation:landscape)]:!rounded-[10px] [@media(width:1440px)_and_(height:900px)_and_(orientation:landscape)]:!px-4 [@media(width:1440px)_and_(height:900px)_and_(orientation:landscape)]:!py-2.5 [@media(width:1600px)_and_(height:900px)_and_(orientation:landscape)]:!min-h-[40px] [@media(width:1600px)_and_(height:900px)_and_(orientation:landscape)]:!rounded-[10px] [@media(width:1600px)_and_(height:900px)_and_(orientation:landscape)]:!px-4 [@media(width:1600px)_and_(height:900px)_and_(orientation:landscape)]:!py-2.5 [@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:min-h-[41px] [@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:px-[15px] [@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:py-[10px] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:min-h-[38px] [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:min-h-[41px] [@media(min-width:1181px)_and_(max-width:1366px)_and_(max-height:999px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:min-h-[42px] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:px-[12px] [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:px-[15px] [@media(min-width:1181px)_and_(max-width:1366px)_and_(max-height:999px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:px-[16px] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:py-[8px] [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:py-[10px] [@media(min-width:1181px)_and_(max-width:1366px)_and_(max-height:999px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:py-[9px] max-[640px]:min-h-[44px] max-[640px]:px-[14px] max-[640px]:py-2.5";

function ProfileSummaryCard({
  profileName,
  profileSubtitle,
  profileStatus,
  profileMeta,
  profileRole,
  profilePlanContent,
  profileAction,
}: Pick<
  BackofficeShellProps,
  "profileName" | "profileSubtitle" | "profileStatus" | "profileMeta" | "profileRole" | "profilePlanContent" | "profileAction"
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
      {profilePlanContent ? <div className="mt-2">{profilePlanContent}</div> : null}
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
  profilePlanContent?: ReactNode;
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
  profilePlanContent,
  profileAction,
  sidebarAction,
  statusStoreContent,
  hideDesktopStatusStore = false,
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
  const shellGridClass = hideDesktopStatusStore
    ? "grid-cols-[clamp(244px,18vw,304px)_minmax(0,1fr)]"
    : "grid-cols-[clamp(244px,18vw,304px)_minmax(0,1fr)_clamp(232px,17vw,280px)]";
  const mainScrollClass =
    "workspace-main-scroll grid h-full min-h-0 gap-[18px] overflow-y-auto overflow-x-hidden pr-0 [@media(orientation:portrait)]:h-auto [@media(orientation:portrait)]:overflow-visible [@media(orientation:portrait)]:gap-4 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:gap-[12px] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:pr-1 max-[820px]:h-auto max-[820px]:overflow-visible max-[820px]:pr-0 max-[820px]:gap-4";

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
        className={`relative mx-auto grid h-full min-h-0 w-full max-w-[1760px] ${shellGridClass} items-start gap-[18px] overflow-hidden [@media(orientation:portrait)]:h-auto [@media(orientation:portrait)]:grid-cols-1 [@media(orientation:portrait)]:overflow-visible [@media(orientation:portrait)]:gap-4 [@media(max-width:1366px)_and_(any-pointer:coarse)]:grid-cols-[clamp(244px,18vw,304px)_minmax(0,1fr)] [@media(min-width:744px)_and_(max-width:1024px)_and_(orientation:portrait)]:grid-cols-[clamp(244px,18vw,304px)_minmax(0,1fr)] [@media(min-width:821px)_and_(max-width:1366px)_and_(max-height:1024px)_and_(orientation:landscape)]:grid-cols-[clamp(244px,18vw,304px)_minmax(0,1fr)] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!grid-cols-[236px_minmax(0,1fr)] [@media(min-width:821px)_and_(max-width:1024px)_and_(max-height:1024px)_and_(orientation:landscape)]:!grid-cols-[236px_minmax(0,1fr)] [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:!grid-cols-[252px_minmax(0,1fr)] [@media(min-width:1025px)_and_(max-width:1180px)_and_(max-height:1024px)_and_(orientation:landscape)]:!grid-cols-[252px_minmax(0,1fr)] [@media(width:1440px)_and_(height:900px)_and_(orientation:landscape)]:!grid-cols-[244px_minmax(0,1fr)] [@media(width:1600px)_and_(height:900px)_and_(orientation:landscape)]:!grid-cols-[244px_minmax(0,1fr)] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!gap-[12px] [@media(min-width:821px)_and_(max-width:1024px)_and_(max-height:1024px)_and_(orientation:landscape)]:!gap-[12px] [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:!gap-[18px] [@media(min-width:1025px)_and_(max-width:1180px)_and_(max-height:1024px)_and_(orientation:landscape)]:!gap-[18px] max-[1024px]:gap-4 max-[820px]:grid-cols-1 ${className}`.trim()}
      >
        <div className="relative grid max-h-full min-h-0 content-start gap-[14px] overflow-hidden [@media(orientation:portrait)]:max-h-none [@media(orientation:portrait)]:gap-4 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!max-h-full [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:gap-[10px] max-[1280px]:max-h-none [@media(width:1280px)_and_(height:720px)_and_(orientation:landscape)]:!max-h-full [@media(width:1366px)_and_(height:720px)_and_(orientation:landscape)]:!max-h-full [@media(width:1440px)_and_(height:900px)_and_(orientation:landscape)]:!h-full [@media(width:1440px)_and_(height:900px)_and_(orientation:landscape)]:!max-h-full [@media(width:1600px)_and_(height:900px)_and_(orientation:landscape)]:!h-full [@media(width:1600px)_and_(height:900px)_and_(orientation:landscape)]:!max-h-full max-[820px]:gap-4">
          <aside className={sidebarShellClass}>
            <div className={sidebarHeaderClass}>
              <p className={sidebarEyebrowClass}>{eyebrow}</p>
              <h1 className={`my-[10px] text-[clamp(2rem,2.4vw,2.6rem)] leading-[1.02] [@media(width:1366px)_and_(height:768px)_and_(orientation:landscape)]:my-[6px] [@media(width:1280px)_and_(height:720px)_and_(orientation:landscape)]:my-[6px] [@media(width:1366px)_and_(height:720px)_and_(orientation:landscape)]:my-[6px] [@media(width:1440px)_and_(height:900px)_and_(orientation:landscape)]:whitespace-nowrap [@media(width:1600px)_and_(height:900px)_and_(orientation:landscape)]:!text-[2.15rem] [@media(width:1600px)_and_(height:900px)_and_(orientation:landscape)]:whitespace-nowrap ${sidebarBrandNameClass}`}>{brandName}</h1>
              <p className={sidebarSubtitleClass}>{brandSubtitle}</p>
            </div>

            <nav className="grid gap-[8px] px-[2px] py-3 [@media(min-width:1900px)_and_(max-width:1920px)_and_(min-height:900px)_and_(max-height:980px)_and_(orientation:landscape)_and_(pointer:fine)]:!gap-[4px] [@media(min-width:1900px)_and_(max-width:1920px)_and_(min-height:900px)_and_(max-height:980px)_and_(orientation:landscape)_and_(pointer:fine)]:!py-2 [@media(width:1536px)_and_(height:864px)_and_(orientation:landscape)]:!gap-[3px] [@media(width:1536px)_and_(height:864px)_and_(orientation:landscape)]:!py-2 [@media(width:1920px)_and_(height:1080px)_and_(orientation:landscape)]:!gap-[4px] [@media(width:1920px)_and_(height:1080px)_and_(orientation:landscape)]:!py-2 [@media(orientation:portrait)]:grid-cols-2 [@media(orientation:portrait)]:gap-[6px] [@media(orientation:portrait)]:py-2 [@media(orientation:portrait)_and_(max-width:700px)]:grid-cols-1 [@media(width:1366px)_and_(height:768px)_and_(orientation:landscape)]:gap-0 [@media(width:1366px)_and_(height:768px)_and_(orientation:landscape)]:py-2 [@media(width:1280px)_and_(height:720px)_and_(orientation:landscape)]:!gap-0 [@media(width:1280px)_and_(height:720px)_and_(orientation:landscape)]:!py-2 [@media(width:1366px)_and_(height:720px)_and_(orientation:landscape)]:!gap-0 [@media(width:1366px)_and_(height:720px)_and_(orientation:landscape)]:!py-2 [@media(width:1440px)_and_(height:900px)_and_(orientation:landscape)]:!gap-[8px] [@media(width:1440px)_and_(height:900px)_and_(orientation:landscape)]:!px-0 [@media(width:1440px)_and_(height:900px)_and_(orientation:landscape)]:!py-[10px] [@media(width:1600px)_and_(height:900px)_and_(orientation:landscape)]:!gap-[8px] [@media(width:1600px)_and_(height:900px)_and_(orientation:landscape)]:!px-0 [@media(width:1600px)_and_(height:900px)_and_(orientation:landscape)]:!py-[10px] [@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:gap-[4px] [@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:py-2 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:gap-[6px] [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:gap-[4px] [@media(min-width:1181px)_and_(max-width:1366px)_and_(max-height:999px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:gap-[5px] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:py-2 [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:py-2 [@media(min-width:1181px)_and_(max-width:1366px)_and_(max-height:999px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:py-2 max-[820px]:grid-cols-2 max-[700px]:grid-cols-1 max-[640px]:gap-[6px]" aria-label="Primary navigation">
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
                  <span className={`leading-none [@media(width:1440px)_and_(height:900px)_and_(orientation:landscape)]:whitespace-nowrap [@media(width:1440px)_and_(height:900px)_and_(orientation:landscape)]:text-[0.92rem] [@media(width:1600px)_and_(height:900px)_and_(orientation:landscape)]:whitespace-nowrap [@media(width:1600px)_and_(height:900px)_and_(orientation:landscape)]:text-[0.92rem] ${item.active ? "text-[var(--button-text)]" : ""}`}>{item.label}</span>
                </Link>
              ))}
            </nav>
            {sidebarAction ? <div>{sidebarAction}</div> : null}
          </aside>

          {shellAlert ? (
            <section
              className={`shell-alert-toast rounded-none border px-4 py-3 shadow-[var(--shadow-pop)] ${shellAlert.placement === "top-right" ? "shell-alert-top-right fixed right-4 top-4 z-[80] w-[min(420px,calc(100vw-32px))]" : "[@media(min-width:821px)_and_(max-width:1240px)_and_(orientation:landscape)]:pointer-events-none [@media(min-width:821px)_and_(max-width:1240px)_and_(orientation:landscape)]:absolute [@media(min-width:821px)_and_(max-width:1240px)_and_(orientation:landscape)]:left-0 [@media(min-width:821px)_and_(max-width:1240px)_and_(orientation:landscape)]:top-full [@media(min-width:821px)_and_(max-width:1240px)_and_(orientation:landscape)]:z-30 [@media(min-width:821px)_and_(max-width:1240px)_and_(orientation:landscape)]:mt-[14px] [@media(min-width:821px)_and_(max-width:1240px)_and_(orientation:landscape)]:w-full [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:!static [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:!mt-0 [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:!w-full"} ${shellAlert.tone === "success"
                ? successAlertClass
                : shellAlert.tone === "info"
                  ? "border-[var(--accent-border)] [background:var(--active-surface)]"
                  : dangerAlertClass
                }`}
            >
              <p
                className={`m-0 text-[0.72rem] font-bold uppercase tracking-[0.24em] [@media(width:1366px)_and_(height:768px)_and_(orientation:landscape)]:text-[0.62rem] [@media(width:1366px)_and_(height:768px)_and_(orientation:landscape)]:tracking-[0.18em] [@media(width:1280px)_and_(height:720px)_and_(orientation:landscape)]:text-[0.62rem] [@media(width:1280px)_and_(height:720px)_and_(orientation:landscape)]:tracking-[0.16em] [@media(width:1366px)_and_(height:720px)_and_(orientation:landscape)]:text-[0.62rem] [@media(width:1366px)_and_(height:720px)_and_(orientation:landscape)]:tracking-[0.16em] ${shellAlert.tone === "success"
                  ? successAlertEyebrowClass
                  : shellAlert.tone === "info"
                    ? "text-[var(--accent-text)]"
                    : dangerAlertEyebrowClass
                  }`}
              >
                {shellAlert.tone === "success" ? "Success" : shellAlert.tone === "info" ? "Information" : "System Alert"}
              </p>
              <p
                className={`mt-2 whitespace-pre-line text-[0.95rem] leading-[1.55] [@media(width:1366px)_and_(height:768px)_and_(orientation:landscape)]:mt-1.5 [@media(width:1366px)_and_(height:768px)_and_(orientation:landscape)]:text-[0.82rem] [@media(width:1366px)_and_(height:768px)_and_(orientation:landscape)]:leading-[1.35] [@media(width:1280px)_and_(height:720px)_and_(orientation:landscape)]:mt-1 [@media(width:1280px)_and_(height:720px)_and_(orientation:landscape)]:text-[0.78rem] [@media(width:1280px)_and_(height:720px)_and_(orientation:landscape)]:leading-[1.3] [@media(width:1366px)_and_(height:720px)_and_(orientation:landscape)]:mt-1 [@media(width:1366px)_and_(height:720px)_and_(orientation:landscape)]:text-[0.78rem] [@media(width:1366px)_and_(height:720px)_and_(orientation:landscape)]:leading-[1.3] ${shellAlert.tone === "success" ? successAlertMessageClass : shellAlert.tone === "info" ? "text-[var(--foreground)]" : dangerAlertMessageClass
                  }`}
              >
                {shellAlert.message}
              </p>
            </section>
          ) : null}

          <div className="hidden rounded-none border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-card)] backdrop-blur-[14px] [@media(orientation:portrait)]:block max-[820px]:block [@media(max-width:1366px)_and_(any-pointer:coarse)]:hidden">
            <StoreStatusSummary brandName={profileName} statusStoreContent={statusStoreContent} />
            <div className="mt-4">
              <ProfileSummaryCard
                profileName={profileName}
                profileSubtitle={profileSubtitle}
                profileStatus={profileStatus}
                profileMeta={profileMeta}
                profileRole={profileRole}
                profilePlanContent={profilePlanContent}
                profileAction={profileAction}
              />
            </div>
          </div>
        </div>

        <div className={mainScrollClass}>
          <OwnerProfileContext.Provider value={{ profileName, profileSubtitle, profileStatus, profileMeta, profileRole, profilePlanContent, profileAction, profileLogo: statusStoreContent }}>
            {children}
          </OwnerProfileContext.Provider>
        </div>

        <aside className={`${hideDesktopStatusStore ? "hidden" : "flex"} max-h-full min-w-0 self-start overflow-visible rounded-none border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-card)] backdrop-blur-[14px] [@media(orientation:portrait)]:hidden [@media(min-width:821px)_and_(max-width:1240px)_and_(orientation:landscape)]:backdrop-blur-none max-[1240px]:hidden [@media(max-width:1366px)_and_(any-pointer:coarse)]:hidden [@media(min-width:744px)_and_(max-width:1024px)_and_(orientation:portrait)]:hidden [@media(min-width:821px)_and_(max-width:1366px)_and_(max-height:1024px)_and_(orientation:landscape)]:hidden [@media(width:1440px)_and_(height:900px)_and_(orientation:landscape)]:!hidden [@media(width:1600px)_and_(height:900px)_and_(orientation:landscape)]:!hidden`}>
          <div className="flex w-full flex-col">
            <StoreStatusSummary brandName={profileName} statusStoreContent={statusStoreContent} />
            <div className="mt-4">
              <ProfileSummaryCard
                profileName={profileName}
                profileSubtitle={profileSubtitle}
                profileStatus={profileStatus}
                profileMeta={profileMeta}
                profileRole={profileRole}
                profilePlanContent={profilePlanContent}
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





