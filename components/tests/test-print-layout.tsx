"use client"

import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, LabelList,
} from "recharts"
import { WingatePowerChart } from "./wingate-power-chart"
import { Vo2MaxResultsPanel } from "./vo2max-results-panel"
import { WingateResultsPanel } from "./wingate-results-panel"
import type { SerializedTest } from "./report-download-button"
import type { RawDataPoint } from "@/types"

interface TestPrintLayoutProps {
  test: SerializedTest
  athleteName: string
  gender?: "M" | "K" | ""
}

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

const PRINT_STYLES = `
  [data-print-root] .hidden.lg\\:block { display: block !important; }
  [data-print-root] .lg\\:hidden       { display: none  !important; }
`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function WattDotPrint(props: any) {
  const { cx, cy, payload, stepMins } = props
  if (!stepMins?.has(payload.min) || payload.watt == null) return null
  return (
    <g>
      <circle cx={cx} cy={cy} r={2.5} fill="#C7C7CC" />
      <text x={cx + 5} y={cy - 14} fontSize={13} fill="#86868B" fontWeight="700" fontFamily="sans-serif">
        {payload.watt}W
      </text>
    </g>
  )
}

// Fixed-width chart for printing — avoids ResizeObserver issues in off-screen containers
function PrintTestChart({ rows, dur, height = 480 }: { rows: RawDataPoint[]; dur: number; height?: number }) {
  function lacEnabled(row: RawDataPoint) {
    return row.min === 0 || (row.min > 0 && row.min % dur === 0)
  }

  const data = rows.map((r) => ({
    min: r.min,
    watt: r.watt > 0 ? r.watt : null,
    hr: r.hr > 0 ? r.hr : null,
    lac: lacEnabled(r) && r.lac > 0 ? r.lac : null,
    borg: lacEnabled(r) && r.borg > 0 ? r.borg : null,
    cadence: lacEnabled(r) && r.cadence > 0 ? r.cadence : null,
  }))

  const hasHr = data.some((d) => d.hr != null)
  const hasLac = data.some((d) => d.lac != null)
  const hasBorg = data.some((d) => d.borg != null)
  const hasCadence = data.some((d) => d.cadence != null)

  if (!hasHr && !hasLac) {
    return (
      <div className="flex items-center justify-center h-40 text-[#D1D1D6] text-sm">
        Fyll i puls och laktatvärden för att se kurvan
      </div>
    )
  }

  const stepMins = new Set(
    rows.reduce<number[]>((acc, r, i) => {
      if (r.watt > 0 && (i === 0 || r.watt !== rows[i - 1].watt)) acc.push(r.min)
      return acc
    }, [])
  )

  const rightMargin = hasLac && hasBorg ? 100 : hasLac ? 56 : hasBorg ? 52 : 16

  return (
    // Fixed pixel width bypasses ResizeObserver — safe for off-screen rendering
    <ResponsiveContainer width={754} height={height}>
      <ComposedChart data={data} margin={{ top: 28, right: rightMargin, left: 0, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="min"
          type="number"
          domain={[0, "dataMax"]}
          tickCount={Math.min(data.length, 20)}
          label={{ value: "Minut", position: "insideBottom", offset: -12, fontSize: 14 }}
          tick={{ fontSize: 13 }}
          height={48}
        />
        <YAxis
          yAxisId="left"
          orientation="left"
          label={{ value: "Puls / Watt", angle: -90, position: "insideLeft", offset: 16, fontSize: 13 }}
          tick={{ fontSize: 13 }}
          width={56}
        />
        {hasLac && (
          <YAxis
            yAxisId="lac"
            orientation="right"
            domain={[0, "dataMax + 1"]}
            label={{ value: "Laktat (mmol)", angle: 90, position: "insideRight", offset: 16, fontSize: 13 }}
            tick={{ fontSize: 13 }}
            width={52}
          />
        )}
        {hasBorg && (
          <YAxis
            yAxisId="borg"
            orientation="right"
            domain={[6, 20]}
            ticks={[6, 9, 11, 13, 15, 17, 19]}
            label={{ value: "Borg", angle: 90, position: "insideRight", offset: 16, fontSize: 13 }}
            tick={{ fontSize: 13 }}
            width={44}
          />
        )}
        <Tooltip
          contentStyle={{ fontSize: 13 }}
          formatter={(value: number, name: string) => {
            if (name === "Puls") return [`${value} bpm`, "Puls"]
            if (name === "Laktat") return [`${value} mmol/L`, "Laktat"]
            if (name === "Watt") return [`${value} W`, "Watt"]
            if (name === "Kadans") return [`${value} rpm`, "Kadans"]
            if (name === "Borg") return [`${value} (Borg)`, "Borg"]
            return [value, name]
          }}
          labelFormatter={(v) => `Minut ${v}`}
        />
        <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 13, paddingTop: 16 }} />

        <Line
          yAxisId="left"
          type="stepAfter"
          dataKey="watt"
          name="Watt"
          stroke="#C7C7CC"
          strokeWidth={2}
          dot={({ key, ...props }) => <WattDotPrint key={key} {...props} stepMins={stepMins} />}
          activeDot={false}
          connectNulls
          isAnimationActive={false}
        />

        {hasHr && (
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="hr"
            name="Puls"
            stroke="#f43f5e"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "#f43f5e", strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            connectNulls
            isAnimationActive={false}
          >
            <LabelList dataKey="hr" position="top" offset={6} style={{ fontSize: 13, fill: "#f43f5e", fontWeight: 700 }} />
          </Line>
        )}

        {hasLac && (
          <Line
            yAxisId="lac"
            type="monotone"
            dataKey="lac"
            name="Laktat"
            stroke="#3b82f6"
            strokeWidth={2.5}
            dot={{ r: 5, fill: "#3b82f6", strokeWidth: 0 }}
            activeDot={{ r: 7 }}
            connectNulls
            isAnimationActive={false}
          >
            <LabelList dataKey="lac" position="top" offset={8} style={{ fontSize: 13, fill: "#3b82f6", fontWeight: 700 }} />
          </Line>
        )}

        {hasCadence && (
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="cadence"
            name="Kadans"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={{ r: 4, fill: "#8b5cf6", strokeWidth: 0 }}
            activeDot={{ r: 6 }}
            connectNulls
            isAnimationActive={false}
          >
            <LabelList dataKey="cadence" position="bottom" offset={7} style={{ fontSize: 13, fill: "#8b5cf6", fontWeight: 700 }} />
          </Line>
        )}

        {hasBorg && (
          <Line
            yAxisId="borg"
            type="monotone"
            dataKey="borg"
            name="Borg"
            stroke="#f59e0b"
            strokeWidth={2}
            strokeDasharray="4 2"
            dot={{ r: 4, fill: "#f59e0b", strokeWidth: 0 }}
            activeDot={{ r: 6 }}
            connectNulls
            isAnimationActive={false}
          >
            <LabelList dataKey="borg" position="top" offset={7} style={{ fontSize: 13, fill: "#f59e0b", fontWeight: 700 }} />
          </Line>
        )}
      </ComposedChart>
    </ResponsiveContainer>
  )
}

