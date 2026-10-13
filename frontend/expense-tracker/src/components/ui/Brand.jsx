import { Link } from "react-router-dom"
import { ChartNoAxesCombined } from "lucide-react"
const Brand = () => (
  <Link to="/dashboard" className="brand">
    <span className="brand-mark">
      <ChartNoAxesCombined size={21} strokeWidth={2.4} />
    </span>
    fintrack<span className="brand-period">.</span>
  </Link>
)
export default Brand
