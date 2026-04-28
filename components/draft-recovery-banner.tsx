"use client"

import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { loadDraft, clearDraft, draftRelativeTime } from "@/lib/recording-draft"

function testTypeLabel(testType: string): string {
  if (testType === "vo2max") return "VO₂max-test"
  if (testType === "wingate") return "Wingatetest"
  return "tröskeltest"
}

export function DraftRecoveryBanner() {
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [testLabel, setTestLabel] = useState<string>("test")
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const d = loadDraft()
    if (!d) { setSavedAt(null); return }
    const hasData = d.step === "recording" || d.rows.some((r) => r.hr > 0 || r.lac > 0)
    if (hasData) {
      setSavedAt(d.savedAt)
      setTestLabel(testTypeLabel(d.form.testType))
    } else {
      setSavedAt(null)
    }
  }, [pathname])

  if (!savedAt || pathname === "/dashboard/tests/new") return null

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center justify-between gap-4">
      <p className="text-sm text-amber-800">
        <span className="font-semibold">Osparad {testLabel}</span>
        {" — "}sparad {draftRelativeTime(savedAt)}
      </p>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => router.push("/dashboard/tests/new?resume=1")}
          className="text-sm font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors"
        >
          Återuppta
        </button>
        <button
          onClick={() => { clearDraft(); setSavedAt(null) }}
          className="text-sm text-amber-700 hover:text-amber-900 px-3 py-1.5 rounded-lg transition-colors"
        >
          Ignorera
        </button>
      </div>
    </div>
  )
}
