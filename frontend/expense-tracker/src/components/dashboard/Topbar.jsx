import { Menu, ChevronRight, CalendarDays } from "lucide-react"
import { useAuth } from "../../context/AuthContext"
export default function Topbar({ title, onOpenSidebar }) {
  const { user } = useAuth()
  return (
    <header className="topbar">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="icon-button menu-button"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <div className="breadcrumb">
          <span>Personal workspace</span>
          <ChevronRight size={12} />
          <strong>{title}</strong>
        </div>
      </div>
      <div className="topbar-end">
        <span className="topbar-date">
          <CalendarDays size={14} />
          {new Date().toLocaleDateString("en-IN", {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
        <div className="avatar" title={user?.name || "Your account"}>
          {(user?.name || "You")
            .split(" ")
            .map((x) => x[0])
            .slice(0, 2)
            .join("")
            .toUpperCase()}
        </div>
      </div>
    </header>
  )
}
