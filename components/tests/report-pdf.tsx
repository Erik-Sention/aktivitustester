import {
  Document, Page, View, Text, Image, Svg,
  Line, Polyline, Rect, Circle, G, Path,
  StyleSheet,
} from '@react-pdf/renderer'
import type { Style } from '@react-pdf/types'
import type { RawDataPoint } from '@/types'
import type { SerializedTest } from './report-download-button'

// ─── Colours ──────────────────────────────────────────────────────────────────
const C = {
  blue:       '#1e40af',
  blueLight:  '#bfdbfe',
  green:      '#059669',
  greenBg:    '#d1fae5',
  purple:     '#7c3aed',
  purpleBg:   '#ede9fe',
  zoneLow:    '#dbeafe',
  zoneMed:    '#d1fae5',
  zoneHigh:   '#fee2e2',
  hrLine:     '#ef4444',
  lacLine:    '#f59e0b',
  wattLine:   '#eab308',
  lacOrange:  '#f97316',
  lacRed:     '#dc2626',
  slate50:    '#f8fafc',
  slate100:   '#f1f5f9',
  slate200:   '#e2e8f0',
  slate300:   '#cbd5e1',
  slate400:   '#94a3b8',
  slate500:   '#64748b',
  slate600:   '#475569',
  slate700:   '#334155',
  slate800:   '#1e293b',
  white:      '#ffffff',
} as const

const PAD = 20
const CONTENT_W = 555  // 595 - 2×20

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    padding: PAD,
    backgroundColor: C.slate100,
  },
  header: {
    backgroundColor: C.blue,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: { flexDirection: 'column' },
  headerLogo: {
    color: C.white,
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 2,
  },
  headerSubtitle: {
    color: C.blueLight,
    fontSize: 6.5,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  headerRight: { alignItems: 'flex-end' },
  headerName: {
    color: C.white,
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
  },
  headerMeta: {
    color: C.blueLight,
    fontSize: 7.5,
    marginTop: 3,
  },
  headerLeader: {
    color: C.blueLight,
    fontSize: 6.5,
    marginTop: 1,
  },
  avatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    marginRight: 10,
    backgroundColor: C.blueLight,
    flexShrink: 0,
  },
  avatarImg: {
    width: 36,
    height: 36,
  },
  box: {
    backgroundColor: C.white,
    borderRadius: 8,
    padding: 14,
    marginBottom: 8,
  },
  boxRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sectionLabel: {
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 2,
    color: C.slate400,
    marginBottom: 8,
  },
  // Threshold boxes
  threshBox: {
    flex: 1,
    borderRadius: 8,
    padding: 14,
  },
  threshBoxGreen:  { backgroundColor: C.green },
  threshBoxPurple: { backgroundColor: C.purple },
  threshBoxBlue:   { backgroundColor: C.blue },
  threshTitle: {
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.5,
    color: C.white,
    opacity: 0.8,
    marginBottom: 2,
  },
  threshSubtitle: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: C.white,
    marginBottom: 8,
  },
  threshValue: {
    fontSize: 30,
    fontFamily: 'Helvetica-Bold',
    color: C.white,
    lineHeight: 1,
  },
  threshUnit: {
    fontSize: 9,
    color: C.white,
    opacity: 0.7,
    marginBottom: 6,
  },
  threshDivider: {
    height: 0.5,
    backgroundColor: C.white,
    opacity: 0.3,
    marginVertical: 5,
  },
  threshStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  threshStatLabel: { fontSize: 7, color: C.white, opacity: 0.7 },
  threshStatValue: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.white },
  // Zone table
  zoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 4,
  },
  zoneRow1:   { backgroundColor: '#eff6ff' },
  zoneRow2:   { backgroundColor: '#ecfdf5' },
  zoneRow3:   { backgroundColor: '#fefce8' },
  zoneRow4:   { backgroundColor: '#fff7ed' },
  zoneRow5:   { backgroundColor: '#fee2e2' },
  zoneRowHead: { backgroundColor: C.slate100, marginBottom: 4 },
  zoneColor: {
    width: 8, height: 8, borderRadius: 2, marginRight: 8,
  },
  zoneColor1: { backgroundColor: '#3b82f6' },
  zoneColor2: { backgroundColor: '#10b981' },
  zoneColor3: { backgroundColor: '#eab308' },
  zoneColor4: { backgroundColor: '#f97316' },
  zoneColor5: { backgroundColor: '#dc2626' },
  zoneName: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.slate800,
    width: 105,
  },
  zoneVal: { fontSize: 8, color: C.slate700, flex: 1 },
  zoneValBold: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.slate800, flex: 1 },
  zoneHeadText: { fontSize: 6.5, letterSpacing: 1, color: C.slate400, flex: 1 },
  // Table
  tblHead: {
    flexDirection: 'row',
    backgroundColor: C.blue,
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 2,
  },
  tblHeadCell: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: C.white,
    letterSpacing: 0.5,
  },
  tblRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 3,
  },
  tblAlt: { backgroundColor: C.slate100 },
  tblCell:     { fontSize: 8.5, color: C.slate700 },
  tblCellBold: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: C.slate800 },
  // Knowledge page
  kwTitle: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: C.blue,
    marginBottom: 4,
  },
  kwLead: {
    fontSize: 8.5,
    color: C.slate500,
    marginBottom: 16,
  },
  kwDivider: {
    height: 1,
    backgroundColor: C.slate200,
    marginBottom: 0,
  },
  kwHeading: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: C.slate800,
    marginBottom: 4,
    marginTop: 12,
  },
  kwBody: {
    fontSize: 8.5,
    color: C.slate600,
    lineHeight: 1.7,
  },
  kwBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  kwDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
    marginTop: 2,
  },
  kwBulletText: {
    flex: 1,
    fontSize: 8.5,
    color: C.slate600,
    lineHeight: 1.7,
  },
  notesText: {
    fontSize: 8.5,
    color: C.slate600,
    fontFamily: 'Helvetica-Oblique',
    lineHeight: 1.6,
  },
})

