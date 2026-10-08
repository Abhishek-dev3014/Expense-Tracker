const StatCard = ({ title, value, subtitle, highlight = false, icon }) => (
  <div className={`stat-card${highlight ? " featured" : ""}`}>
    <div className="stat-label">
      <span>{title}</span>
      {icon}
    </div>
    <div className="stat-value">
      {new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(value || 0)}
    </div>
    <div className="stat-foot">{subtitle}</div>
  </div>
)
export default StatCard
