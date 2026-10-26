import type { ReactNode } from "react";
import { Link } from "@remix-run/react";

export interface HeroStat {
  label: string;
  value: ReactNode;
  /** Change against the previous period, e.g. "+12%" */
  delta?: ReactNode;
}

/** Violet gradient header used at the top of every app page. */
export function BrandHero({
  eyebrow = "Kodra Play",
  title,
  subtitle,
  action,
  stats,
  footer,
  compact = false,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  action?: { label: string; to: string };
  stats?: HeroStat[];
  footer?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "gd-hero gd-hero--compact" : "gd-hero"}>
      <div className="gd-hero-top">
        <div>
          <p className="gd-hero-eyebrow">{eyebrow}</p>
          <h1 className="gd-hero-title">{title}</h1>
          {subtitle && <p className="gd-hero-sub">{subtitle}</p>}
        </div>
        {action && (
          <Link className="gd-hero-btn" to={action.to}>
            {action.label}
          </Link>
        )}
      </div>
      {stats && stats.length > 0 && (
        <div className="gd-hero-stats">
          {stats.map((s) => (
            <div className="gd-hero-stat" key={s.label}>
              <div className="gd-hero-stat-value">{s.value}</div>
              <div className="gd-hero-stat-label">{s.label}</div>
              {s.delta !== undefined && <div className="gd-hero-stat-delta">{s.delta}</div>}
            </div>
          ))}
        </div>
      )}
      {footer && <div className="gd-hero-foot">{footer}</div>}
    </div>
  );
}