// ─── Helpers ──────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const T = Text as any   // SVG Text — accepts x/y/textAnchor etc.

function fmt(v: number | null | undefined, unit = ''): string {
  if (v == null) return '—'
  const n = Number.isInteger(v) ? String(v) : v.toFixed(1)
  return unit ? `${n} ${unit}` : n
}

function fmtWkg(watt: number | null | undefined, bw: number | null | undefined): string {
  if (!watt || !bw || bw <= 0) return '—'
  return `${(watt / bw).toFixed(2)} W/kg`
}

function sportLabel(sport: string): string {
  const m: Record<string, string> = {
    cykel: 'Cykel', lopning: 'Löpning', skidor_band: 'Skidor (band)',
    skierg: 'Skierg', kajak: 'Kajak',
  }
  return m[sport] ?? sport
}

function testTypeLabel(type: string): string {
  const m: Record<string, string> = {
    troskeltest: 'Tröskeltest', vo2max: 'VO₂max-test', wingate: 'Wingate',
  }
  return m[type] ?? type
}

// ─── SVG Chart ────────────────────────────────────────────────────────────────
const CHART_W = CONTENT_W - 28   // inside box 14×2 padding
const CHART_H = 210
const CL = 40, CR = 12, CT = 10, CB = 30
const PW = CHART_W - CL - CR
const PH = CHART_H - CT - CB
const PX = CL, PY = CT, PX2 = PX + PW, PY2 = PY + PH

function buildStaircase(
  pts: { min: number; watt: number }[],
  xS: (m: number) => number,
  wY: (w: number) => number,
): string {
  if (pts.length === 0) return ''
  const out: string[] = []
  out.push(`${xS(pts[0].min).toFixed(1)},${wY(pts[0].watt).toFixed(1)}`)
  for (let i = 1; i < pts.length; i++) {
    const x = xS(pts[i].min)
    if (pts[i].watt !== pts[i - 1].watt) {
      out.push(`${x.toFixed(1)},${wY(pts[i - 1].watt).toFixed(1)}`)
    }
    out.push(`${x.toFixed(1)},${wY(pts[i].watt).toFixed(1)}`)
  }
  const last = pts[pts.length - 1]
  out.push(`${(xS(last.min) + 3).toFixed(1)},${wY(last.watt).toFixed(1)}`)
  return out.join(' ')
}

