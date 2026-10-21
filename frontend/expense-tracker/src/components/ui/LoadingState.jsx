function FinanceMark() {
  return (
    <span className="finance-loader" aria-hidden="true">
      <svg viewBox="0 0 80 72" fill="none">
        <rect className="finance-loader-sheet" x="14" y="12" width="45" height="49" rx="10" />
        <path className="finance-loader-rule" d="M24 25h14M24 31h9" />
        <path className="finance-loader-baseline" d="M24 51h25" />
        <g className="finance-loader-bars">
          <rect x="25" y="41" width="5" height="8" rx="2" />
          <rect x="34" y="36" width="5" height="13" rx="2" />
          <rect x="43" y="30" width="5" height="19" rx="2" />
        </g>
        <g className="finance-loader-coin">
          <circle cx="59" cy="20" r="12" />
          <path d="M55 15h8m-8 4h8m-7-4c6 0 6 7 0 7l6 5" />
        </g>
      </svg>
    </span>
  )
}

export function LoadingIndicator({ children = "Loading…", className = "" }) {
  return (
    <span className={`loading-indicator ${className}`}>
      <span className="loading-meter" aria-hidden="true"><i /><i /><i /></span>
      <span>{children}</span>
    </span>
  )
}

function SkeletonLine({ width = "65%", large = false }) {
  return <span className={`loading-skeleton loading-line${large ? " loading-line-large" : ""}`} style={{ width }} />
}

function SkeletonRows({ rows = 5 }) {
  return (
    <div className="loading-rows">
      {Array.from({ length: rows }, (_, index) => (
        <div className="loading-row" key={index}>
          <span className="loading-skeleton loading-avatar" />
          <span className="loading-row-description">
            <SkeletonLine width={index % 2 ? "52%" : "72%"} />
            <SkeletonLine width="38%" />
          </span>
          <span className="loading-skeleton loading-amount" />
        </div>
      ))}
    </div>
  )
}

function SkeletonChart() {
  return (
    <div className="loading-chart">
      <div className="loading-chart-grid" />
      <div className="loading-chart-bars">
        {[34, 52, 43, 70, 58, 88, 74, 95].map((height, index) => (
          <span className="loading-skeleton" key={index} style={{ height: `${height}%` }} />
        ))}
      </div>
    </div>
  )
}

/** Visual placeholders never stand in for actual balances or report values. */
export default function LoadingState({ label = "Loading your workspace…", variant = "dashboard", cards = 4, rows = 5 }) {
  const compact = variant === "table" || variant === "panel"
  return (
    <div className={`loading-state loading-state-${variant}`} role="status" aria-live="polite" aria-atomic="true">
      <div className="loading-state-caption">
        {!compact && <FinanceMark />}
        <span className="loading-state-label">{compact ? <LoadingIndicator>{label}</LoadingIndicator> : label}</span>
        {!compact && <span className="loading-caption-track" aria-hidden="true" />}
      </div>
      <div className="loading-layout" aria-hidden="true">
        {compact ? <SkeletonRows rows={rows} /> : (
          <>
            <div className={`loading-card-grid loading-card-grid-${cards}`}>
              {Array.from({ length: cards }, (_, index) => (
                <div className="panel loading-card" key={index}>
                  <div className="loading-card-heading"><SkeletonLine width="52%" /><span className="loading-skeleton loading-avatar" /></div>
                  <SkeletonLine width="62%" large />
                  <SkeletonLine width="78%" />
                </div>
              ))}
            </div>
            {variant !== "cards" && (
              <div className="loading-columns">
                <div className="panel loading-detail">
                  <SkeletonLine width="38%" />
                  {variant === "chart" ? <SkeletonChart /> : <SkeletonRows rows={rows} />}
                </div>
                <div className="panel loading-detail"><SkeletonLine width="45%" /><SkeletonChart /></div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
