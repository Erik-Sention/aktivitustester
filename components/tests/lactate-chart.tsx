"use client";

import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
} from "recharts";

interface Stage {
  stageNumber: number;
  loadWatts: number | null;
  loadSpeedKmh?: number | null;
  heartRate: number | null;
  lactateMmol: number | null;
  vo2MlKgMin: number | null;
  rpe?: number | null;
}

interface LactateChartProps {
  stages: Stage[];
  bodyWeightKg?: number | null;
  lt1Watts?: number | null;
  lt2Watts?: number | null;
  /** LT1 speed (km/h) for running mode reference line */
  lt1Speed?: number | null;
  /** LT2 speed (km/h) for running mode reference line */
  lt2Speed?: number | null;
  maxHr?: number | null;
  testType?: string;
  height?: number | string;
  vo2MaxX?: number | null;
}

const HR_ZONES = [
  { name: "Z1", minPct: 0.50, maxPct: 0.60, fill: "#94a3b8" },
  { name: "Z2", minPct: 0.60, maxPct: 0.70, fill: "#4ade80" },
  { name: "Z3", minPct: 0.70, maxPct: 0.80, fill: "#facc15" },
  { name: "Z4", minPct: 0.80, maxPct: 0.90, fill: "#fb923c" },
  { name: "Z5", minPct: 0.90, maxPct: 1.00, fill: "#f43f5e" },
];

