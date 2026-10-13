const StatCard = ({
  title,
  value,
  subtitle,
  highlight = false,
  icon,
  tone = "neutral",
}) => (
  <div className={`stat-card stat-${tone}${highlight ? " featured" : ""}`}>
    <div className="stat-label">
      <span>{title}</span>
      <span className="stat-icon">{icon}</span>
    </div>
    <div className="stat-value" key={value}>
      {new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(value || 0)}
    </div>
    <div className="stat-foot">
      <span className="stat-indicator" aria-hidden="true" />
      {subtitle}
    </div>
  </div>
)
export default StatCard