export function TestPrintLayout({ test, athleteName, gender = "" }: TestPrintLayoutProps) {
  const testDateStr = new Date(test.testDate.seconds * 1000).toLocaleDateString("sv-SE")
  const testDuration = test.inputParams.testDuration || 3

  function isLacRow(min: number) {
    return min === 0 || (min > 0 && min % testDuration === 0)
  }

  const isWingate = test.testType === "wingate"
  const wingateData = (test as any).wingateData
  const wingateInputParams = (test as any).wingateInputParams

  const fi = wingateData && wingateData.peakPower > 0
    ? ((wingateData.peakPower - wingateData.minPower) / wingateData.peakPower) * 100
    : null
  const fiLabel = fi == null ? "" : fi < 40 ? "Låg trötthet" : fi < 55 ? "Normal trötthet" : "Hög trötthet"
  const fiColor = fi == null ? "" : fi < 40 ? "#34C759" : fi < 55 ? "#FF9500" : "#FF3B30"
  const brakeKg = wingateInputParams?.bodyWeight && wingateInputParams?.bodyWeightPercent
    ? ((wingateInputParams.bodyWeightPercent / 100) * wingateInputParams.bodyWeight).toFixed(1)
    : null

  return (
    <>
      {/* Inject styles that force chart visible regardless of viewport width */}
      {/* eslint-disable-next-line react/no-danger */}
      <style dangerouslySetInnerHTML={{ __html: PRINT_STYLES }} />

      <div
        data-print-root
        className="bg-[#F5F5F7] p-6 space-y-5"
        style={{ width: "794px" }}
      >
        {/* Header */}
        <header className="space-y-0.5">
          <h1 className="text-2xl font-bold tracking-tight text-[#1D1D1F]">
            {testTypeLabel(test.testType)}
            <span className="ml-2 text-lg font-normal text-[#1D1D1F]/60">
              — {sportLabel(test.sport)} — {athleteName}
            </span>
          </h1>
          <p className="text-base text-[#1D1D1F]">
            {testDateStr}
            {!isWingate && (test.inputParams.startWatt ?? 0) > 0 && (
              <>
                <span className="ml-3 text-[#86868B]">·</span>
                <span className="ml-3">
                  {test.inputParams.startWatt}W +{test.inputParams.stepSize}W / {test.inputParams.testDuration} min
                </span>
              </>
            )}
            {isWingate && wingateInputParams?.startCadenceRpm && (
              <>
                <span className="ml-3 text-[#86868B]">·</span>
                <span className="ml-3">Startkadens {wingateInputParams.startCadenceRpm} rpm</span>
              </>
            )}
          </p>
        </header>

        {/* VO2max results */}
        {test.testType === "vo2max" && (
          <Vo2MaxResultsPanel test={test as any} gender={gender} />
        )}

        {/* Wingate results */}
        {isWingate && (
          <WingateResultsPanel test={test as any} />
        )}

        {/* Coach assessment — threshold tests */}
        {test.testType !== "vo2max" && !isWingate && (
          <div className="rounded-2xl bg-[#007AFF] p-6 text-white shadow-xl shadow-[#007AFF]/20">
            <span className="text-sm font-black uppercase tracking-[0.15em] text-white">Coachbedömning</span>

            <div className="mt-4 grid grid-cols-2 gap-x-6">
              <div>
                <p className="text-sm font-black uppercase tracking-wider text-white mb-3">Bedömning Effekt</p>
                <div className="space-y-3">
                  {(test as any).coachAssessment?.atEffektWatt != null && (
                    <div>
                      <p className="text-sm uppercase tracking-wider text-white/80">Effekt AT</p>
                      <p className="text-2xl font-black tracking-tighter">
                        {(test as any).coachAssessment.atEffektWatt}{" "}
                        <span className="text-sm font-normal text-white">W</span>
                      </p>
                    </div>
                  )}
                  {(test as any).coachAssessment?.ltEffektWatt != null && (
                    <div>
                      <p className="text-sm uppercase tracking-wider text-white/80">Effekt LT</p>
                      <p className="text-2xl font-black tracking-tighter">
                        {(test as any).coachAssessment.ltEffektWatt}{" "}
                        <span className="text-sm font-normal text-white">W</span>
                      </p>
                    </div>
                  )}
                  {(test as any).coachAssessment?.granLagMedel != null && (
                    <div>
                      <p className="text-sm uppercase tracking-wider text-white/80">Gräns Låg/Medel</p>
                      <p className="text-2xl font-black tracking-tighter">
                        {(test as any).coachAssessment.granLagMedel}{" "}
                        <span className="text-sm font-normal text-white">W</span>
                      </p>
                    </div>
                  )}
                  {(test as any).coachAssessment?.nedreGrans != null && (
                    <div>
                      <p className="text-sm uppercase tracking-wider text-white/80">Nedre Gräns</p>
                      <p className="text-2xl font-black tracking-tighter">
                        {(test as any).coachAssessment.nedreGrans}{" "}
                        <span className="text-sm font-normal text-white">W</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm font-black uppercase tracking-wider text-white mb-3">Tröskelpuls</p>
                <div className="space-y-3">
                  {(test as any).coachAssessment?.atPuls != null && (
                    <div>
                      <p className="text-sm uppercase tracking-wider text-white/80">AT Puls</p>
                      <p className="text-2xl font-black tracking-tighter">
                        {(test as any).coachAssessment.atPuls}{" "}
                        <span className="text-sm font-normal text-white">bpm</span>
                      </p>
                    </div>
                  )}
                  {(test as any).coachAssessment?.ltPuls != null && (
                    <div>
                      <p className="text-sm uppercase tracking-wider text-white/80">LT Puls</p>
                      <p className="text-2xl font-black tracking-tighter">
                        {(test as any).coachAssessment.ltPuls}{" "}
                        <span className="text-sm font-normal text-white">bpm</span>
                      </p>
                    </div>
                  )}
                  {(test as any).coachAssessment?.granLagMedelPuls != null && (
                    <div>
                      <p className="text-sm uppercase tracking-wider text-white/80">Gräns Låg/Medel</p>
                      <p className="text-2xl font-black tracking-tighter">
                        {(test as any).coachAssessment.granLagMedelPuls}{" "}
                        <span className="text-sm font-normal text-white">bpm</span>
                      </p>
                    </div>
                  )}
                  {(test as any).coachAssessment?.nedreGransPuls != null && (
                    <div>
                      <p className="text-sm uppercase tracking-wider text-white/80">Nedre Gräns</p>
                      <p className="text-2xl font-black tracking-tighter">
                        {(test as any).coachAssessment.nedreGransPuls}{" "}
                        <span className="text-sm font-normal text-white">bpm</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {((test as any).coachAssessment?.estMaxPuls != null ||
              (test as any).coachAssessment?.hogstaUpnaddPuls != null) && (
              <div className="mt-4 border-t border-white/30 pt-4">
                <p className="text-sm font-black uppercase tracking-wider text-white text-center mb-3">
                  Bedömning Puls
                </p>
                <div className="flex justify-center gap-8">
                  {(test as any).coachAssessment?.estMaxPuls != null && (
                    <div className="text-center">
                      <p className="text-sm uppercase tracking-wider text-white/80">Est. Maxpuls</p>
                      <p className="text-2xl font-black tracking-tighter">
                        {(test as any).coachAssessment.estMaxPuls}{" "}
                        <span className="text-sm font-normal text-white">bpm</span>
                      </p>
                    </div>
                  )}
                  {(test as any).coachAssessment?.hogstaUpnaddPuls != null && (
                    <div className="text-center">
                      <p className="text-sm uppercase tracking-wider text-white/80">Högsta uppnådda</p>
                      <p className="text-2xl font-black tracking-tighter">
                        {(test as any).coachAssessment.hogstaUpnaddPuls}{" "}
                        <span className="text-sm font-normal text-white">bpm</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Wingate power chart + interpretation */}
        {isWingate && wingateData && (
          <>
            <div className="rounded-2xl border border-[hsl(var(--border))]/60 bg-white p-5 shadow-sm">
              <p className="text-sm font-black uppercase tracking-widest text-[#1D1D1F] mb-4">Effektkurva</p>
              <WingatePowerChart wingateData={wingateData} bodyWeight={wingateInputParams?.bodyWeight} />
            </div>

            <div className="rounded-2xl border border-[hsl(var(--border))]/60 bg-white p-5 shadow-sm space-y-4">
              <p className="text-sm font-black uppercase tracking-widest text-[#1D1D1F]">Tolkning</p>
              {fi != null && (
                <div className="flex items-baseline justify-between">
                  <span className="text-[#515154]">Fatigue Index</span>
                  <span className="text-xl font-black tabular-nums" style={{ color: fiColor }}>
                    {fi.toFixed(1)} %{" "}
                    <span className="text-sm font-semibold" style={{ color: fiColor }}>— {fiLabel}</span>
                  </span>
                </div>
              )}
              <p className="text-sm text-[#515154] leading-relaxed">
                Fatigue Index visar hur mycket effekten sjunker under testet — lägre värde betyder att atleten
                håller sin toppeffekt längre utan att tröttna.
              </p>
              {brakeKg && (
                <div className="flex items-baseline justify-between border-t border-[hsl(var(--border))]/60 pt-3">
                  <span className="text-[#515154]">Bromsbelastning</span>
                  <span className="font-semibold text-[#1D1D1F]">{brakeKg} kg</span>
                </div>
              )}
            </div>
          </>
        )}

        {/* Performance chart — threshold + VO2 tests */}
        {!isWingate && test.rawData.length > 0 && (
          <div className="rounded-2xl border border-[hsl(var(--border))]/60 bg-white p-5 shadow-sm">
            <p className="text-sm font-black uppercase tracking-widest text-[#1D1D1F] mb-4">Prestandagraf</p>
            <PrintTestChart rows={test.rawData} dur={testDuration} height={480} />
          </div>
        )}

        {/* Bike settings */}
        {(test as any).settings?.bike && (
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-white p-5 shadow-sm">
            <p className="mb-3 text-sm font-black uppercase tracking-widest text-[#1D1D1F]">Cykelinställningar</p>
            <dl className="space-y-2 text-base">
              {(test as any).settings.bike.bikeType && (
                <div className="flex justify-between">
                  <dt className="text-[#1D1D1F]">Cykeltyp</dt>
                  <dd className="font-semibold">{(test as any).settings.bike.bikeType}</dd>
                </div>
              )}
              {(test as any).settings.bike.pedalType && (
                <div className="flex justify-between">
                  <dt className="text-[#1D1D1F]">Pedaltyp</dt>
                  <dd className="font-semibold">{(test as any).settings.bike.pedalType}</dd>
                </div>
              )}
              {(test as any).settings.bike.saddleVerticalMm != null && (
                <div className="flex justify-between">
                  <dt className="text-[#1D1D1F]">Sadel vertikal</dt>
                  <dd className="font-semibold">{(test as any).settings.bike.saddleVerticalMm} mm</dd>
                </div>
              )}
              {(test as any).settings.bike.saddleHorizontalMm != null && (
                <div className="flex justify-between">
                  <dt className="text-[#1D1D1F]">Sadel horisontell</dt>
                  <dd className="font-semibold">{(test as any).settings.bike.saddleHorizontalMm} mm</dd>
                </div>
              )}
              {(test as any).settings.bike.handlebarVerticalMm != null && (
                <div className="flex justify-between">
                  <dt className="text-[#1D1D1F]">Styre vertikal</dt>
                  <dd className="font-semibold">{(test as any).settings.bike.handlebarVerticalMm} mm</dd>
                </div>
              )}
              {(test as any).settings.bike.handlebarHorizontalMm != null && (
                <div className="flex justify-between">
                  <dt className="text-[#1D1D1F]">Styre horisontell</dt>
                  <dd className="font-semibold">{(test as any).settings.bike.handlebarHorizontalMm} mm</dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {/* Minute data table — no scroll limit (all rows visible) */}
        {!isWingate && test.rawData.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-[hsl(var(--border))]/60 bg-white shadow-sm">
            <div className="border-b border-[hsl(var(--border))]/60 bg-[#F5F5F7]/50 px-5 py-3">
              <p className="text-sm font-black uppercase tracking-widest text-[#1D1D1F]">Minutdata</p>
            </div>
            <table className="w-full text-sm table-fixed">
              <thead>
                <tr className="text-xs font-black uppercase tracking-wider text-[#1D1D1F] border-b border-[hsl(var(--border))]/60">
                  <th className="px-3 py-1.5 text-left">Min</th>
                  <th className="px-3 py-1.5 text-right">W</th>
                  <th className="px-3 py-1.5 text-right">Puls</th>
                  <th className="px-3 py-1.5 text-right">Laktat</th>
                  <th className="px-3 py-1.5 text-right">Borg</th>
                  <th className="px-3 py-1.5 text-right">Kad.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]/30">
                {test.rawData.map((p, i) => (
                  <tr
                    key={i}
                    className={isLacRow(p.min) && p.lac > 0 ? "bg-[#007AFF]/[0.04]" : ""}
                  >
                    <td className="px-3 py-1.5 text-[#1D1D1F] tabular-nums">{p.min}</td>
                    <td className="px-3 py-1.5 text-right font-mono font-bold text-[#1D1D1F]">{p.watt || "—"}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-[#1D1D1F]">{p.hr || "—"}</td>
                    <td className={`px-3 py-1.5 text-right font-mono font-bold ${
                      p.lac >= 4 ? "text-[hsl(var(--destructive))]" : p.lac >= 2 ? "text-[hsl(var(--warning))]" : "text-[#1D1D1F]"
                    }`}>
                      {p.lac || "—"}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-[#1D1D1F]">{p.borg || "—"}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-[#1D1D1F]">{p.cadence || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Notes */}
        {test.notes && (
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-white p-5 shadow-sm">
            <p className="mb-2 text-sm font-black uppercase tracking-widest text-[#1D1D1F]">Anteckningar</p>
            <p className="text-base leading-relaxed text-[#1D1D1F] italic whitespace-pre-wrap break-all">
              {test.notes}
            </p>
          </div>
        )}
      </div>
    </>
  )
}