export function LactateChart({ stages, bodyWeightKg, lt1Watts, lt2Watts, lt1Speed, lt2Speed, maxHr, testType, height = "100%", vo2MaxX }: LactateChartProps) {
  const isLactate = testType === "LACTATE_THRESHOLD";

  // Running mode: stages have loadSpeedKmh but no loadWatts; plot only step-end rows (where lactate was measured)
  const useSpeed = stages.some((s) => s.loadSpeedKmh != null) && stages.every((s) => s.loadWatts == null);

  const data = useSpeed
    ? stages
        .filter((s) => s.loadSpeedKmh != null && s.lactateMmol != null)
        .map((s) => ({
          x: s.loadSpeedKmh!,
          hr: s.heartRate ?? undefined,
          lactate: s.lactateMmol ?? undefined,
          vo2: s.vo2MlKgMin ?? undefined,
          rpe: s.rpe ?? undefined,
        }))
    : stages
        .filter((s) => s.loadWatts != null)
        .map((s) => {
          const wkg = bodyWeightKg ? Math.round((s.loadWatts! / bodyWeightKg) * 100) / 100 : s.loadWatts!;
          return {
            x: wkg,
            hr: s.heartRate ?? undefined,
            lactate: s.lactateMmol ?? undefined,
            vo2: s.vo2MlKgMin ?? undefined,
            rpe: s.rpe ?? undefined,
          };
        });

  if (data.length < 2) return null;

  const hasLactate = data.some((d) => d.lactate != null);
  const hasHr = data.some((d) => d.hr != null);
  const hasVo2 = !isLactate && data.some((d) => d.vo2 != null);
  const hasRpe = data.some((d) => d.rpe != null);

  const xLabel = useSpeed ? "Speed (km/h)" : (bodyWeightKg ? "Belastning (Watt/kg)" : "Belastning (Watt)");

  const lt1X = useSpeed
    ? (lt1Speed ?? null)
    : (lt1Watts != null ? (bodyWeightKg ? Math.round((lt1Watts / bodyWeightKg) * 100) / 100 : lt1Watts) : null);
  const lt2X = useSpeed
    ? (lt2Speed ?? null)
    : (lt2Watts != null ? (bodyWeightKg ? Math.round((lt2Watts / bodyWeightKg) * 100) / 100 : lt2Watts) : null);

  // Right margin: 48 for lactate axis, +44 more if RPE axis is also shown
  const rightMargin = (hasLactate || hasVo2) && hasRpe ? 92 : hasRpe ? 44 : 48;

  return (
    <div className="space-y-2">
      {hasHr && maxHr && (
        <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
          {HR_ZONES.map((z) => (
            <span key={z.name} className="flex items-center gap-1">
              <span className="inline-block h-2 w-4 rounded-sm" style={{ background: z.fill, opacity: 0.7 }} />
              {z.name} ({Math.round(z.minPct * 100)}–{Math.round(z.maxPct * 100)}%)
            </span>
          ))}
        </div>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 24, right: rightMargin, left: 0, bottom: 0 }}>
          {hasHr && maxHr &&
            HR_ZONES.map((zone) => (
              <ReferenceArea
                key={zone.name}
                yAxisId="hr"
                y1={zone.minPct * maxHr}
                y2={zone.maxPct * maxHr}
                fill={zone.fill}
                fillOpacity={0.12}
                stroke="none"
              />
            ))}

          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />

          <XAxis
            dataKey="x"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickCount={data.length}
            label={{ value: xLabel, position: "insideBottom", offset: -16, fontSize: 12 }}
            tick={{ fontSize: 11 }}
            height={56}
          />

          {hasHr && (
            <YAxis
              yAxisId="hr"
              orientation="left"
              label={{ value: "Puls", angle: -90, position: "insideLeft", offset: 14, fontSize: 12 }}
              tick={{ fontSize: 11 }}
              width={52}
            />
          )}

          {(hasLactate || hasVo2) && (
            <YAxis
              yAxisId="lac"
              orientation="right"
              label={{ value: "Laktat", angle: 90, position: "insideRight", offset: 14, fontSize: 12 }}
              tick={{ fontSize: 11 }}
              width={48}
            />
          )}

          {hasRpe && (
            <YAxis
              yAxisId="rpe"
              orientation="right"
              domain={[5, 21]}
              ticks={[6, 9, 11, 13, 15, 17, 19]}
              label={{ value: "RPE", angle: 90, position: "insideRight", offset: 14, fontSize: 12 }}
              tick={{ fontSize: 10 }}
              width={40}
            />
          )}

          <Tooltip
            contentStyle={{ fontSize: 12 }}
            formatter={(value: number, name: string) => {
              if (name === "Puls") return [`${value} bpm`, "Puls"];
              if (name === "Laktat") return [`${value} mmol/L`, "Laktat"];
              if (name === "VO2") return [`${value} ml/kg/min`, "VO2"];
              if (name === "RPE") return [`${value} (Borg)`, "RPE"];
              return [value, name];
            }}
            labelFormatter={(v) => useSpeed ? `${v} km/h` : `${v} ${bodyWeightKg ? "W/kg" : "W"}`}
          />
          <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 12, paddingTop: 20 }} />

          {hasHr && (
            <Line
              yAxisId="hr"
              type="monotone"
              dataKey="hr"
              name="Puls"
              stroke="#f43f5e"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "#f43f5e", strokeWidth: 0 }}
              activeDot={{ r: 6 }}
              connectNulls
            />
          )}

          {hasLactate && (
            <Line
              yAxisId="lac"
              type="monotone"
              dataKey="lactate"
              name="Laktat"
              stroke="#3b82f6"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "#3b82f6", strokeWidth: 0 }}
              activeDot={{ r: 6 }}
              connectNulls
            />
          )}

          {hasVo2 && (
            <Line
              yAxisId="lac"
              type="monotone"
              dataKey="vo2"
              name="VO2"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={{ r: 3, fill: "#8b5cf6", strokeWidth: 0 }}
              connectNulls
            />
          )}

          {hasRpe && (
            <Line
              yAxisId="rpe"
              type="monotone"
              dataKey="rpe"
              name="RPE"
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="5 3"
              dot={{ r: 4, fill: "#f59e0b", strokeWidth: 0 }}
              activeDot={{ r: 6 }}
              connectNulls
            />
          )}

          {lt1X != null && (
            <ReferenceLine
              yAxisId={hasHr ? "hr" : "lac"}
              x={lt1X}
              stroke="#22c55e"
              strokeDasharray="5 4"
              label={{ value: useSpeed ? `LT1 ${lt1X} km/h` : `LT1 ${lt1Watts}W`, fill: "#16a34a", fontSize: 11, position: "top" }}
            />
          )}

          {lt2X != null && (
            <ReferenceLine
              yAxisId={hasHr ? "hr" : "lac"}
              x={lt2X}
              stroke="#a855f7"
              strokeDasharray="5 4"
              label={{ value: useSpeed ? `LT2 ${lt2X} km/h` : `LT2 ${lt2Watts}W`, fill: "#9333ea", fontSize: 11, position: "top" }}
            />
          )}

          {vo2MaxX != null && (
            <ReferenceLine
              yAxisId={hasHr ? "hr" : "lac"}
              x={vo2MaxX}
              stroke="#8b5cf6"
              strokeWidth={2}
              label={{ value: "VO₂max", fill: "#6d28d9", fontSize: 11, position: "insideTopRight" }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
