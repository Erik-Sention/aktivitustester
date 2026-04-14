"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { getAthlete } from "@/lib/athletes"
import { Athlete } from "@/types"
import { fullName } from "@/lib/utils"
import { AthleteForm } from "@/components/athletes/athlete-form"

function PageSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="h-8 w-8 rounded-full border-2 border-[#007AFF] border-t-transparent animate-spin" />
    </div>
  )
}

export function EditAthleteClient({ id }: { id: string }) {
  const [athlete, setAthlete] = useState<Athlete | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      unsub()
      if (!user) { router.push("/login"); return }
      const a = await getAthlete(id)
      if (!a) { router.push("/dashboard/athletes"); return }
      setAthlete(a)
      setLoading(false)
    })
    return unsub
  }, [id, router])

  if (loading) return <PageSpinner />
  if (!athlete) return null

  const birthDateStr = athlete.birthDate
    ? new Date(athlete.birthDate.seconds * 1000).toISOString().split("T")[0]
    : ""

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-2xl font-bold">
        Redigera — {fullName(athlete.firstName, athlete.lastName)}
      </h1>
      <AthleteForm
        existing={{
          id: athlete.id,
          firstName: athlete.firstName,
          lastName: athlete.lastName,
          personnummer: athlete.personnummer ?? "",
          birthDate: birthDateStr,
          gender: athlete.gender,
          email: athlete.email,
          phone: athlete.phone,
          mainCoach: athlete.mainCoach ?? "",
        }}
      />
    </div>
  )
}
