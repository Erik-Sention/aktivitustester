"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { getAthletes } from "@/lib/athletes"
import { LiveRecordingView } from "@/components/tests/live-recording-view"

function PageSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="h-8 w-8 rounded-full border-2 border-[#007AFF] border-t-transparent animate-spin" />
    </div>
  )
}

interface NewTestClientProps {
  defaultAthleteId?: string
  defaultTestType?: string
}

export function NewTestClient({ defaultAthleteId, defaultTestType }: NewTestClientProps) {
  const [ready, setReady] = useState(false)
  const [athletes, setAthletes] = useState<{ id: string; firstName: string; lastName: string; currentWeight?: number }[]>([])
  const [coachEmail, setCoachEmail] = useState("")
  const [coachUid, setCoachUid] = useState("")
  const router = useRouter()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      unsub()
      if (!user) { router.push("/login"); return }
      setCoachEmail(user.email ?? "")
      setCoachUid(user.uid)
      const data = await getAthletes()
      setAthletes(data.map((a) => ({
        id: a.id,
        firstName: a.firstName,
        lastName: a.lastName,
        currentWeight: a.currentWeight ?? undefined,
      })))
      setReady(true)
    })
    return unsub
  }, [router])

  if (!ready) return <PageSpinner />

  return (
    <LiveRecordingView
      athletes={athletes}
      defaultAthleteId={defaultAthleteId}
      defaultTestType={defaultTestType}
      defaultTestLeader={coachEmail}
      coachUid={coachUid}
    />
  )
}