function PerformanceChart({
  rawData, lt1Watt, lt2Watt, lt1HR, lt2HR, nedreHR, estMaxHR,
}: {
  rawData: RawDataPoint[]
  lt1Watt: number | null
  lt2Watt: number | null
  lt1HR:   number | null
  lt2HR:   number | null
  nedreHR: number | null
  estMaxHR: number | null
}) {
  const pts = rawData.filter(p => p.min >= 0 && (p.watt > 0 || p.hr > 0))
  if (pts.length < 2) return null

  const maxMin     = Math.max(...pts.map(p => p.min))
  const maxHRData  = Math.max(...pts.filter(p => p.hr > 0).map(p => p.hr), estMaxHR ?? 0, 120)
  const maxWattData = Math.max(...pts.filter(p => p.watt > 0).map(p => p.watt), 50)
  const maxLacData = Math.max(...pts.filter(p => p.lac > 0).map(p => p.lac), 4)

  const hrAxisMax = Math.ceil((maxHRData + 15) / 25) * 25

  const xS  = (m: number) => PX + (m / (maxMin || 1)) * PW
  const hrY = (h: number) => PY2 - (h / hrAxisMax) * PH
  const wY  = (w: number) => PY2 - (w / (maxWattData * 1.05)) * PH
  const lacY = (l: number) => PY2 - (l / (maxLacData * 1.2)) * PH

  // HR axis ticks (every 25 bpm)
  const hrTicks: number[] = []
  for (let h = 25; h <= hrAxisMax; h += 25) hrTicks.push(h)

  // X-axis ticks
  const tickStep = Math.max(1, Math.ceil(maxMin / 8))
  const xTicks: number[] = []
  for (let m = 0; m <= maxMin; m += tickStep) xTicks.push(m)
  if (xTicks[xTicks.length - 1] !== maxMin) xTicks.push(maxMin)

  // Watt stage labels — one per unique watt level
  const wattLabels: { min: number; watt: number }[] = []
  for (let i = 0; i < pts.length; i++) {
    if (pts[i].watt > 0 && (i === 0 || pts[i].watt !== pts[i - 1].watt)) {
      wattLabels.push({ min: pts[i].min, watt: pts[i].watt })
    }
  }

  const lacPts = pts.filter(p => p.lac > 0)
  const hrPts  = pts.filter(p => p.hr > 0)

  const wattStaircase = buildStaircase(
    pts.filter(p => p.watt > 0),
    xS, wY,
  )
  const hrPolyline  = hrPts.map(p => `${xS(p.min).toFixed(1)},${hrY(p.hr).toFixed(1)}`).join(' ')
  const lacPolyline = lacPts.map(p => `${xS(p.min).toFixed(1)},${lacY(p.lac).toFixed(1)}`).join(' ')

  // LT1/LT2 vertical lines — first minute when watt reaches the threshold
  const lt1Min = lt1Watt ? (pts.find(p => p.watt >= lt1Watt)?.min ?? null) : null
  const lt2Min = lt2Watt ? (pts.find(p => p.watt >= lt2Watt)?.min ?? null) : null

  const showZones = lt1HR != null && lt2HR != null

  return (
    <Svg width={CHART_W} height={CHART_H}>
      {/* Plot background */}
      <Rect x={PX} y={PY} width={PW} height={PH} fill={C.slate50} />

      {/* Zone bands */}
      {showZones && (() => {
        const loY   = nedreHR  ? hrY(nedreHR)  : PY2
        const lt1Y  = hrY(lt1HR!)
        const lt2Y  = hrY(lt2HR!)
        const hiY   = estMaxHR ? hrY(estMaxHR) : PY
        return (
          <G>
            <Rect x={PX} y={lt1Y}  width={PW} height={Math.max(0, loY  - lt1Y)} fill={C.zoneLow}  opacity={0.5} />
            <Rect x={PX} y={lt2Y}  width={PW} height={Math.max(0, lt1Y - lt2Y)} fill={C.zoneMed}  opacity={0.5} />
            <Rect x={PX} y={hiY}   width={PW} height={Math.max(0, lt2Y - hiY)}  fill={C.zoneHigh} opacity={0.5} />
            {/* Zone labels on right edge */}
            <T x={PX2 - 2} y={Math.min((loY + lt1Y) / 2 + 3, PY2 - 4)}  fontSize={5.5} fill="#1d4ed8" textAnchor="end" opacity={0.8}>LÅG</T>
            <T x={PX2 - 2} y={(lt1Y + lt2Y) / 2 + 3}                     fontSize={5.5} fill={C.green}  textAnchor="end" opacity={0.8}>MED</T>
            {lt2Y - hiY > 12 && (
              <T x={PX2 - 2} y={(lt2Y + hiY) / 2 + 3}                    fontSize={5.5} fill="#dc2626" textAnchor="end" opacity={0.8}>HÖG</T>
            )}
          </G>
        )
      })()}

      {/* HR grid lines */}
      {hrTicks.map(h => {
        const y = hrY(h)
        if (y < PY - 1 || y > PY2 + 1) return null
        return <Line key={`hg${h}`} x1={PX} y1={y} x2={PX2} y2={y} stroke={C.slate200} strokeWidth={0.4} />
      })}

      {/* Watt staircase */}
      {wattStaircase && (
        <Polyline points={wattStaircase} stroke={C.wattLine} strokeWidth={2.2} fill="none" />
      )}
      {/* Watt step labels */}
      {wattLabels.map((p, i) => (
        <T key={`wl${i}`}
          x={xS(p.min) + 3} y={wY(p.watt) - 4}
          fontSize={6} fill={C.slate600} fontFamily="Helvetica-Bold">
          {p.watt}W
        </T>
      ))}

      {/* LT1 marker */}
      {lt1Min != null && (
        <G>
          <Line x1={xS(lt1Min)} y1={PY} x2={xS(lt1Min)} y2={PY2}
            stroke={C.green} strokeWidth={1.4} strokeDasharray="5 3" />
          <Rect x={xS(lt1Min) + 2} y={PY + 2} width={28} height={13} fill={C.green} rx={2} />
          <T x={xS(lt1Min) + 16} y={PY + 9} fontSize={6} fill={C.white} textAnchor="middle" fontFamily="Helvetica-Bold">LT1</T>
          {lt1Watt && (
            <T x={xS(lt1Min) + 16} y={PY + 15} fontSize={5.5} fill={C.white} textAnchor="middle">{lt1Watt}W</T>
          )}
        </G>
      )}

      {/* LT2 marker */}
      {lt2Min != null && (
        <G>
          <Line x1={xS(lt2Min)} y1={PY} x2={xS(lt2Min)} y2={PY2}
            stroke={C.purple} strokeWidth={1.4} strokeDasharray="5 3" />
          <Rect x={xS(lt2Min) + 2} y={PY + 2} width={28} height={13} fill={C.purple} rx={2} />
          <T x={xS(lt2Min) + 16} y={PY + 9} fontSize={6} fill={C.white} textAnchor="middle" fontFamily="Helvetica-Bold">LT2</T>
          {lt2Watt && (
            <T x={xS(lt2Min) + 16} y={PY + 15} fontSize={5.5} fill={C.white} textAnchor="middle">{lt2Watt}W</T>
          )}
        </G>
      )}

      {/* HR line */}
      {hrPolyline && (
        <Polyline points={hrPolyline} stroke={C.hrLine} strokeWidth={1.6} fill="none" />
      )}
      {hrPts.map((p, i) => (
        <G key={`hd${i}`}>
          <Circle cx={xS(p.min)} cy={hrY(p.hr)} r={2.5} fill={C.hrLine} />
          {/* Label at lactate points, first and last */}
          {(p.lac > 0 || i === 0 || i === hrPts.length - 1) && (
            <T x={xS(p.min)} y={hrY(p.hr) - 5} fontSize={5.5} fill={C.hrLine} textAnchor="middle">
              {p.hr}
            </T>
          )}
        </G>
      ))}

      {/* Lactate line */}
      {lacPts.length >= 2 && (
        <Polyline points={lacPolyline} stroke={C.lacLine} strokeWidth={2} fill="none" />
      )}
      {/* Lactate diamonds + value labels */}
      {lacPts.map((p, i) => {
        const lacColor = p.lac >= 4 ? C.lacRed : p.lac >= 2 ? C.lacOrange : C.lacLine
        const cx = xS(p.min), cy = lacY(p.lac)
        const d = 4
        return (
          <G key={`ld${i}`}>
            <Path
              d={`M${cx.toFixed(1)},${(cy - d).toFixed(1)} L${(cx + d).toFixed(1)},${cy.toFixed(1)} L${cx.toFixed(1)},${(cy + d).toFixed(1)} L${(cx - d).toFixed(1)},${cy.toFixed(1)} Z`}
              fill={lacColor}
            />
            <T x={cx} y={cy + d + 8} fontSize={7} fill={lacColor} textAnchor="middle" fontFamily="Helvetica-Bold">
              {p.lac}
            </T>
          </G>
        )
      })}

      {/* 2.0 and 4.0 mmol reference lines */}
      {[2, 4].map(mmol => {
        const y = lacY(mmol)
        if (y < PY || y > PY2) return null
        return (
          <Line key={`lref${mmol}`}
            x1={PX} y1={y} x2={PX2} y2={y}
            stroke={C.lacLine} strokeWidth={0.7} strokeDasharray="3 4" opacity={0.5}
          />
        )
      })}

      {/* Axes */}
      <Line x1={PX}  y1={PY}  x2={PX}  y2={PY2} stroke={C.slate300} strokeWidth={0.5} />
      <Line x1={PX}  y1={PY2} x2={PX2} y2={PY2} stroke={C.slate300} strokeWidth={0.5} />

      {/* HR axis ticks + labels */}
      {hrTicks.map(h => {
        const y = hrY(h)
        if (y < PY - 1 || y > PY2 + 1) return null
        return <T key={`ht${h}`} x={PX - 4} y={y + 3} fontSize={6} fill={C.hrLine} textAnchor="end">{h}</T>
      })}

      {/* X-axis ticks + labels */}
      {xTicks.map(m => (
        <G key={`xt${m}`}>
          <Line x1={xS(m)} y1={PY2} x2={xS(m)} y2={PY2 + 3} stroke={C.slate300} strokeWidth={0.5} />
          <T x={xS(m)} y={PY2 + 11} fontSize={6} fill={C.slate500} textAnchor="middle">{m}</T>
        </G>
      ))}

      {/* Axis unit labels */}
      <T x={PX - 4} y={PY + 5} fontSize={6} fill={C.hrLine} textAnchor="end" fontFamily="Helvetica-Bold">bpm</T>
      <T x={PX + PW / 2} y={CHART_H - 1} fontSize={6} fill={C.slate400} textAnchor="middle">Minuter</T>

      {/* Legend */}
      <G>
        <Polyline points={`${PX + 2},${CHART_H - 14} ${PX + 14},${CHART_H - 14}`} stroke={C.hrLine} strokeWidth={2} />
        <Circle cx={PX + 8} cy={CHART_H - 14} r={2.5} fill={C.hrLine} />
        <T x={PX + 17} y={CHART_H - 11} fontSize={6.5} fill={C.slate600}>Puls</T>

        <Polyline points={`${PX + 44},${CHART_H - 14} ${PX + 56},${CHART_H - 14}`} stroke={C.lacLine} strokeWidth={2} />
        <Path d={`M${PX + 50},${CHART_H - 18} L${PX + 54},${CHART_H - 14} L${PX + 50},${CHART_H - 10} L${PX + 46},${CHART_H - 14} Z`} fill={C.lacLine} />
        <T x={PX + 59} y={CHART_H - 11} fontSize={6.5} fill={C.slate600}>Laktat</T>

        <Polyline points={`${PX + 90},${CHART_H - 14} ${PX + 102},${CHART_H - 14}`} stroke={C.wattLine} strokeWidth={2} />
        <T x={PX + 105} y={CHART_H - 11} fontSize={6.5} fill={C.slate600}>Watt</T>

        {lt1Min != null && (
          <G>
            <Line x1={PX + 128} y1={CHART_H - 14} x2={PX + 140} y2={CHART_H - 14} stroke={C.green} strokeWidth={1.5} strokeDasharray="4 2" />
            <T x={PX + 143} y={CHART_H - 11} fontSize={6.5} fill={C.slate600}>LT1</T>
          </G>
        )}
        {lt2Min != null && (
          <G>
            <Line x1={PX + 163} y1={CHART_H - 14} x2={PX + 175} y2={CHART_H - 14} stroke={C.purple} strokeWidth={1.5} strokeDasharray="4 2" />
            <T x={PX + 178} y={CHART_H - 11} fontSize={6.5} fill={C.slate600}>LT2</T>
          </G>
        )}
      </G>
    </Svg>
  )
}

