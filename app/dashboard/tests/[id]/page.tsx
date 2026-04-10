import Link from "next/link"
import { notFound } from "next/navigation"
import { getTest } from "@/lib/tests"
import { getAthlete } from "@/lib/athletes"
import { fullName, cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { LiveTestChart } from "@/components/tests/live-test-chart"
import { DeleteTestButton } from "@/components/tests/delete-test-button"
import { ReportDownloadButton } from "@/components/tests/report-download-button"
import { Vo2MaxResultsPanel } from "@/components/tests/vo2max-results-panel"
import { WingateResultsPanel } from "@/components/tests/wingate-results-panel"
import { WingatePowerChart } from "@/components/tests/wingate-power-chart"
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

  const testDateStr = new Date(test.testDate.seconds * 1000).toLocaleDateString("sv-SE")

  // Serialize Firestore Timestamps to plain objects before passing to client component
  const serializedTest = {
    ...test,
    testDate: { seconds: test.testDate.seconds, nanoseconds: test.testDate.nanoseconds },
    createdAt: { seconds: test.createdAt.seconds, nanoseconds: test.createdAt.nanoseconds },
  }

  const testDuration = test.inputParams.testDuration || 3
  function isLacRow(min: number) {
    return min === 0 || (min > 0 && min % testDuration === 0)
  }

  return (
    <div id="test-detail-content" className="space-y-6">

      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-0.5">
          <nav className="flex items-center gap-1.5 text-sm font-semibold text-secondary" data-pdf-hide>
            <Link href="/dashboard/athletes" className="hover:text-[#007AFF] transition-colors">Atleter</Link>
            <span>/</span>
            <Link href={`/dashboard/athletes/${test.athleteId}`} className="hover:text-[#007AFF] transition-colors text-primary">
              {athleteName}
            </Link>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-primary">
            {testTypeLabel(test.testType)}
            <span className="ml-2 text-lg font-normal text-primary/60">— {sportLabel(test.sport)} — {athleteName}</span>
          </h1>
          <p className="text-base text-primary">
            {testDateStr}
            {test.testType !== "wingate" && (test.inputParams.startWatt ?? 0) > 0 && (
              <span className="ml-3 text-[#86868B]">·</span>
            )}
            {test.testType !== "wingate" && (test.inputParams.startWatt ?? 0) > 0 && (
              <span className="ml-3">{test.inputParams.startWatt}W +{test.inputParams.stepSize}W / {test.inputParams.testDuration} min</span>
            )}
            {test.testType === "wingate" && (test as any).wingateInputParams?.startCadenceRpm && (
              <>
                <span className="ml-3 text-[#86868B]">·</span>
                <span className="ml-3">Startkadens {(test as any).wingateInputParams.startCadenceRpm} rpm</span>
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0" data-pdf-hide>
          <ReportDownloadButton test={serializedTest} athleteName={athleteName} gender={athlete?.gender ?? ""} />
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

      {/* 70/30 main grid — right col first in DOM for correct mobile order */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">

        {/* Right column — 30% (DOM first → mobile first) */}
        <div className="lg:col-span-4 lg:order-2 space-y-5">

          {/* VO2max results panel */}
          {test.testType === "vo2max" && (
            <Vo2MaxResultsPanel test={serializedTest as any} gender={athlete?.gender ?? ""} />
          )}

          {/* Wingate results panel */}
          {test.testType === "wingate" && (
            <WingateResultsPanel test={serializedTest as any} />
          )}

          {/* Coach assessment — threshold tests only */}
          {test.testType !== "vo2max" && test.testType !== "wingate" && <div className="rounded-2xl bg-[#007AFF] p-6 text-white shadow-xl shadow-[#007AFF]/20">
            <span className="text-sm font-black uppercase tracking-[0.15em] text-white">Coachbedömning</span>

            {/* Two-column: Effekt (left) / Tröskelpuls (right) */}
            <div className="mt-4 grid grid-cols-2 gap-x-6">
              <div>
                <p className="text-sm font-black uppercase tracking-wider text-white mb-3">Bedömning Effekt</p>
                <div className="space-y-3">
                  {test.coachAssessment?.atEffektWatt != null && (
                    <div>
                      <p className="text-sm uppercase tracking-wider text-white/80">Effekt AT</p>
                      <p className="text-2xl font-black tracking-tighter">{test.coachAssessment.atEffektWatt} <span className="text-sm font-normal text-white">W</span></p>
                    </div>
                  )}
                  {test.coachAssessment?.ltEffektWatt != null && (
                    <div>
                      <p className="text-sm uppercase tracking-wider text-white/80">Effekt LT</p>
                      <p className="text-2xl font-black tracking-tighter">{test.coachAssessment.ltEffektWatt} <span className="text-sm font-normal text-white">W</span></p>
                    </div>
                  )}
                  {test.coachAssessment?.granLagMedel != null && (
                    <div>
                      <p className="text-sm uppercase tracking-wider text-white/80">Gräns Låg/Medel</p>
                      <p className="text-2xl font-black tracking-tighter">{test.coachAssessment.granLagMedel} <span className="text-sm font-normal text-white">W</span></p>
                    </div>
                  )}
                  {test.coachAssessment?.nedreGrans != null && (
                    <div>
                      <p className="text-sm uppercase tracking-wider text-white/80">Nedre Gräns</p>
                      <p className="text-2xl font-black tracking-tighter">{test.coachAssessment.nedreGrans} <span className="text-sm font-normal text-white">W</span></p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm font-black uppercase tracking-wider text-white mb-3">Tröskelpuls</p>
                <div className="space-y-3">
                  {test.coachAssessment?.atPuls != null && (
                    <div>
                      <p className="text-sm uppercase tracking-wider text-white/80">AT Puls</p>
                      <p className="text-2xl font-black tracking-tighter">{test.coachAssessment.atPuls} <span className="text-sm font-normal text-white">bpm</span></p>
                    </div>
                  )}
                  {test.coachAssessment?.ltPuls != null && (
                    <div>
                      <p className="text-sm uppercase tracking-wider text-white/80">LT Puls</p>
                      <p className="text-2xl font-black tracking-tighter">{test.coachAssessment.ltPuls} <span className="text-sm font-normal text-white">bpm</span></p>
                    </div>
                  )}
                  {test.coachAssessment?.granLagMedelPuls != null && (
                    <div>
                      <p className="text-sm uppercase tracking-wider text-white/80">Gräns Låg/Medel</p>
                      <p className="text-2xl font-black tracking-tighter">{test.coachAssessment.granLagMedelPuls} <span className="text-sm font-normal text-white">bpm</span></p>
                    </div>
                  )}
                  {test.coachAssessment?.nedreGransPuls != null && (
                    <div>
                      <p className="text-sm uppercase tracking-wider text-white/80">Nedre Gräns</p>
                      <p className="text-2xl font-black tracking-tighter">{test.coachAssessment.nedreGransPuls} <span className="text-sm font-normal text-white">bpm</span></p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom: Est. maxpuls + Högsta uppnådda */}
            {(test.coachAssessment?.estMaxPuls != null || test.coachAssessment?.hogstaUpnaddPuls != null) && (
              <div className="mt-4 border-t border-white/30 pt-4">
                <p className="text-sm font-black uppercase tracking-wider text-white text-center mb-3">Bedömning Puls</p>
                <div className="flex justify-center gap-8">
                  {test.coachAssessment?.estMaxPuls != null && (
                    <div className="text-center">
                      <p className="text-sm uppercase tracking-wider text-white/80">Est. Maxpuls</p>
                      <p className="text-2xl font-black tracking-tighter">{test.coachAssessment.estMaxPuls} <span className="text-sm font-normal text-white">bpm</span></p>
                    </div>
                  )}
                  {test.coachAssessment?.hogstaUpnaddPuls != null && (
                    <div className="text-center">
                      <p className="text-sm uppercase tracking-wider text-white/80">Högsta uppnådda</p>
                      <p className="text-2xl font-black tracking-tighter">{test.coachAssessment.hogstaUpnaddPuls} <span className="text-sm font-normal text-white">bpm</span></p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>}

          {/* Bike settings */}
          {test.settings?.bike && (
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-white p-5 shadow-apple">
              <p className="mb-3 text-sm font-black uppercase tracking-widest text-primary">Cykelinställningar</p>
              <dl className="space-y-2 text-base">
                {test.settings.bike.bikeType && <div className="flex justify-between"><dt className="text-primary">Cykeltyp</dt><dd className="font-semibold">{test.settings.bike.bikeType}</dd></div>}
                {test.settings.bike.pedalType && <div className="flex justify-between"><dt className="text-primary">Pedaltyp</dt><dd className="font-semibold">{test.settings.bike.pedalType}</dd></div>}
                {test.settings.bike.saddleVerticalMm != null && <div className="flex justify-between"><dt className="text-primary">Sadel vertikal</dt><dd className="font-semibold">{test.settings.bike.saddleVerticalMm} mm</dd></div>}
                {test.settings.bike.saddleHorizontalMm != null && <div className="flex justify-between"><dt className="text-primary">Sadel horisontell</dt><dd className="font-semibold">{test.settings.bike.saddleHorizontalMm} mm</dd></div>}
                {test.settings.bike.handlebarVerticalMm != null && <div className="flex justify-between"><dt className="text-primary">Styre vertikal</dt><dd className="font-semibold">{test.settings.bike.handlebarVerticalMm} mm</dd></div>}
                {test.settings.bike.handlebarHorizontalMm != null && <div className="flex justify-between"><dt className="text-primary">Styre horisontell</dt><dd className="font-semibold">{test.settings.bike.handlebarHorizontalMm} mm</dd></div>}
              </dl>
            </div>
          )}

          {/* Notes */}
          {test.notes && (
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-white p-5 shadow-apple overflow-hidden">
              <p className="mb-2 text-sm font-black uppercase tracking-widest text-primary">Anteckningar</p>
              <p className="text-base leading-relaxed text-primary italic whitespace-pre-wrap break-all">{test.notes}</p>
            </div>
          )}
        </div>

        {/* Left column — 70% (DOM second → mobile last) */}
        <div className="lg:col-span-8 lg:order-1 space-y-6">

          {/* Wingate left column */}
          {test.testType === "wingate" && test.wingateData && (() => {
            const wd = test.wingateData!
            const wp = test.wingateInputParams
            const fi = ((wd.peakPower - wd.minPower) / wd.peakPower) * 100
            const fiLabel = fi < 40 ? "Låg trötthet" : fi < 55 ? "Normal trötthet" : "Hög trötthet"
            const fiColor = fi < 40 ? "text-[#34C759]" : fi < 55 ? "text-[#FF9500]" : "text-[hsl(var(--destructive))]"
            const brakeKg = wp?.bodyWeight && wp?.bodyWeightPercent
              ? ((wp.bodyWeightPercent / 100) * wp.bodyWeight).toFixed(1)
              : null

            return (
              <>
                {/* Power bar chart */}
                <div className="rounded-2xl border border-[hsl(var(--border))]/60 bg-white p-5 shadow-apple">
                  <p className="text-sm font-black uppercase tracking-widest text-primary mb-4">Effektkurva</p>
                  <WingatePowerChart wingateData={wd} bodyWeight={wp?.bodyWeight} />
                </div>

                {/* Interpretation card */}
                <div className="rounded-2xl border border-[hsl(var(--border))]/60 bg-white p-5 shadow-apple space-y-4">
                  <p className="text-sm font-black uppercase tracking-widest text-primary">Tolkning</p>

                  <div className="flex items-baseline justify-between">
                    <span className="text-secondary">Fatigue Index</span>
                    <span className={`text-xl font-black tabular-nums ${fiColor}`}>
                      {fi.toFixed(1)} % <span className={`text-sm font-semibold ${fiColor}`}>— {fiLabel}</span>
                    </span>
                  </div>

                  <p className="text-sm text-secondary leading-relaxed">
                    Fatigue Index visar hur mycket effekten sjunker under testet — lägre värde betyder att atleten
                    håller sin toppeffekt längre utan att tröttna.
                  </p>

                  {brakeKg && (
                    <div className="flex items-baseline justify-between border-t border-[hsl(var(--border))]/60 pt-3">
                      <span className="text-secondary">Bromsbelastning</span>
                      <span className="font-semibold text-primary">{brakeKg} kg</span>
                    </div>
                  )}
                </div>
              </>
            )
          })()}

          {/* Chart hero — hidden for Wingate (no rawData) */}
          {test.testType !== "wingate" && (
          <div className="rounded-2xl border border-[hsl(var(--border))]/60 bg-white p-5 shadow-apple">
            <p className="text-sm font-black uppercase tracking-widest text-primary mb-4">Prestandagraf</p>
            <LiveTestChart
              rows={test.rawData}
              dur={testDuration}
              height={480}
            />
          </div>
          )}

          {/* Minute data table */}
          {test.testType !== "wingate" && test.rawData.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-[hsl(var(--border))]/60 bg-white shadow-apple">
              <div className="border-b border-[hsl(var(--border))]/60 bg-[#F5F5F7]/50 px-5 py-3">
                <p className="text-sm font-black uppercase tracking-widest text-primary">Minutdata</p>
              </div>
              <div className="overflow-y-auto max-h-[480px]">
                <table className="w-full text-base table-fixed">
                  <thead>
                    <tr className="text-sm font-black uppercase tracking-wider text-primary border-b border-[hsl(var(--border))]/60">
                      <th className="px-4 py-3 text-left">Min</th>
                      <th className="px-4 py-3 text-right">W</th>
                      <th className="px-4 py-3 text-right">Puls</th>
                      <th className="px-4 py-3 text-right">Laktat</th>
                      <th className="px-4 py-3 text-right">Borg</th>
                      <th className="px-4 py-3 text-right">Kad.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[hsl(var(--border))]/30">
                    {test.rawData.map((p, i) => (
                      <tr key={i} className={`transition-colors ${isLacRow(p.min) && p.lac > 0 ? "bg-[#007AFF]/[0.04] hover:bg-[#007AFF]/[0.08]" : "hover:bg-[#F5F5F7]/50"}`}>
                        <td className="px-4 py-3 text-primary tabular-nums">{p.min}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-primary">{p.watt || "—"}</td>
                        <td className="px-4 py-3 text-right font-mono text-primary">{p.hr || "—"}</td>
                        <td className={`px-4 py-3 text-right font-mono font-bold ${p.lac >= 4 ? "text-[hsl(var(--destructive))]" : p.lac >= 2 ? "text-[hsl(var(--warning))]" : "text-primary"}`}>
                          {p.lac || "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-primary">{p.borg || "—"}</td>
                        <td className="px-4 py-3 text-right font-mono text-primary">{p.cadence || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
