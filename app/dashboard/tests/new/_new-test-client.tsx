"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { getAthletes } from "@/lib/athletes"
import { getCoachProfilesClient } from "@/lib/coach-profile"
import { grantConsentAction, declineConsentAction } from "@/app/actions/athletes"
import { Athlete } from "@/types"
import { LiveRecordingView } from "@/components/tests/live-recording-view"
import { ConsentModal, ConsentData } from "@/components/tests/consent-modal"

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
  const [athletes, setAthletes] = useState<{ id: string; firstName: string; lastName: string; gender?: string; currentWeight?: number }[]>([])
  const [coaches, setCoaches] = useState<{ uid: string; displayName: string }[]>([])
  const [coachEmail, setCoachEmail] = useState("")
  const [coachUid, setCoachUid] = useState("")
  const [showConsentModal, setShowConsentModal] = useState(false)
  const [consentAthleteName, setConsentAthleteName] = useState("")
  const [consentAthleteEmail, setConsentAthleteEmail] = useState("")
  const [guestMode, setGuestMode] = useState(false)
  const [pendingConsentAthlete, setPendingConsentAthlete] = useState<Athlete | null>(null)
  const router = useRouter()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      unsub()
      if (!user) { router.push("/login"); return }
      setCoachEmail(user.email ?? "")
      setCoachUid(user.uid)

      const [athleteData, coachData] = await Promise.all([
        getAthletes(),
        getCoachProfilesClient().catch(() => []),
      ])

      setAthletes(athleteData.map((a) => ({
        id: a.id,
        firstName: a.firstName,
        lastName: a.lastName,
        gender: a.gender,
        currentWeight: a.currentWeight ?? undefined,
      })))

      setCoaches(coachData.map((c) => ({ uid: c.uid, displayName: c.displayName })))

      if (defaultAthleteId) {
        const athlete = athleteData.find((a) => a.id === defaultAthleteId)
        if (athlete?.status === 'Pending_Consent') {
          setConsentAthleteName(`${athlete.firstName} ${athlete.lastName}`)
          setConsentAthleteEmail(athlete.email ?? "")
          setPendingConsentAthlete(athlete)
          setShowConsentModal(true)
        }
      }

      setReady(true)
    })
    return unsub
  }, [router, defaultAthleteId])

  async function handleConsent(data: ConsentData) {
    if (!defaultAthleteId) return
    await grantConsentAction(defaultAthleteId, {
      personnummer: data.personnummer,
      gender: data.gender,
      phone: data.phone,
      mainCoach: data.mainCoach,
      email: data.email,
    })
    setShowConsentModal(false)
  }

  function handleGuest() {
    setShowConsentModal(false)
    setGuestMode(true)
  }

  async function handleGuestSessionEnd() {
    if (!pendingConsentAthlete) return
    await declineConsentAction(pendingConsentAthlete.id, {
      firstName: pendingConsentAthlete.firstName,
      lastName: pendingConsentAthlete.lastName,
      email: pendingConsentAthlete.email,
      phone: pendingConsentAthlete.phone,
      clinicId: pendingConsentAthlete.clinicId,
      personnummer: pendingConsentAthlete.personnummer ?? null,
      gender: pendingConsentAthlete.gender,
      mainCoach: pendingConsentAthlete.mainCoach ?? null,
    })
  }

  if (!ready) return <PageSpinner />

  return (
    <>
      {showConsentModal && (
        <ConsentModal
          athleteName={consentAthleteName}
          athleteEmail={consentAthleteEmail}
          coaches={coaches}
          onConsent={handleConsent}
          onGuest={handleGuest}
        />
      )}
      <LiveRecordingView
        athletes={athletes}
        defaultAthleteId={defaultAthleteId}
        defaultTestType={defaultTestType}
        defaultTestLeader={coachEmail}
        coachUid={coachUid}
        guestMode={guestMode}
        onGuestSessionEnd={pendingConsentAthlete ? handleGuestSessionEnd : undefined}
      />
    </>
  )
}
