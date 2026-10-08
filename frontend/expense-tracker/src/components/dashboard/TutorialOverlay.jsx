import { useEffect, useRef, useState } from "react"
import {
  X,
  ArrowRight,
  Wallet,
  Target,
  ChartNoAxesCombined,
} from "lucide-react"
const steps = [
  {
    title: "Welcome to FinTrack",
    description:
      "Start by adding your income and expenses. Your overview brings everything together in one clear picture.",
    icon: Wallet,
  },
  {
    title: "Give your money a plan",
    description:
      "Set a monthly budget, add recurring payments, and save toward something you care about.",
    icon: Target,
  },
  {
    title: "Find your own rhythm",
    description:
      "Visit Analytics to understand your spending. Small, consistent changes add up over time.",
    icon: ChartNoAxesCombined,
  },
]
export default function TutorialOverlay({ onComplete }) {
  const [step, setStep] = useState(0)
  const dialog = useRef(null)
  useEffect(() => {
    const element = dialog.current
    element.showModal()
    return () => element.close()
  }, [])
  const { title, description, icon: Icon } = steps[step]
  return (
    <dialog
      ref={dialog}
      className="transaction-dialog"
      aria-labelledby="tour-title"
      onCancel={(event) => {
        event.preventDefault()
        onComplete()
      }}
    >
      <div className="dialog-title">
        <span className="transaction-icon">
          <Icon size={20} />
        </span>
        <button
          className="icon-button"
          aria-label="Close welcome tour"
          onClick={onComplete}
        >
          <X size={18} />
        </button>
      </div>
      <p className="eyebrow" style={{ marginTop: 24 }}>
        Getting started · {step + 1} of {steps.length}
      </p>
      <h2
        id="tour-title"
        style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}
      >
        {title}
      </h2>
      <p
        style={{
          fontSize: 14,
          lineHeight: 1.8,
          color: "var(--muted)",
          marginBottom: 25,
        }}
      >
        {description}
      </p>
      <div className="flex justify-between items-center">
        <button className="text-link" onClick={onComplete}>
          Skip tour
        </button>
        <button
          className="btn btn-primary"
          onClick={() =>
            step < steps.length - 1 ? setStep(step + 1) : onComplete()
          }
        >
          {step === steps.length - 1 ? "Get started" : "Next"}
          <ArrowRight size={15} />
        </button>
      </div>
    </dialog>
  )
}
