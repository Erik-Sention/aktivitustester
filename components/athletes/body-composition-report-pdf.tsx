import { Document, Page, View, Text, Svg, Rect, Path, G, StyleSheet, Image } from "@react-pdf/renderer"
import type { BodyCompositionData } from "@/types"

// ─── Colour palette ───────────────────────────────────────────────────────────
const C = {
  blue:      "#0071BA",
  blueLight: "#b3d9f0",
  blueBg:    "#e8f4fb",
  white:     "#ffffff",
  slate50:   "#f8fafc",
  slate100:  "#f1f5f9",
  slate200:  "#e2e8f0",
  slate300:  "#cbd5e1",
  slate400:  "#94a3b8",
  slate500:  "#64748b",
  slate600:  "#475569",
  slate700:  "#334155",
  slate800:  "#1e293b",
  green:     "#16a34a",
  greenBg:   "#dcfce7",
  amber:     "#b45309",
  amberBg:   "#fef3c7",
  red:       "#dc2626",
  redBg:     "#fee2e2",
  sky:       "#0ea5e9",
  orange:    "#ea580c",
} as const

const PAD = 18
const CONTENT_W = 595 - 2 * PAD   // 559
const INNER = CONTENT_W - 2 * 14  // inner width inside a card with 14px padding

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page:     { fontFamily: "Helvetica", padding: PAD, backgroundColor: C.slate100 },
  header:   {
    backgroundColor: C.blue, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 11,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8,
  },
  hLogo:    { color: C.white, fontSize: 17, fontFamily: "Helvetica-Bold", letterSpacing: 2 },
  hSub:     { color: C.blueLight, fontSize: 6, marginTop: 2, letterSpacing: 0.5 },
  hName:    { color: C.white, fontSize: 11, fontFamily: "Helvetica-Bold" },
  hDate:    { color: C.blueLight, fontSize: 7, marginTop: 3, textAlign: "right" },
  card:     { backgroundColor: C.white, borderRadius: 8, padding: 14, marginBottom: 8 },
  row:      { flexDirection: "row", gap: 8 },
  tag:      { fontSize: 5.5, fontFamily: "Helvetica-Bold", letterSpacing: 1.8, color: C.slate400, marginBottom: 4, textTransform: "uppercase" },
  secTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: C.slate800, marginBottom: 8 },
  bigVal:   { fontSize: 44, fontFamily: "Helvetica-Bold", color: C.slate800, lineHeight: 1 },
  bigUnit:  { fontSize: 10, color: C.slate500, marginTop: 3 },
  smVal:    { fontSize: 24, fontFamily: "Helvetica-Bold", color: C.slate800, lineHeight: 1 },
  smUnit:   { fontSize: 8,  color: C.slate500, marginTop: 2 },
  sub:      { fontSize: 7,  color: C.slate500, marginTop: 3 },
  subBold:  { fontFamily: "Helvetica-Bold", color: C.slate700 },
  badge:    { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4, alignSelf: "flex-start" },
  badgeTx:  { fontSize: 8, fontFamily: "Helvetica-Bold" },
  para:     { fontSize: 8, color: C.slate700, lineHeight: 1.6, marginTop: 10 },
  recoBox:  { backgroundColor: C.blueBg, borderRadius: 8, padding: 14, marginBottom: 8 },
  recoVal:  { fontSize: 22, fontFamily: "Helvetica-Bold", color: C.blue, lineHeight: 1, textAlign: "center" },
  recoLbl:  { fontSize: 6.5, color: C.slate500, marginTop: 3, textAlign: "center" },
  recoDiv:  { width: 0.5, backgroundColor: C.slate300, marginHorizontal: 4 },
  divider:  { height: 0.5, backgroundColor: C.slate200, marginVertical: 8 },
})

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(v: number | null | undefined, dec = 1) { return v != null ? v.toFixed(dec) : "—" }