// ─── Page header ──────────────────────────────────────────────────────────────
function PageHeader({
  athleteName, testDate, sport, testType, testLeader, subtitle, coachName, coachAvatarUrl,
}: {
  athleteName: string
  testDate: string
  sport: string
  testType: string
  testLeader?: string
  subtitle?: string
  coachName?: string
  coachAvatarUrl?: string
}) {
  return (
    <View style={s.header}>
      {/* Left: optional avatar + logo */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {coachAvatarUrl && (
          <View style={s.avatarWrap}>
            <Image src={coachAvatarUrl} style={s.avatarImg} />
          </View>
        )}
        <View style={s.headerLeft}>
          <Text style={s.headerLogo}>AKTIVITUS</Text>
          <Text style={s.headerSubtitle}>
            Testklinik &amp; Coaching{subtitle ? `  ·  ${subtitle}` : ''}
          </Text>
        </View>
      </View>
      {/* Right: athlete + meta */}
      <View style={s.headerRight}>
        <Text style={s.headerName}>{athleteName}</Text>
        <Text style={s.headerMeta}>
          {testDate}  ·  {sportLabel(sport)}  ·  {testTypeLabel(testType)}
        </Text>
        {(coachName || testLeader) && (
          <Text style={s.headerLeader}>Testledare: {coachName ?? testLeader}</Text>
        )}
      </View>
    </View>
  )
}

// ─── Threshold boxes ──────────────────────────────────────────────────────────
function ThresholdBoxes({
  lt1Watt, lt2Watt, lt1HR, lt2HR, bodyWeight,
}: {
  lt1Watt: number | null
  lt2Watt: number | null
  lt1HR:   number | null
  lt2HR:   number | null
  bodyWeight: number | null
}) {
  return (
    <View style={s.boxRow}>
      <View style={[s.threshBox, s.threshBoxGreen]}>
        <Text style={s.threshTitle}>AEROB TRÖSKEL</Text>
        <Text style={s.threshSubtitle}>LT1 2.0 mmol</Text>
        <Text style={s.threshValue}>{fmt(lt1Watt)}</Text>
        <Text style={s.threshUnit}>Watt</Text>
        <View style={s.threshDivider} />
        <View style={s.threshStatRow}>
          <Text style={s.threshStatLabel}>Effekt/kg</Text>
          <Text style={s.threshStatValue}>{fmtWkg(lt1Watt, bodyWeight)}</Text>
        </View>
        <View style={s.threshStatRow}>
          <Text style={s.threshStatLabel}>Puls vid LT1</Text>
          <Text style={s.threshStatValue}>{lt1HR ? `${lt1HR} bpm` : '—'}</Text>
        </View>
      </View>
      <View style={[s.threshBox, s.threshBoxPurple]}>
        <Text style={s.threshTitle}>ANAEROB TRÖSKEL</Text>
        <Text style={s.threshSubtitle}>AT / FTP 4.0 mmol</Text>
        <Text style={s.threshValue}>{fmt(lt2Watt)}</Text>
        <Text style={s.threshUnit}>Watt</Text>
        <View style={s.threshDivider} />
        <View style={s.threshStatRow}>
          <Text style={s.threshStatLabel}>Effekt/kg</Text>
          <Text style={s.threshStatValue}>{fmtWkg(lt2Watt, bodyWeight)}</Text>
        </View>
        <View style={s.threshStatRow}>
          <Text style={s.threshStatLabel}>Puls vid LT2</Text>
          <Text style={s.threshStatValue}>{lt2HR ? `${lt2HR} bpm` : '—'}</Text>
        </View>
      </View>
    </View>
  )
}

// ─── Intensity zone table ─────────────────────────────────────────────────────
function IntensityZoneTable({
  lt1Watt, lt2Watt, lt1HR, lt2HR, estMaxHR,
}: {
  lt1Watt: number | null
  lt2Watt: number | null
  lt1HR:   number | null
  lt2HR:   number | null
  estMaxHR: number | null
}) {
  // Split the LT1–LT2 range at the midpoint to create Z2 and Z3
  const midW  = (lt1Watt && lt2Watt) ? Math.round((lt1Watt + lt2Watt) / 2) : null
  const midHR = (lt1HR   && lt2HR)   ? Math.round((lt1HR   + lt2HR)   / 2) : null
  // Z4 upper = LT2 + half the LT1–LT2 gap
  const z4UpperW  = (lt1Watt && lt2Watt) ? lt2Watt  + Math.round((lt2Watt  - lt1Watt) / 2) : null
  const z4UpperHR = (lt1HR   && lt2HR)   ? lt2HR    + Math.round((lt2HR    - lt1HR)   / 2) : null

  const zones: { label: string; hr: string; watt: string; rowStyle: Style; dotStyle: Style }[] = [
    {
      label: 'Zon 1 – Återhämtning',
      hr:   lt1HR   ? `< ${lt1HR} slag/min`                                          : '—',
      watt: lt1Watt ? `< ${lt1Watt} W`                                               : '—',
      rowStyle: s.zoneRow1, dotStyle: s.zoneColor1,
    },
    {
      label: 'Zon 2 – Grundkondition',
      hr:   (lt1HR && midHR)     ? `${lt1HR} – ${midHR - 1} slag/min`               : '—',
      watt: (lt1Watt && midW)    ? `${lt1Watt} – ${midW - 1} W`                     : '—',
      rowStyle: s.zoneRow2, dotStyle: s.zoneColor2,
    },
    {
      label: 'Zon 3 – Tempo',
      hr:   (midHR && lt2HR)     ? `${midHR} – ${lt2HR - 1} slag/min`               : '—',
      watt: (midW && lt2Watt)    ? `${midW} – ${lt2Watt - 1} W`                     : '—',
      rowStyle: s.zoneRow3, dotStyle: s.zoneColor3,
    },
    {
      label: 'Zon 4 – Tröskel',
      hr:   (lt2HR && z4UpperHR) ? `${lt2HR} – ${z4UpperHR} slag/min`               : '—',
      watt: (lt2Watt && z4UpperW)? `${lt2Watt} – ${z4UpperW} W`                     : '—',
      rowStyle: s.zoneRow4, dotStyle: s.zoneColor4,
    },
    {
      label: 'Zon 5 – Maximal',
      hr:   z4UpperHR ? `> ${z4UpperHR} slag/min${estMaxHR ? ` (max ${estMaxHR})` : ''}` : '—',
      watt: z4UpperW  ? `> ${z4UpperW} W`                                            : '—',
      rowStyle: s.zoneRow5, dotStyle: s.zoneColor5,
    },
  ]

  return (
    <View>
      <View style={[s.zoneRow, s.zoneRowHead]}>
        <View style={{ width: 16 }} />
        <Text style={[s.zoneName, { color: C.slate400, fontSize: 6.5, letterSpacing: 1 }]}>INTENSITETSZON</Text>
        <Text style={[s.zoneHeadText, { letterSpacing: 1 }]}>PULS</Text>
        <Text style={[s.zoneHeadText, { letterSpacing: 1 }]}>EFFEKT</Text>
      </View>
      {zones.map((z) => (
        <View key={z.label} style={[s.zoneRow, z.rowStyle]}>
          <View style={[s.zoneColor, z.dotStyle]} />
          <Text style={s.zoneName}>{z.label}</Text>
          <Text style={s.zoneValBold}>{z.hr}</Text>
          <Text style={s.zoneVal}>{z.watt}</Text>
        </View>
      ))}
    </View>
  )
}

// ─── Raw data table ───────────────────────────────────────────────────────────
const TW   = CONTENT_W - 28
const COL  = { min: 0.10, watt: 0.17, hr: 0.16, lac: 0.19, borg: 0.15, kad: 0.23 }

function DataTable({ rows }: { rows: RawDataPoint[] }) {
  return (
    <View>
      <View style={s.tblHead}>
        {([
          ['MIN',    COL.min,  'left'],
          ['WATT',  COL.watt, 'right'],
          ['PULS',  COL.hr,   'right'],
          ['LAKTAT',COL.lac,  'right'],
          ['BORG',  COL.borg, 'right'],
          ['KAD.',  COL.kad,  'right'],
        ] as [string, number, string][]).map(([lbl, frac, align]) => (
          <Text key={lbl} style={[s.tblHeadCell, { width: TW * frac, textAlign: align as 'left' | 'right' }]}>
            {lbl}
          </Text>
        ))}
      </View>
      {rows.map((row, i) => {
        const lacColor = row.lac >= 4 ? C.lacRed : row.lac >= 2 ? C.lacOrange : row.lac > 0 ? C.lacLine : C.slate400
        return (
          <View key={i} style={[s.tblRow, i % 2 === 1 ? s.tblAlt : {}]}>
            <Text style={[s.tblCell,     { width: TW * COL.min }]}>{row.min}</Text>
            <Text style={[s.tblCellBold, { width: TW * COL.watt, textAlign: 'right' }]}>{row.watt || '—'}</Text>
            <Text style={[s.tblCell,     { width: TW * COL.hr,   textAlign: 'right' }]}>{row.hr   || '—'}</Text>
            <Text style={[s.tblCellBold, { width: TW * COL.lac,  textAlign: 'right', color: lacColor }]}>
              {row.lac || '—'}
            </Text>
            <Text style={[s.tblCell,     { width: TW * COL.borg, textAlign: 'right', color: C.slate500 }]}>{row.borg    || '—'}</Text>
            <Text style={[s.tblCell,     { width: TW * COL.kad,  textAlign: 'right', color: C.slate500 }]}>{row.cadence || '—'}</Text>
          </View>
        )
      })}
    </View>
  )
}

// ─── Knowledge page ───────────────────────────────────────────────────────────
function KnowledgePage({
  athleteName, testDate, sport, testType, coachName, testLeader, coachAvatarUrl,
}: {
  athleteName: string
  testDate: string
  sport: string
  testType: string
  coachName?: string
  testLeader?: string
  coachAvatarUrl?: string
}) {
  return (
    <Page size="A4" style={s.page}>
      <PageHeader
        athleteName={athleteName}
        testDate={testDate}
        sport={sport}
        testType={testType}
        subtitle="Bakgrundsinformation"
        coachName={coachName}
        testLeader={testLeader}
        coachAvatarUrl={coachAvatarUrl}
      />
      <View style={s.box}>
        <Text style={s.kwTitle}>Dina laktattrösklar</Text>
        <Text style={s.kwLead}>
          Vad ditt test mäter — och hur du använder resultaten i din träning
        </Text>
        <View style={s.kwDivider} />

        <Text style={s.kwHeading}>Vad är laktat?</Text>
        <Text style={s.kwBody}>
          Laktat (mjölksyra) bildas naturligt i musklerna när du tränar. Vid låg intensitet hinner kroppen
          eliminera laktat lika snabbt som det bildas. Ju hårdare du arbetar, desto mer laktat produceras —
          och vid en viss belastning börjar det ackumuleras snabbare än kroppen kan hantera det.
          Det är just dessa brytpunkter — dina trösklar — som vi mäter i det här testet.
        </Text>

        <Text style={s.kwHeading}>Aerob tröskel — LT1 (≈ 2.0 mmol/L)</Text>
        <Text style={s.kwBody}>
          Din aeroba tröskel är den intensitet där laktathalten börjar stiga mätbart över vilovärdet.
          Under LT1 förbränner kroppen primärt fett och kan arbeta länge utan att anhopa mjölksyra.
          Träning i denna zon bygger din aeroba bas — den viktigaste faktorn för uthållighet på lång sikt.
          De flesta uthållighetsidrottare bör lägga 70–80 % av sin träningsvolym i denna zon.
        </Text>

        <Text style={s.kwHeading}>Anaerob tröskel — AT / LT2 (≈ 4.0 mmol/L)</Text>
        <Text style={s.kwBody}>
          Vid LT2 börjar laktat ackumuleras snabbare än kroppen kan eliminera det. LT2 motsvarar ungefär
          din FTP (Functional Threshold Power) — den högsta effekt du kan hålla stabilt under ca 60 minuter.
          Att höja LT2 är ett av de viktigaste målen för de flesta uthållighetsidrottare.
          Intervallträning strax under och runt LT2 är det effektivaste sättet att förbättra detta värde.
        </Text>

        <Text style={s.kwHeading}>3-zon träningsmodell</Text>
        <Text style={[s.kwBody, { marginBottom: 8 }]}>
          Dina personliga tröskelvärden delar in all träning i tre meningsfulla zoner:
        </Text>
        <View style={s.kwBulletRow}>
          <View style={[s.kwDot, { backgroundColor: '#1d4ed8' }]} />
          <Text style={s.kwBulletText}>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>Lågintensiv (under LT1): </Text>
            Återhämtning och aerob basträning. Hög volym, låg fysiologisk stress.
            Viktigaste zonen för långsiktig kapacitetsutveckling.
          </Text>
        </View>
        <View style={s.kwBulletRow}>
          <View style={[s.kwDot, { backgroundColor: '#059669' }]} />
          <Text style={s.kwBulletText}>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>Medelintensiv (LT1 till LT2): </Text>
            Tröskeltempo och "sweet spot"-träning. Effektiv men kräver återhämtningstid.
            Håll volymen begränsad — ca 10–15 % av träningen.
          </Text>
        </View>
        <View style={s.kwBulletRow}>
          <View style={[s.kwDot, { backgroundColor: '#dc2626' }]} />
          <Text style={s.kwBulletText}>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>Högintensiv (över LT2): </Text>
            Intervaller och kapacitetshöjning. Hög fysiologisk stress — begränsa till
            ca 10–20 % av träningen och säkerställ god återhämtning mellan passen.
          </Text>
        </View>

        <View style={[s.kwDivider, { marginTop: 12 }]} />
        <Text style={s.kwHeading}>Nästa steg</Text>
        <Text style={s.kwBody}>
          Diskutera gärna dina träningszoner, upplägg och mål med din coach.
          Testet rekommenderas upprepas var 3–6 månad för att följa din utveckling
          och justera träningen efter aktuell form. Välkommen tillbaka!
        </Text>
      </View>
    </Page>
  )
}

// ─── Main document ────────────────────────────────────────────────────────────
export function AktivitusReport({
  test,
  athleteName,
  coachName,
  coachAvatarUrl,
}: {
  test: SerializedTest
  athleteName: string
  gender?: 'M' | 'K' | ''
  coachName?: string
  coachAvatarUrl?: string
}) {
  const r  = test.results
  const ip = test.inputParams
  const ca = test.coachAssessment
  const testDate = new Date(test.testDate.seconds * 1000).toLocaleDateString('sv-SE')
  const bw = ip.bodyWeight

  const isTroskel = test.testType === 'troskeltest'
  const isVO2     = test.testType === 'vo2max'
  const isWingate = test.testType === 'wingate'

  const lt1Watt  = ca?.atEffektWatt  ?? r.atWatt
  const lt2Watt  = ca?.ltEffektWatt  ?? r.ltWatt
  const lt1HR    = ca?.atPuls        ?? null
  const lt2HR    = ca?.ltPuls        ?? null
  const nedreHR  = ca?.nedreGransPuls ?? null
  const estMaxHR = ca?.estMaxPuls ?? ca?.hogstaUpnaddPuls ?? r.maxHR

  const protocolStr = ip.startWatt
    ? `${ip.startWatt}W  +${ip.stepSize}W / ${ip.testDuration} min`
    : ip.startSpeed
    ? `${ip.startSpeed} km/h  +${ip.speedIncrement} km/h / ${ip.testDuration} min`
    : ''

  return (
    <Document>
      {/* ── Page 1: Results ────────────────────────────────────────────────── */}
      <Page size="A4" style={s.page}>
        <PageHeader
          athleteName={athleteName}
          testDate={testDate}
          sport={test.sport}
          testType={test.testType}
          testLeader={test.testLeader}
          subtitle="Resultatöversikt"
          coachName={coachName}
          coachAvatarUrl={coachAvatarUrl}
        />

        {/* Performance chart */}
        {(isTroskel || isVO2) && test.rawData.length >= 2 && (
          <View style={s.box}>
            <Text style={s.sectionLabel}>PRESTANDAGRAF</Text>
            <PerformanceChart
              rawData={test.rawData}
              lt1Watt={lt1Watt}
              lt2Watt={lt2Watt}
              lt1HR={lt1HR}
              lt2HR={lt2HR}
              nedreHR={nedreHR}
              estMaxHR={estMaxHR}
            />
          </View>
        )}

        {/* Threshold boxes + zone table */}
        {isTroskel && (lt1Watt || lt2Watt) && (
          <View style={s.box}>
            <Text style={s.sectionLabel}>TRÖSKLAR</Text>
            <ThresholdBoxes
              lt1Watt={lt1Watt}
              lt2Watt={lt2Watt}
              lt1HR={lt1HR}
              lt2HR={lt2HR}
              bodyWeight={bw}
            />
          </View>
        )}

        {isTroskel && (lt1HR || lt2HR || lt1Watt || lt2Watt) && (
          <View style={s.box}>
            <Text style={s.sectionLabel}>INTENSITETSZONER</Text>
            <IntensityZoneTable
              lt1Watt={lt1Watt}
              lt2Watt={lt2Watt}
              lt1HR={lt1HR}
              lt2HR={lt2HR}
              estMaxHR={estMaxHR}
            />
          </View>
        )}

        {/* VO2max results */}
        {isVO2 && (
          <View style={s.box}>
            <Text style={s.sectionLabel}>VO₂MAX</Text>
            <View style={s.boxRow}>
              <View style={[s.threshBox, s.threshBoxGreen]}>
                <Text style={s.threshTitle}>VO₂ MAX</Text>
                <Text style={[s.threshValue, { fontSize: 36 }]}>{fmt(r.vo2Max)}</Text>
                <Text style={s.threshUnit}>ml/kg/min</Text>
                <View style={s.threshDivider} />
                <View style={s.threshStatRow}>
                  <Text style={s.threshStatLabel}>Max puls</Text>
                  <Text style={s.threshStatValue}>{r.maxHR ? `${r.maxHR} bpm` : '—'}</Text>
                </View>
                <View style={s.threshStatRow}>
                  <Text style={s.threshStatLabel}>Max laktat</Text>
                  <Text style={s.threshStatValue}>{fmt(r.maxLactate, 'mmol')}</Text>
                </View>
                <View style={s.threshStatRow}>
                  <Text style={s.threshStatLabel}>Kroppsvikt</Text>
                  <Text style={s.threshStatValue}>{fmt(bw, 'kg')}</Text>
                </View>
              </View>
              <View style={[s.threshBox, s.threshBoxBlue]}>
                <Text style={s.threshTitle}>PROTOKOLL</Text>
                <Text style={s.threshSubtitle}>{protocolStr || '—'}</Text>
                <View style={s.threshDivider} />
                <View style={s.threshStatRow}>
                  <Text style={s.threshStatLabel}>Testplats</Text>
                  <Text style={s.threshStatValue}>{test.testLocation}</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Wingate results */}
        {isWingate && test.wingateData && (
          <View style={s.box}>
            <Text style={s.sectionLabel}>WINGATE RESULTAT</Text>
            <View style={s.boxRow}>
              <View style={[s.threshBox, s.threshBoxGreen]}>
                <Text style={s.threshTitle}>PEAK POWER</Text>
                <Text style={[s.threshValue, { fontSize: 32 }]}>{fmt(test.wingateData.peakPower)}</Text>
                <Text style={s.threshUnit}>Watt</Text>
                <View style={s.threshDivider} />
                <View style={s.threshStatRow}>
                  <Text style={s.threshStatLabel}>Peak W/kg</Text>
                  <Text style={s.threshStatValue}>{fmtWkg(test.wingateData.peakPower, bw)}</Text>
                </View>
              </View>
              <View style={[s.threshBox, s.threshBoxPurple]}>
                <Text style={s.threshTitle}>MEAN / MIN POWER</Text>
                <Text style={[s.threshValue, { fontSize: 32 }]}>{fmt(test.wingateData.meanPower)}</Text>
                <Text style={s.threshUnit}>Watt (medel)</Text>
                <View style={s.threshDivider} />
                <View style={s.threshStatRow}>
                  <Text style={s.threshStatLabel}>Min power</Text>
                  <Text style={s.threshStatValue}>{fmt(test.wingateData.minPower, 'W')}</Text>
                </View>
                <View style={s.threshStatRow}>
                  <Text style={s.threshStatLabel}>Fatigue Index</Text>
                  <Text style={s.threshStatValue}>
                    {test.wingateData.peakPower && test.wingateData.minPower
                      ? `${(((test.wingateData.peakPower - test.wingateData.minPower) / test.wingateData.peakPower) * 100).toFixed(1)} %`
                      : '—'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Notes */}
        {test.notes?.trim() ? (
          <View style={s.box}>
            <Text style={s.sectionLabel}>ANTECKNINGAR</Text>
            <Text style={s.notesText}>{test.notes}</Text>
          </View>
        ) : null}
      </Page>

      {/* ── Page 2: Raw data ────────────────────────────────────────────────── */}
      {test.rawData.length > 0 && (
        <Page size="A4" style={s.page}>
          <PageHeader
            athleteName={athleteName}
            testDate={testDate}
            sport={test.sport}
            testType={test.testType}
            subtitle="Minutdata"
            coachName={coachName}
            testLeader={test.testLeader}
            coachAvatarUrl={coachAvatarUrl}
          />
          <View style={s.box}>
            <Text style={s.sectionLabel}>MINUTDATA PER STEG</Text>
            <DataTable rows={test.rawData} />
          </View>

          {test.settings?.bike && (() => {
            const bike = test.settings!.bike!
            return (
              <View style={s.box}>
                <Text style={s.sectionLabel}>CYKELINSTÄLLNINGAR</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {([
                    ['Cykeltyp',            bike.bikeType],
                    ['Pedaltyp',            bike.pedalType],
                    ['Sadel vertikalt',     bike.saddleVerticalMm    != null ? `${bike.saddleVerticalMm} mm`    : '—'],
                    ['Sadel horisontellt',  bike.saddleHorizontalMm  != null ? `${bike.saddleHorizontalMm} mm`  : '—'],
                    ['Styre vertikalt',     bike.handlebarVerticalMm != null ? `${bike.handlebarVerticalMm} mm` : '—'],
                    ['Styre horisontellt',  bike.handlebarHorizontalMm != null ? `${bike.handlebarHorizontalMm} mm` : '—'],
                  ] as [string, string][]).map(([label, val]) => (
                    <View key={label} style={{ width: '47%' }}>
                      <Text style={{ fontSize: 6.5, color: C.slate400, letterSpacing: 0.5, marginBottom: 2 }}>{label}</Text>
                      <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: C.slate700 }}>{val || '—'}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )
          })()}
        </Page>
      )}

      {/* ── Page 3: Knowledge (threshold tests only) ─────────────────────── */}
      {isTroskel && (
        <KnowledgePage
          athleteName={athleteName}
          testDate={testDate}
          sport={test.sport}
          testType={test.testType}
          coachName={coachName}
          testLeader={test.testLeader}
          coachAvatarUrl={coachAvatarUrl}
        />
      )}
    </Document>
  )
}
