"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { getAthlete } from "@/lib/athletes"
import { Athlete } from "@/types"
import { fullName } from "@/lib/utils"
import { AthleteForm } from "@/components/athletes/athlete-form"
import { DeleteAthleteButton } from "@/components/athletes/delete-athlete-button"
import { RevokeConsentButton } from "@/components/athletes/revoke-consent-button"
import { RenewConsentButton } from "@/components/athletes/renew-consent-button"
import { AthleteStatus } from "@/types"

function ConsentPill({ status }: { status: AthleteStatus | undefined }) {
  if (status === 'Active')
    return <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">● Samtycke aktivt</span>
  if (status === 'Consent_Revoked')
    return <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">● Samtycke indraget</span>
  if (status === 'Pending_Consent')
    return <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">● Inväntar samtycke</span>
  return null
}

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

  async function refetchAthlete() {
    const a = await getAthlete(id)
    if (a) setAthlete(a)
  }

  if (loading) return <PageSpinner />
  if (!athlete) return null

  const birthDateStr = athlete.birthDate
    ? new Date(athlete.birthDate.seconds * 1000).toISOString().split("T")[0]
    : ""

  return (
    <div className="max-w-lg space-y-4">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">
          Redigera — {fullName(athlete.firstName, athlete.lastName)}
        </h1>
        <ConsentPill status={athlete.status} />
        {athlete.status === 'Active' && (
          <RevokeConsentButton athleteId={id} onRevoked={refetchAthlete} />
        )}
        {athlete.status === 'Consent_Revoked' && (
          <RenewConsentButton athleteId={id} onRenewed={refetchAthlete} />
        )}
      </div>
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
      <div className="border-t border-black/[0.06] pt-4">
        <DeleteAthleteButton athleteId={id} />
      </div>
    </div>
  )
}
