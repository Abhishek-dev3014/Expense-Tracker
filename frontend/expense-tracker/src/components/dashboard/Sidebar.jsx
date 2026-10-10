import Brand from "../ui/Brand"
import { NavLink, Link } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import {
  LayoutDashboard,
  ChartNoAxesCombined,
  ArrowLeftRight,
  Target,
  Lightbulb,
  FileText,
  Repeat2,
  Flag,
  Medal,
  LogOut,
  Wallet,
  X,
  ArrowUpRight,
} from "lucide-react"

const sections = [
  {
    title: "Workspace",
    items: [
      ["", "Overview", LayoutDashboard],
      ["transactions", "Transactions", ArrowLeftRight],
      ["analytics", "Analytics", ChartNoAxesCombined],
    ],
  },
  {
    title: "Plan & manage",
    items: [
      ["budget", "Budgets", Target],
      ["goals", "Savings goals", Flag],
      ["recurring", "Recurring payments", Repeat2],
      ["debts", "Shared expenses", Wallet],
    ],
  },
  {
    title: "Discover",
    items: [
      ["insights", "Insights", Lightbulb],
      ["reports", "Reports", FileText],
      ["achievements", "Achievements", Medal],
    ],
  },
]

export default function Sidebar({ mobile = false, onClose }) {
  const { user, logout } = useAuth()
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Brand />
        {mobile && (
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        )}
      </div>
      <div className="workspace-label">
        <Wallet size={17} />
        <div>
          <strong>Personal workspace</strong>
          <span>Personal finance</span>
        </div>
      </div>
      <nav
        className="sidebar-nav dashboard-scroll"
        aria-label="Main navigation"
      >
        {sections.map((section) => (
          <div key={section.title}>
            <p className="nav-group">{section.title}</p>
            {section.items.map(([path, label, icon]) => {
              const Icon = icon
              return (
                <NavLink
                  key={path}
                  to={`/dashboard${path ? `/${path}` : ""}`}
                  end={!path}
                  className={({ isActive }) =>
                    `nav-link${isActive ? " active" : ""}`
                  }
                  onClick={mobile ? onClose : undefined}
                >
                  <Icon size={17} strokeWidth={1.7} />
                  {label}
                </NavLink>
              )
            })}
          </div>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-note">
          <strong>Your monthly plan</strong>
          <p>Set spending limits that work for you.</p>
          <Link to="/dashboard/budget" onClick={onClose}>
            Manage budgets <ArrowUpRight size={13} />
          </Link>
        </div>
        <div className="profile">
          <div className="avatar">
            {(user?.name || "Member")
              .split(" ")
              .map((x) => x[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="profile-name">{user?.name || "Your account"}</div>
            <div className="profile-email">
              {user?.email || "Personal account"}
            </div>
          </div>
          <button
            onClick={logout}
            className="icon-button"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  )
}
