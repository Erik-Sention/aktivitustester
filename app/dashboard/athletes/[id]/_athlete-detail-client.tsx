"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { getAthlete } from "@/lib/athletes"
import { getTests } from "@/lib/tests"
import { Athlete, Test } from "@/types"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn, fullName } from "@/lib/utils"
import { AthleteTestsPanel, SerializedTest } from "@/components/athletes/athlete-tests-panel"
import { AthleteTrendChart } from "@/components/athletes/athlete-trend-chart"
import { ConsentModal } from "@/components/tests/consent-modal"
import { grantConsentAction, declineConsentAction } from "@/app/actions/athletes"
import { getCoachProfilesClient } from "@/lib/coach-profile"
import { Pencil, Mail, Phone, User, Calendar, Hash, ShieldCheck, ShieldOff, Clock } from "lucide-react"

function PageSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="h-8 w-8 rounded-full border-2 border-[#007AFF] border-t-transparent animate-spin" />
    </div>
  )
}

export function AthleteDetailClient({ id }: { id: string }) {
  const [mounted, setMounted] = useState(false)
  const [athlete, setAthlete] = useState<Athlete | null>(null)
  const [tests, setTests] = useState<Test[]>([])
  const [loading, setLoading] = useState(true)
  const [showConsentModal, setShowConsentModal] = useState(false)
  const [showTrend, setShowTrend] = useState(false)
  const [coaches, setCoaches] = useState<{ uid: string; displayName: string }[]>([])
  const router = useRouter()

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      unsub()
      if (!user) { router.push("/login"); return }
      const [a, t, cs] = await Promise.all([getAthlete(id), getTests(id), getCoachProfilesClient()])
      setAthlete(a)
      setTests(t)
      setCoaches(cs.map(c => ({ uid: c.uid, displayName: c.displayName })))
      setLoading(false)
    })
    return unsub
  }, [id, router])

  async function refetchAthlete() {
    const a = await getAthlete(id)
    setAthlete(a)
  }

  if (!mounted) return null
  if (loading) return <PageSpinner />

  if (!athlete) {
    return (
      <div className="text-center py-16">
        <p className="text-lg font-semibold text-primary">Atleten hittades inte</p>
        <Link href="/dashboard/athletes" className={cn(buttonVariants({ variant: "outline" }), "mt-4")}>
          Tillbaka till atleter
        </Link>
      </div>
    )
  }

  const serializedTests: SerializedTest[] = tests.map((t) => ({
    id: t.id,
    testType: t.testType,
    sport: t.sport,
    testDateStr: new Date(t.testDate.seconds * 1000).toLocaleDateString("sv-SE"),
    inputParams: {
      startWatt: t.inputParams.startWatt ?? 0,
      stepSize: t.inputParams.stepSize ?? 0,
      testDuration: t.inputParams.testDuration,
    },
    results: {
      atWatt: t.results.atWatt,
      ltWatt: t.results.ltWatt,
      maxHR: t.results.maxHR,
      maxLactate: t.results.maxLactate,
    },
  }))

  const birthDateStr = athlete.birthDate
    ? new Date(athlete.birthDate.seconds * 1000).toLocaleDateString("sv-SE")
    : null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 items-start">
      {/* Left: Profile card */}
      <Card className="lg:sticky lg:top-6">
        <CardContent className="p-6 space-y-5">
          <div>
            <h1 className="text-xl font-bold text-primary">
              {fullName(athlete.firstName, athlete.lastName)}
            </h1>
            {athlete.gender && (
              <p className="text-sm text-secondary mt-0.5">
                {athlete.gender === "M" ? "Man" : "Kvinna"}
              </p>
            )}
          </div>

          <div className="space-y-3">
            {birthDateStr && (
              <div className="flex items-start gap-2.5">
                <Calendar className="h-4 w-4 text-secondary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-secondary uppercase tracking-wide">Född</p>
                  <p className="text-sm text-primary">{birthDateStr}</p>
                </div>
              </div>
            )}
            {athlete.personnummer && (
              <div className="flex items-start gap-2.5">
                <Hash className="h-4 w-4 text-secondary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-secondary uppercase tracking-wide">Personnummer</p>
                  <p className="text-sm text-primary">{athlete.personnummer}</p>
                </div>
              </div>
            )}
            {athlete.email && (
              <div className="flex items-start gap-2.5">
                <Mail className="h-4 w-4 text-secondary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-secondary uppercase tracking-wide">E-post</p>
                  <p className="text-sm text-primary break-all">{athlete.email}</p>
                </div>
              </div>
            )}
            {athlete.phone && (
              <div className="flex items-start gap-2.5">
                <Phone className="h-4 w-4 text-secondary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-secondary uppercase tracking-wide">Telefon</p>
                  <p className="text-sm text-primary">{athlete.phone}</p>
                </div>
              </div>
            )}
            {athlete.mainCoach && (
              <div className="flex items-start gap-2.5">
                <User className="h-4 w-4 text-secondary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-secondary uppercase tracking-wide">Huvudcoach</p>
                  <p className="text-sm text-primary">{athlete.mainCoach}</p>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-black/[0.06]" />

          {/* Consent status */}
          {(() => {
            const status = athlete.status
            if (status === 'Active') {
              const consentDate = athlete.consentAt
                ? new Date(athlete.consentAt.seconds * 1000).toLocaleDateString("sv-SE")
                : null
              return (
                <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2">
                  <ShieldCheck className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-green-800">Samtycke aktivt</p>
                    {consentDate && (
                      <p className="text-xs text-green-700">Bekräftat {consentDate}</p>
                    )}
                  </div>
                </div>
              )
            }
            if (status === 'Consent_Revoked') {
              const revokedDate = athlete.consentRevokedAt
                ? new Date(athlete.consentRevokedAt.seconds * 1000).toLocaleDateString("sv-SE")
                : null
              return (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                  <ShieldOff className="h-4 w-4 text-red-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-red-800">Samtycke indraget</p>
                    {revokedDate && (
                      <p className="text-xs text-red-700">Indraget {revokedDate}</p>
                    )}
                  </div>
                </div>
              )
            }
            if (status === 'Pending_Consent') {
              return (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                    <Clock className="h-4 w-4 text-amber-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-amber-800">Inväntar samtycke</p>
                      <p className="text-xs text-amber-700">Lös samtycket vid nästa testtillfälle</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowConsentModal(true)}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full justify-center")}
                  >
                    Bekräfta samtycke
                  </button>
                </div>
              )
            }
            return null
          })()}

          <div className="border-t border-black/[0.06]" />

          <div className="flex gap-2">
            <Link
              href={`/dashboard/athletes/${id}/edit`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "flex-1 justify-center")}
            >
              <Pencil className="h-4 w-4" />
              Redigera
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Right: Tests panel (with integrated Förändring button) + optional trend chart */}
      <div className="space-y-4">
      <AthleteTestsPanel
        tests={serializedTests}
        fileResults={[]}
        athleteId={id}
        athleteName={fullName(athlete.firstName, athlete.lastName)}
        requiresConsent={athlete.status === 'Pending_Consent' || athlete.status === 'Consent_Revoked'}
        onConsentRequired={() => setShowConsentModal(true)}
        hasTrendData={serializedTests.filter((t) => t.testType === "troskeltest" && (t.results.atWatt || t.results.ltWatt)).length >= 2}
        showTrend={showTrend}
        onToggleTrend={() => setShowTrend((v) => !v)}
      />
      {showTrend && <AthleteTrendChart tests={serializedTests} />}
      </div>

      {showConsentModal && (
        <ConsentModal
          athleteName={fullName(athlete.firstName, athlete.lastName)}
          athleteEmail={athlete.email ?? ""}
          coaches={coaches}
          onConsent={async (data) => {
            await grantConsentAction(id, data)
            setShowConsentModal(false)
            await refetchAthlete()
          }}
          onGuest={
            athlete.status === 'Pending_Consent'
              ? async () => {
                  await declineConsentAction(id, {
                    firstName: athlete.firstName,
                    lastName: athlete.lastName,
                    email: athlete.email,
                    phone: athlete.phone,
                    clinicId: athlete.clinicId,
                    personnummer: athlete.personnummer ?? null,
                    gender: athlete.gender,
                    mainCoach: athlete.mainCoach ?? null,
                  })
                  router.push("/dashboard/athletes")
                }
              : () => setShowConsentModal(false)
          }
          onGuestLabel={
            athlete.status === 'Pending_Consent'
              ? "NEJ – Kunden tackar nej till registrering"
              : "Avbryt"
          }
        />
      )}
    </div>
  )
}
