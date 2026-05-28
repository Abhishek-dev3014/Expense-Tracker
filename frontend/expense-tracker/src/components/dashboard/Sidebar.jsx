import { NavLink } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import {
  LayoutDashboard,
  BarChart3,
  List,
  Target,
  Brain,
  FileText,
  RotateCcw,
  Flag,
  Medal,
  LogOut,
  User as UserIcon,
  Users,
  Sparkles,
  X,
} from "lucide-react"

const navSections = [
  {
    title: "Overview",
    items: [
      { to: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
      { to: "/dashboard/transactions", label: "Transactions", icon: List },
      { to: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    title: "Planning",
    items: [
      { to: "/dashboard/budget", label: "Budgeting", icon: Target },
      { to: "/dashboard/goals", label: "Savings Goals", icon: Flag },
      { to: "/dashboard/recurring", label: "Subscriptions", icon: RotateCcw },
      { to: "/dashboard/debts", label: "Friends & Debts", icon: Users },
    ],
  },
  {
    title: "Intelligence",
    items: [
      { to: "/dashboard/insights", label: "AI Insights", icon: Brain },
      { to: "/dashboard/reports", label: "Reports", icon: FileText },
      { to: "/dashboard/achievements", label: "Achievements", icon: Medal },
    ],
  },
]

const NavGroup = ({ title }) => (
  <p className="mb-3 mt-7 px-1 text-[10px] font-black uppercase tracking-[0.34em] text-slate-500 first:mt-0">
    {title}
  </p>
)

const Sidebar = ({ mobile = false, onClose }) => {
  const { user, logout } = useAuth()

  const linkClass = ({ isActive }) =>
    `group relative mb-1.5 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
      isActive
        ? "bg-white/[0.11] text-white shadow-[0_16px_40px_rgba(15,23,42,0.28)]"
        : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
    }`

  return (
    <aside
      className={`glass-panel surface-highlight relative flex h-full flex-col overflow-hidden rounded-[2rem] border border-white/10 ${
        mobile ? "w-full" : "w-[18rem]"
      }`}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-[-3rem] top-[-2rem] h-32 w-32 rounded-full bg-emerald-500/14 blur-3xl" />
        <div className="absolute bottom-8 left-[-2rem] h-28 w-28 rounded-full bg-indigo-500/14 blur-3xl" />
      </div>

      <div className="relative flex items-center justify-between px-5 pb-4 pt-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 border border-white/10 shadow-2xl pulse-glow group transition-all duration-500 overflow-hidden">
            <img src="/logo.png" alt="FinTrack AI" className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.34em] text-emerald-300/90">
              FinTrack AI
            </p>
            <h1 className="mt-1 font-['Outfit'] text-2xl font-semibold tracking-tight text-white">
              Wealth OS
            </h1>
          </div>
        </div>

        {mobile && (
          <button
            className="premium-chip flex h-10 w-10 items-center justify-center rounded-2xl text-slate-300 xl:hidden"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <div className="relative mx-5 rounded-[1.5rem] border border-white/[0.08] bg-white/[0.045] p-4">
        <div className="mb-3 flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.08] text-emerald-300">
            <UserIcon size={19} />
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-white">{user?.name || "Member"}</p>
            <p className="truncate text-xs text-slate-400">{user?.email || "Secure workspace"}</p>
          </div>
        </div>
        <div className="premium-chip flex items-center justify-between rounded-2xl px-3 py-2 text-xs text-slate-300">
          <span>Workspace status</span>
          <span className="rounded-full bg-emerald-400/14 px-2 py-1 font-bold uppercase tracking-[0.22em] text-emerald-300">
            Live
          </span>
        </div>
      </div>

      <div className="dashboard-scroll relative flex-1 overflow-y-auto px-5 pb-5 pt-5">
        <nav>
          {navSections.map((section) => (
            <div key={section.title}>
              <NavGroup title={section.title} />
              {section.items.map(({ to, label, icon: Icon, exact }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={exact}
                  className={linkClass}
                  onClick={mobile ? onClose : undefined}
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={`flex h-10 w-10 items-center justify-center rounded-2xl border transition-all ${
                          isActive
                            ? "border-emerald-400/30 bg-emerald-400/14 text-emerald-300 shadow-[0_12px_32px_rgba(16,185,129,0.18)]"
                            : "border-white/[0.06] bg-white/[0.045] text-slate-400 group-hover:border-white/[0.12] group-hover:text-white"
                        }`}
                      >
                        <Icon size={17} />
                      </span>
                      <span className="flex-1">{label}</span>
                      {isActive && (
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.7)]" />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </div>

      <div className="relative m-5 mt-0 rounded-[1.7rem] border border-white/[0.08] bg-gradient-to-br from-rose-500/10 to-transparent p-4">
        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">
          Session
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Your financial data is ready. Review the latest activity, then keep your budget streak moving.
        </p>
        <button
          onClick={logout}
          className="premium-button mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-400/18 bg-rose-500/12 px-4 py-3 text-sm font-semibold text-rose-200 hover:border-rose-300/35 hover:bg-rose-500/18"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
