import Link from "next/link"
import { notFound } from "next/navigation"
import { getTest } from "@/lib/tests"
import { getAthlete } from "@/lib/athletes"
import { fullName, cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { LactateChart } from "@/components/tests/lactate-chart"
import { DeleteTestButton } from "@/components/tests/delete-test-button"
import { ReportDownloadButton } from "@/components/tests/report-download-button"
import { Pencil } from "lucide-react"

function testTypeLabel(type: string) {
  if (type === "troskeltest") return "Tröskeltest"
  if (type === "vo2max") return "VO₂ max-test"
  if (type === "wingate") return "Wingate"
  return type
}

function sportLabel(sport: string) {
  if (sport === "cykel") return "Cykel"
  if (sport === "lopning") return "Löpning"
  if (sport === "skidor_band") return "Skidor (band)"
  if (sport === "skierg") return "Skierg"
  if (sport === "kajak") return "Kajak"
  return sport
}

export default async function TestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const test = await getTest(id)
  if (!test) notFound()

  const athlete = await getAthlete(test.athleteId)
  const athleteName = athlete ? fullName(athlete.firstName, athlete.lastName) : "—"

  const r = test.results
  const testDateStr = new Date(test.testDate.seconds * 1000).toLocaleDateString("sv-SE")

  // Serialize Firestore Timestamps to plain objects before passing to client component
  const serializedTest = {
    ...test,
    testDate: { seconds: test.testDate.seconds, nanoseconds: test.testDate.nanoseconds },
    createdAt: { seconds: test.createdAt.seconds, nanoseconds: test.createdAt.nanoseconds },
  }

  // Map rawData to chart-compatible stage format
  const chartStages = test.rawData.map((p, i) => ({
    stageNumber: i + 1,
    loadWatts: p.watt || null,
    loadSpeedKmh: null,
    heartRate: p.hr || null,
    lactateMmol: p.lac || null,
    vo2MlKgMin: null,
    rpe: p.borg || null,
  }))

  return (
    <div id="test-detail-content" className="space-y-6">

      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-0.5">
          <nav className="flex items-center gap-1.5 text-xs font-semibold text-[#86868B]" data-pdf-hide>
            <Link href="/dashboard/athletes" className="hover:text-[#007AFF] transition-colors">Atleter</Link>
            <span>/</span>
            <Link href={`/dashboard/athletes/${test.athleteId}`} className="hover:text-[#007AFF] transition-colors text-[#1D1D1F]">
              {athleteName}
            </Link>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-[#1D1D1F]">
            {testTypeLabel(test.testType)}
            <span className="ml-2 text-lg font-normal text-[#86868B]">— {sportLabel(test.sport)} — {athleteName}</span>
          </h1>
          <p className="text-sm text-[#86868B]">
            {testDateStr}
            {test.inputParams.startWatt > 0 && (
              <span className="ml-3 text-[#D1D1D6]">·</span>
            )}
            {test.inputParams.startWatt > 0 && (
              <span className="ml-3">{test.inputParams.startWatt}W +{test.inputParams.stepSize}W / {test.inputParams.testDuration} min</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0" data-pdf-hide>
          <ReportDownloadButton test={serializedTest} athleteName={athleteName} />
          <Link
            href={`/dashboard/tests/${id}/edit`}
            className={cn(buttonVariants({ variant: "outline", size: "default" }), "gap-2")}
          >
            <Pencil className="h-3.5 w-3.5" />
            Redigera
          </Link>
          <DeleteTestButton testId={id} clientId={test.athleteId} />
        </div>
      </header>

      {/* Auto-beräknade tröskelvärden */}
      <div className="grid grid-cols-12 gap-5">

        {/* Hero card */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-5">
          <div className="rounded-3xl bg-[#007AFF] p-7 text-white shadow-xl shadow-[#007AFF]/20">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Resultat</span>

            <div className="mt-5 space-y-4">
              {r.atWatt != null && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/60">LT1 (AT) @ 2.0 mmol</p>
                  <p className="text-3xl font-black tracking-tighter">{r.atWatt} <span className="text-sm font-normal text-white/60">W</span></p>
                </div>
              )}
              {r.ltWatt != null && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/60">LT2 (MLSS) @ 4.0 mmol</p>
                  <p className="text-3xl font-black tracking-tighter">{r.ltWatt} <span className="text-sm font-normal text-white/60">W</span></p>
                </div>
              )}
              {r.vo2Max != null && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/60">VO₂ max</p>
                  <p className="text-3xl font-black tracking-tighter">{r.vo2Max} <span className="text-sm font-normal text-white/60">ml/kg/min</span></p>
                </div>
              )}
            </div>

            {(r.maxHR || r.maxLactate) && (
              <div className="mt-7 space-y-3 border-t border-white/20 pt-5">
                {r.maxHR != null && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60 italic">Max puls</span>
                    <span className="font-bold">{r.maxHR} bpm</span>
                  </div>
                )}
                {r.maxLactate != null && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60 italic">Max laktat</span>
                    <span className="font-bold">{r.maxLactate} mmol</span>
                  </div>
                )}
                {test.inputParams.startWatt > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60 italic">Protokoll</span>
                    <span className="font-bold">
                      {test.inputParams.startWatt}W +{test.inputParams.stepSize}W/{test.inputParams.testDuration}min
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {test.notes && (
            <div className="rounded-3xl border border-[hsl(var(--border))] bg-white p-6 shadow-sm">
              <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-[#86868B]">Anteckningar</p>
              <p className="text-sm leading-relaxed text-[#1D1D1F] italic whitespace-pre-wrap">{test.notes}</p>
            </div>
          )}
        </div>

        {/* Raw data table */}
        {test.rawData.length > 0 && (
          <div className="col-span-12 lg:col-span-9 overflow-hidden rounded-3xl border border-[hsl(var(--border))] bg-white shadow-sm">
            <div className="border-b border-[hsl(var(--border))] bg-[#F5F5F7]/50 px-7 py-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#86868B]">Rådata per steg</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] font-black uppercase tracking-[0.1em] text-[#86868B] border-b border-[hsl(var(--border))]">
                    <th className="px-5 py-3 text-left">Min</th>
                    <th className="px-5 py-3 text-right">Watt</th>
                    <th className="px-5 py-3 text-right">Puls</th>
                    <th className="px-5 py-3 text-right">Laktat</th>
                    <th className="px-5 py-3 text-right">Borg</th>
                    <th className="px-5 py-3 text-right">Kadans</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[hsl(var(--border))]/30">
                  {test.rawData.map((p, i) => (
                    <tr key={i} className="hover:bg-[#F5F5F7]/50 transition-colors">
                      <td className="px-5 py-3 text-[#86868B]">{p.min}</td>
                      <td className="px-5 py-3 text-right font-mono font-semibold text-[#1D1D1F]">{p.watt || "—"}</td>
                      <td className="px-5 py-3 text-right font-mono text-[#86868B]">{p.hr || "—"}</td>
                      <td className={`px-5 py-3 text-right font-mono font-bold ${p.lac >= 4 ? "text-[hsl(var(--destructive))]" : p.lac >= 2 ? "text-[hsl(var(--warning))]" : "text-[#86868B]"}`}>
                        {p.lac || "—"}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-[#86868B]">{p.borg || "—"}</td>
                      <td className="px-5 py-3 text-right font-mono text-[#86868B]">{p.cadence || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Chart */}
      {chartStages.length > 1 && (
        <div className="rounded-3xl border border-[hsl(var(--border))] bg-white p-7 shadow-sm">
          <p className="mb-5 text-[10px] font-black uppercase tracking-widest text-[#86868B]">Prestandagraf</p>
          <LactateChart
            stages={chartStages}
            lt1Watts={r.atWatt}
            lt2Watts={r.ltWatt}
            maxHr={r.maxHR}
            testType={test.testType}
            height={420}
          />
        </div>
      )}

    </div>
  )
}
