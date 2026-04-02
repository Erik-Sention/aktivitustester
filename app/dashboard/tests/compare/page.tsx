import { notFound } from "next/navigation"
import Link from "next/link"
import { getTest } from "@/lib/tests"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CompareView, SerializedFullTest } from "@/components/tests/compare-view"
import { ArrowLeft } from "lucide-react"

export default async function CompareTestsPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>
}) {
  const { ids } = await searchParams
  const idList = (ids ?? "").split(",").map((s) => s.trim()).filter(Boolean)

  if (idList.length < 2) notFound()

  const fetched = await Promise.all(idList.map((id) => getTest(id)))
  const tests = fetched.filter(Boolean) as NonNullable<(typeof fetched)[number]>[]

  if (tests.length < 2) notFound()

  function serialize(t: NonNullable<(typeof fetched)[number]>): SerializedFullTest {
    return {
      id: t.id,
      testType: t.testType,
      sport: t.sport,
      testDateStr: new Date(t.testDate.seconds * 1000).toLocaleDateString("sv-SE"),
      inputParams: {
        startWatt: t.inputParams.startWatt,
        stepSize: t.inputParams.stepSize,
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
      rawData: (t.rawData ?? []).map((p) => ({ watt: p.watt, hr: p.hr, lac: p.lac })),
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/athletes/${tests[0].athleteId}`} className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
          <ArrowLeft className="h-4 w-4" />
          Tillbaka
        </Link>
        <h1 className="text-xl font-bold text-[#1D1D1F]">Jämförelse</h1>
      </div>

      <CompareView tests={tests.map(serialize)} />
    </div>
  )
}
