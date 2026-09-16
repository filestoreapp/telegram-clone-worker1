import type { ReactNode } from "react";
import { useLayout } from "./LayoutContext";

export function PageHero({
  title,
  subtitle,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
}) {
  const { setDrawerOpen } = useLayout();
  return (
    <div className="page-hero">
      <div className="page-hero-left">
        <button
          className="btn-mobile-drawer"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation menu"
          title="Open menu"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div className="page-hero-title">
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      {children && <div className="row">{children}</div>}
    </div>
  );
}