function badgeColors(cat: string | null): { bg: string; fg: string } {
  if (!cat) return { bg: C.slate100, fg: C.slate600 }
  const l = cat.toLowerCase()
  if (l.includes("hälsosam") || l.includes("atletisk")) return { bg: C.greenBg, fg: C.green }
  if (l.includes("acceptabelt")) return { bg: C.amberBg, fg: C.amber }
  if (l.includes("övervikt"))    return { bg: C.redBg,   fg: C.red }
  return { bg: C.blueBg, fg: C.blue }
}

// Rounded-rect path helper
function rr(x: number, y: number, w: number, h: number, r: number,
  tl = false, tr = false, br = false, bl = false) {
  const R = Math.min(r, w / 2, h / 2)
  return [
    `M ${x + (tl ? R : 0)} ${y}`,
    `L ${x + w - (tr ? R : 0)} ${y}`,
    tr ? `A ${R} ${R} 0 0 1 ${x + w} ${y + R}` : "",
    `L ${x + w} ${y + h - (br ? R : 0)}`,
    br ? `A ${R} ${R} 0 0 1 ${x + w - R} ${y + h}` : "",
    `L ${x + (bl ? R : 0)} ${y + h}`,
    bl ? `A ${R} ${R} 0 0 1 ${x} ${y + h - R}` : "",
    `L ${x} ${y + (tl ? R : 0)}`,
    tl ? `A ${R} ${R} 0 0 1 ${x + R} ${y}` : "",
    "Z",
  ].filter(Boolean).join(" ")
}

// ─── Generic zone bar ─────────────────────────────────────────────────────────
interface Zone { label: string; max: number; color: string }

