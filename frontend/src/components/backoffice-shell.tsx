import Link from "next/link";
import type { ReactNode } from "react";

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
  return (
    <div className={`dashboard-shell ${className}`.trim()}>
      <aside className="sidebar-card">
        <div className="sidebar-brand">
          <p className="eyebrow-label">{eyebrow}</p>
          <h1>{brandName}</h1>
          <p>{brandSubtitle}</p>
        </div>

        <nav className="sidebar-nav" aria-label="Primary navigation">
          {sidebarItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={item.active ? "sidebar-link is-active" : "sidebar-link"}
              aria-current={item.active ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="profile-card">
          <div className="profile-row">
            <div>
              <h2>{profileName}</h2>
              <p className="profile-subtitle">{profileSubtitle}</p>
              <p className="profile-meta">{profileMeta}</p>
            </div>
            <span className="status-pill">{profileStatus}</span>
          </div>
          {profileAction}
        </div>
      </aside>

      <div className="dashboard-content">{children}</div>
    </div>
  );
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
    <section className={`panel-card ${className}`.trim()}>
      <div className="panel-header">
        <div>
          {eyebrow ? <p className="eyebrow-label">{eyebrow}</p> : null}
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        {actions ? <div className="panel-actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}
