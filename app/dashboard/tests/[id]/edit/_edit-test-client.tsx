"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { getTest } from "@/lib/tests"
import { getAthlete } from "@/lib/athletes"
import { Test, Athlete } from "@/types"
import { fullName } from "@/lib/utils"
import { EditTestForm } from "./edit-form"

function PageSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="h-8 w-8 rounded-full border-2 border-[#007AFF] border-t-transparent animate-spin" />
    </div>
  )
}

export function EditTestClient({ id }: { id: string }) {
  const [test, setTest] = useState<Test | null>(null)
  const [athlete, setAthlete] = useState<Athlete | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      unsub()
      if (!user) { router.push("/login"); return }
      const t = await getTest(id)
      if (!t) { router.push("/dashboard/athletes"); return }
      const [fetchedAthlete] = await Promise.all([getAthlete(t.athleteId)])
      setTest(t)
      setAthlete(fetchedAthlete)
      setLoading(false)
    })
    return unsub
  }, [id, router])

  if (loading) return <PageSpinner />
  if (!test) return null

  const testDateStr = new Date(test.testDate.seconds * 1000).toISOString().split("T")[0]

  return (
    <div className="space-y-6 py-6">
      <div>
        <h1 className="text-2xl font-bold">Redigera test</h1>
        {athlete && (
          <p className="text-sm text-[#86868B] mt-0.5">{fullName(athlete.firstName, athlete.lastName)}</p>
        )}
      </div>
      <EditTestForm
        testId={test.id}
        athleteId={test.athleteId}
        testDate={testDateStr}
        notes={test.notes ?? ""}
        rawData={test.rawData}
        sport={test.sport}
        testType={test.testType}
        protocol={test.protocol}
        testLocation={test.testLocation}
        testLeader={test.testLeader ?? ""}
        inputParams={test.inputParams}
        coachAssessment={test.coachAssessment ?? null}
        settings={test.settings ?? null}
      />
    </div>
  )
}