function ZoneBar({ value, zones, maxVal, w }: {
  value: number | null; zones: Zone[]; maxVal: number; w: number
}) {
  const BH = 16; const MH = 8; const LH = 14; const R = 4
  const svgH = BH + MH + LH + 4
  let prev = 0
  const parts = zones.map(z => {
    const start = prev; prev = z.max
    const x = (start / maxVal) * w
    const zw = ((z.max - start) / maxVal) * w
    return { ...z, start, x, zw, isFirst: start === 0, isLast: z.max === maxVal }
  })
  const mx = value != null ? Math.min(Math.max(value, 0), maxVal) / maxVal * w : null
  return (
    <View>
      <Svg width={w} height={svgH}>
        {parts.map((z, i) => (
          <Path key={i} d={rr(z.x, 0, z.zw, BH, R, z.isFirst, z.isLast, z.isLast, z.isFirst)} fill={z.color} />
        ))}
        {parts.slice(0, -1).map((z, i) => (
          <Rect key={i} x={z.x + z.zw - 0.5} y={0} width={1} height={BH} fill={C.white} opacity={0.35} />
        ))}
        {mx != null && (
          <G>
            <Rect x={mx - 1} y={0} width={2} height={BH} fill={C.white} />
            <Path d={`M ${mx} ${BH + 2} L ${mx - 5} ${BH + MH + 1} L ${mx + 5} ${BH + MH + 1} Z`} fill={C.slate800} />
          </G>
        )}
      </Svg>
      <View style={{ flexDirection: "row" }}>
        {parts.map((z, i) => (
          <View key={i} style={{ width: ((z.max - z.start) / maxVal) * w, alignItems: "center" }}>
            <Text style={{ fontSize: 5.5, color: C.slate500 }}>{z.label}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

const FAT_ZONES: Zone[] = [
  { label: "Nödvändigt",  max: 5,  color: C.slate600 },
  { label: "Atletisk",   max: 13, color: C.sky       },
  { label: "Hälsosam",   max: 18, color: C.green     },
  { label: "Acceptabelt", max: 25, color: "#f59e0b"   },
  { label: "Överviktig", max: 35, color: C.orange    },
]

const BMI_ZONES: Zone[] = [
  { label: "Undervikt",   max: 18.5, color: C.sky     },
  { label: "Hälsosam",   max: 25,   color: C.green   },
  { label: "Övervikt",   max: 30,   color: "#f59e0b" },
  { label: "Fetma gr. 1", max: 35,   color: C.orange  },
  { label: "Fetma gr. 2", max: 40,   color: C.red     },
]

// ─── Composition segments — matches original Bodyview 4-way split ─────────────
function compSegs(data: BodyCompositionData) {
  if (!data.weight || !data.fatMassKg || !data.totalBodyWaterL) return []
  const excessFat   = Math.max(0, data.targetFatLossKg ?? 0)
  const healthyFat  = Math.max(0, data.fatMassKg - excessFat)
  const leanNoWater = Math.max(0, data.weight - data.fatMassKg - data.totalBodyWaterL)
  return [
    { label: "Beräknad mängd vatten",       kg: data.totalBodyWaterL, color: "#7dd3fc" },
    { label: "Fettfri vikt (exkl. vatten)", kg: leanNoWater,          color: "#60a5fa" },
    { label: "Hälsosamt fett",              kg: healthyFat,           color: "#4ade80" },
    { label: "Överskottsfett",              kg: excessFat,            color: "#fb923c" },
  ].filter(s => s.kg > 0.05)
}

// ─── Donut chart ──────────────────────────────────────────────────────────────
function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg - 90) * Math.PI / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function donutArc(cx: number, cy: number, outerR: number, innerR: number, start: number, end: number) {
  const s1 = polarToXY(cx, cy, outerR, start)
  const e1 = polarToXY(cx, cy, outerR, end)
  const s2 = polarToXY(cx, cy, innerR, end)
  const e2 = polarToXY(cx, cy, innerR, start)
  const large = (end - start > 180) ? 1 : 0
  return `M ${s1.x.toFixed(2)} ${s1.y.toFixed(2)} A ${outerR} ${outerR} 0 ${large} 1 ${e1.x.toFixed(2)} ${e1.y.toFixed(2)} L ${s2.x.toFixed(2)} ${s2.y.toFixed(2)} A ${innerR} ${innerR} 0 ${large} 0 ${e2.x.toFixed(2)} ${e2.y.toFixed(2)} Z`
}

function DonutChart({ data }: { data: BodyCompositionData }) {
  const segs = compSegs(data)
  if (!segs.length) return null
  const sumKg = segs.reduce((a, s) => a + s.kg, 0)
  const SIZE = 84; const cx = SIZE / 2; const cy = SIZE / 2
  const outerR = 40; const innerR = 24
  let angle = 0
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <Svg width={SIZE} height={SIZE}>
        {segs.map((seg, i) => {
          const sweep = (seg.kg / sumKg) * 360
          const startA = angle; const endA = angle + sweep - 0.3
          angle += sweep
          return <Path key={i} d={donutArc(cx, cy, outerR, innerR, startA, endA)} fill={seg.color} />
        })}
      </Svg>
      <View style={{ flex: 1, gap: 5 }}>
        {segs.map((seg, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Svg width={7} height={7}><Path d={rr(0, 0, 7, 7, 2, true, true, true, true)} fill={seg.color} /></Svg>
            <Text style={{ fontSize: 6.5, color: C.slate600 }}>
              {seg.label}{"  "}{seg.kg.toFixed(1)} kg{"  "}({Math.round((seg.kg / sumKg) * 100)}%)
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}

// ─── Risk gauges ──────────────────────────────────────────────────────────────
interface GaugeConfig { min: number; max: number; yellowAt: number; redAt: number }

const GAUGE_CONFIGS: Record<string, GaugeConfig> = {
  "Hjärtsjukdom": { min: 1, max: 5,  yellowAt: 2,  redAt: 2.5 },
  "Stroke":        { min: 1, max: 5,  yellowAt: 2,  redAt: 2.5 },
  "Diabetes":      { min: 1, max: 20, yellowAt: 8,  redAt: 10  },
}

function RiskGauge({ label, value, cfg }: { label: string; value: number; cfg: GaugeConfig }) {
  const h = 80; const barW = 10; const w = 52; const cx = w / 2
  const range    = cfg.max - cfg.min
  const greenH   = ((cfg.yellowAt - cfg.min)      / range) * h
  const amberH   = ((cfg.redAt   - cfg.yellowAt)  / range) * h
  const redH     = ((cfg.max     - cfg.redAt)      / range) * h
  const clamped  = Math.min(Math.max(value, cfg.min), cfg.max)
  const markerY  = h - ((clamped - cfg.min) / range) * h
  return (
    <View style={{ alignItems: "center", width: w }}>
      <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: C.slate800, marginBottom: 3 }}>
        {value.toFixed(1)}
      </Text>
      <Svg width={w} height={h}>
        {/* green — bottom */}
        <Rect x={cx - barW / 2} y={h - greenH}           width={barW} height={greenH} fill={C.green} />
        {/* amber — middle */}
        <Rect x={cx - barW / 2} y={h - greenH - amberH}  width={barW} height={amberH} fill="#f59e0b" />
        {/* red — top */}
        <Rect x={cx - barW / 2} y={0}                     width={barW} height={redH}   fill={C.red} />
        {/* marker */}
        <Rect x={cx - barW / 2 - 4} y={markerY - 1.5} width={barW + 8} height={3} fill={C.slate800} />
      </Svg>
      <View style={{ flexDirection: "row", justifyContent: "space-between", width: w, marginTop: 2 }}>
        <Text style={{ fontSize: 5.5, color: C.slate400 }}>{cfg.min}</Text>
        <Text style={{ fontSize: 5.5, color: C.slate400 }}>{cfg.max}</Text>
      </View>
      <Text style={{ fontSize: 6.5, color: C.slate600, marginTop: 4, textAlign: "center" }}>{label}</Text>
    </View>
  )
}

function RiskGauges({ data }: { data: BodyCompositionData }) {
  const risks = [
    { label: "Hjärtsjukdom", value: data.riskHeartDisease },
    { label: "Stroke",       value: data.riskStroke },
    { label: "Diabetes",     value: data.riskDiabetes },
  ].filter((r): r is { label: string; value: number } => r.value != null)
  if (!risks.length) return null
  return (
    <View style={s.card}>
      <Text style={s.tag}>Relativa sjukdomsrisker</Text>
      <View style={{ flexDirection: "row", gap: 20, justifyContent: "center", marginTop: 6 }}>
        {risks.map(r => (
          <RiskGauge key={r.label} label={r.label} value={r.value}
            cfg={GAUGE_CONFIGS[r.label] ?? { min: 1, max: 5, yellowAt: 2, redAt: 2.5 }} />
        ))}
      </View>
    </View>
  )
}

// ─── Small metric tile ────────────────────────────────────────────────────────
function MetricTile({ label, value, unit, dec = 1, sub }: {
  label: string; value: number | null; unit: string; dec?: number; sub?: string
}) {
  if (value == null) return null
  return (
    <View style={{ flex: 1, backgroundColor: C.slate50, borderRadius: 6, padding: 10 }}>
      <Text style={s.tag}>{label}</Text>
      <Text style={s.smVal}>{fmt(value, dec)}</Text>
      {unit ? <Text style={s.smUnit}>{unit}</Text> : null}
      {sub  ? <Text style={[s.sub, { marginTop: 3 }]}>{sub}</Text> : null}
    </View>
  )
}

// ─── Page header ──────────────────────────────────────────────────────────────
function Header({ athleteName, dateStr, coachName, coachAvatarUrl }: {
  athleteName: string; dateStr: string; coachName?: string; coachAvatarUrl?: string
}) {
  return (
    <View style={s.header}>
      <View>
        <Text style={s.hLogo}>AKTIVITUS</Text>
        <Text style={s.hSub}>KROPPSSAMMANSÄTTNING</Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={s.hName}>{athleteName}</Text>
        <Text style={s.hDate}>{dateStr}</Text>
        {coachAvatarUrl && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
            <Image src={coachAvatarUrl} style={{ width: 16, height: 16, borderRadius: 8 }} />
            {coachName && <Text style={{ color: C.blueLight, fontSize: 7 }}>{coachName}</Text>}
          </View>
        )}
        {!coachAvatarUrl && coachName && (
          <Text style={{ color: C.blueLight, fontSize: 7, marginTop: 3 }}>{coachName}</Text>
        )}
      </View>
    </View>
  )
}

// ─── Main document ────────────────────────────────────────────────────────────
interface Props {
  data: BodyCompositionData
  athleteName: string
  coachName?: string
  coachAvatarUrl?: string
}

export function BodyCompositionReport({ data, athleteName, coachName, coachAvatarUrl }: Props) {
  const dateStr = data.measuredAt
    ? new Date(data.measuredAt + "T12:00:00").toLocaleDateString("sv-SE") : "—"

  const badge   = badgeColors(data.bodyFatCategory)
  const hasComp = data.weight != null && data.fatMassKg != null && data.totalBodyWaterL != null
  const hasReco = data.targetFatLossKg != null || data.daysToGoal != null || data.activityBmr != null
  const hasBmrSection = data.bmr != null || data.activityBmr != null ||
    data.visceralFatLevel != null || data.totalBodyWaterL != null

  const headerProps = { athleteName, dateStr, coachName, coachAvatarUrl }

  return (
    <Document>

      {/* ════════════════ PAGE 1 — Kroppsfett + Vikt/BMI ════════════════ */}
      <Page size="A4" style={s.page}>
        <Header {...headerProps} />

        {/* ── Kroppsfett section ── */}
        <View style={s.card}>
          <Text style={s.tag}>Kroppsfett</Text>
          <Text style={s.secTitle}>
            Ditt resultat — {fmt(data.bodyFatPct, 1)} % kroppsfett
          </Text>

          <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={s.bigVal}>{fmt(data.bodyFatPct, 1)}</Text>
              <Text style={s.bigUnit}>% kroppsfett</Text>
              {(data.bodyFatHealthyMin != null || data.bodyFatHealthyMax != null) && (
                <Text style={[s.sub, { marginTop: 5 }]}>
                  {"Hälsosamt: "}
                  <Text style={s.subBold}>
                    {fmt(data.bodyFatHealthyMin, 1)} – {fmt(data.bodyFatHealthyMax, 1)} %
                  </Text>
                </Text>
              )}
            </View>
            {data.bodyFatCategory && (
              <View style={[s.badge, { backgroundColor: badge.bg, marginTop: 4 }]}>
                <Text style={[s.badgeTx, { color: badge.fg }]}>{data.bodyFatCategory.toUpperCase()}</Text>
              </View>
            )}
          </View>

          <ZoneBar value={data.bodyFatPct} zones={FAT_ZONES} maxVal={35} w={INNER} />

          {data.bodyFatText && <Text style={s.para}>{data.bodyFatText}</Text>}
        </View>

        {/* ── Vikt & BMI section ── */}
        <View style={s.card}>
          <Text style={s.tag}>Vikt & BMI</Text>
          <Text style={s.secTitle}>
            Din vikt — {fmt(data.weight, 1)} kg
          </Text>

          <View style={[s.row, { marginBottom: 12 }]}>
            {data.weight != null && (
              <View style={{ flex: 1 }}>
                <Text style={s.smVal}>{fmt(data.weight, 1)}</Text>
                <Text style={s.smUnit}>kg</Text>
                {(data.healthyWeightMin != null || data.healthyWeightMax != null) && (
                  <Text style={[s.sub, { marginTop: 3 }]}>
                    {"Hälsosam: "}
                    <Text style={s.subBold}>{fmt(data.healthyWeightMin, 1)} – {fmt(data.healthyWeightMax, 1)} kg</Text>
                  </Text>
                )}
              </View>
            )}
            {data.bmi != null && (
              <View style={{ flex: 1 }}>
                <Text style={s.smVal}>{fmt(data.bmi, 1)}</Text>
                <Text style={s.smUnit}>BMI</Text>
                {data.heightCm != null && (
                  <Text style={[s.sub, { marginTop: 3 }]}>Längd: <Text style={s.subBold}>{fmt(data.heightCm, 0)} cm</Text></Text>
                )}
              </View>
            )}
            {data.muscleMassKg != null && (
              <View style={{ flex: 1 }}>
                <Text style={s.smVal}>{fmt(data.muscleMassKg, 1)}</Text>
                <Text style={s.smUnit}>kg muskelmassa</Text>
              </View>
            )}
            {data.fatMassKg != null && (
              <View style={{ flex: 1 }}>
                <Text style={s.smVal}>{fmt(data.fatMassKg, 1)}</Text>
                <Text style={s.smUnit}>kg fettmassa</Text>
              </View>
            )}
          </View>

          {data.bmi != null && <ZoneBar value={data.bmi} zones={BMI_ZONES} maxVal={40} w={INNER} />}

          {data.bmiText && <Text style={s.para}>{data.bmiText}</Text>}
        </View>
      </Page>

      {/* ════════════════ PAGE 2 — BMR + Sammansättning + Rekommendationer ════════════════ */}
      <Page size="A4" style={s.page}>
        <Header {...headerProps} />

        {/* ── BMR & Metabolism ── */}
        {hasBmrSection && (
          <View style={s.card}>
            <Text style={s.tag}>Energi & Metabolism</Text>
            <Text style={s.secTitle}>
              Din BMR — {fmt(data.bmr, 0)} kcal/dag
            </Text>

            <View style={s.row}>
              <MetricTile label="BMR — vila"      value={data.bmr}            unit="kcal/dag" dec={0} />
              <MetricTile label="BMR — aktivitet" value={data.activityBmr}    unit="kcal/dag" dec={0} />
              <MetricTile label="Visceralt fett"  value={data.visceralFatLevel} unit="nivå"  dec={0} />
              <MetricTile label="Kroppsvätska"    value={data.totalBodyWaterL} unit="L" />
            </View>

            {data.bmrText && <Text style={s.para}>{data.bmrText}</Text>}
          </View>
        )}

        {/* ── Sammansättning ── */}
        {hasComp && (
          <View style={s.card}>
            <Text style={s.tag}>Kroppssammansättning — {fmt(data.weight, 1)} kg totalt</Text>
            <DonutChart data={data} />
          </View>
        )}

        {/* ── Rekommendationer ── */}
        {(hasReco || data.recoText) && (
          <View style={s.recoBox}>
            <Text style={s.tag}>Rekommendationer</Text>

            {hasReco && (
              <View style={[s.row, { marginTop: 4, marginBottom: 4 }]}>
                {data.targetFatLossKg != null && (
                  <View style={{ flex: 1, alignItems: "center" }}>
                    <Text style={s.recoVal}>{fmt(data.targetFatLossKg, 1)}</Text>
                    <Text style={s.recoLbl}>kg fett att minska</Text>
                  </View>
                )}
                {data.targetFatLossKg != null && data.daysToGoal != null && <View style={s.recoDiv} />}
                {data.daysToGoal != null && (
                  <View style={{ flex: 1, alignItems: "center" }}>
                    <Text style={s.recoVal}>{fmt(data.daysToGoal, 0)}</Text>
                    <Text style={s.recoLbl}>dagar till mål</Text>
                  </View>
                )}
                {(data.targetFatLossKg != null || data.daysToGoal != null) && data.activityBmr != null && <View style={s.recoDiv} />}
                {data.activityBmr != null && (
                  <View style={{ flex: 1, alignItems: "center" }}>
                    <Text style={s.recoVal}>{fmt(data.activityBmr, 0)}</Text>
                    <Text style={s.recoLbl}>kcal/dag att äta</Text>
                  </View>
                )}
              </View>
            )}

            {data.recoText && <Text style={[s.para, { color: C.slate700 }]}>{data.recoText}</Text>}
          </View>
        )}

        {/* ── Relativa sjukdomsrisker ── */}
        <RiskGauges data={data} />

        {/* ── Coach-kommentar ── */}
        {data.coachComment && (
          <View wrap={false} style={[s.card, { borderLeftWidth: 3, borderLeftColor: C.blue }]}>
            <Text style={s.tag}>Coach-kommentar</Text>
            <Text style={{ fontSize: 8, color: C.slate700, lineHeight: 1.6, marginTop: 4 }}>{data.coachComment}</Text>
          </View>
        )}
      </Page>

    </Document>
  )
}
