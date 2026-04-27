"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { getTest } from "@/lib/tests"
import { getAthlete } from "@/lib/athletes"
import { Test } from "@/types"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn, fullName } from "@/lib/utils"
import { CompareView, SerializedFullTest } from "@/components/tests/compare-view"
import { ArrowLeft } from "lucide-react"

function PageSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="h-8 w-8 rounded-full border-2 border-[#0071BA] border-t-transparent animate-spin" />
    </div>
  )
}

function serialize(t: Test): SerializedFullTest {
  return {
    id: t.id,
    testType: t.testType,
    sport: t.sport,
    testDateStr: new Date(t.testDate.seconds * 1000).toLocaleDateString("sv-SE"),
    inputParams: {
      startWatt: t.inputParams.startWatt ?? 0,
      stepSize: t.inputParams.stepSize ?? 0,
      startSpeed: t.inputParams.startSpeed ?? 0,
      speedIncrement: t.inputParams.speedIncrement ?? 0,
      testDuration: t.inputParams.testDuration,
      bodyWeight: t.inputParams.bodyWeight,
    },
    results: {
      atWatt: t.results.atWatt,
      ltWatt: t.results.ltWatt,
      maxHR: t.results.maxHR,
      maxLactate: t.results.maxLactate,
      vo2Max: t.results.vo2Max,
    },
    rawData: (t.rawData ?? []).map((p) => ({ watt: p.watt, speed: p.speed ?? 0, hr: p.hr, lac: p.lac })),
  }
}

export function CompareClient({ idList }: { idList: string[] }) {
  const [tests, setTests] = useState<Test[]>([])
  const [athleteName, setAthleteName] = useState("")
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      unsub()
      if (!user) { router.push("/login"); return }
      const fetched = await Promise.all(idList.map((id) => getTest(id)))
      const valid = fetched.filter(Boolean) as Test[]
      setTests(valid)
      if (valid.length > 0) {
        const athlete = await getAthlete(valid[0].athleteId)
        if (athlete) setAthleteName(fullName(athlete.firstName, athlete.lastName))
      }
      setLoading(false)
    })
    return unsub
  }, [idList, router])

  if (loading) return <PageSpinner />

  if (tests.length < 2) {
    return (
      <div className="text-center py-16">
        <p className="text-lg font-semibold text-primary">Kunde inte ladda tester för jämförelse</p>
        <Link href="/dashboard/athletes" className={cn(buttonVariants({ variant: "outline" }), "mt-4")}>
          Tillbaka till atleter
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/athletes/${tests[0].athleteId}`} className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
          <ArrowLeft className="h-4 w-4" />
          Tillbaka till {athleteName || "atleten"}
        </Link>
        <h1 className="text-xl font-bold text-[#1D1D1F]">Jämförelse</h1>
      </div>
      <CompareView tests={tests.map(serialize)} athleteName={athleteName} />
    </div>
  )
}
