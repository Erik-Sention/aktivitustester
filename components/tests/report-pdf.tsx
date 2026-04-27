import {
  Document, Page, View, Text, Image, Svg,
  Line, Polyline, Rect, Circle, G, Path,
  StyleSheet,
} from '@react-pdf/renderer'
import type { RawDataPoint } from '@/types'
import type { SerializedTest } from './report-download-button'
import { isSpeedSport } from '@/lib/utils'
import { calculateNineZones } from '@/lib/zones'

// ─── Colours ──────────────────────────────────────────────────────────────────
const C = {
  blue:       '#0071BA',
  blueLight:  '#b3d9f0',
  green:      '#0f766e',
  greenBg:    '#ccfbf1',
  purple:     '#4338ca',
  purpleBg:   '#e0e7ff',
  zoneLow:    '#dbeafe',
  zoneMed:    '#d1fae5',
  zoneHigh:   '#fee2e2',
  hrLine:     '#ef4444',
  lacLine:    '#3b82f6',
  wattLine:   '#C7C7CC',
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
    opacity: 0.8,
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
  rawData, lt1Watt, lt2Watt, estMaxHR, isSpeed,
}: {
  rawData: RawDataPoint[]
  lt1Watt: number | null
  lt2Watt: number | null
  estMaxHR: number | null
  isSpeed?: boolean
}) {
  const lastDataIdx = rawData.reduce((max, r, i) => (r.hr > 0 || r.lac > 0) ? i : max, -1)
  const activeRaw = lastDataIdx >= 0 ? rawData.slice(0, lastDataIdx + 1) : rawData
  const pts = activeRaw.filter(p => p.min >= 0 && (p.watt > 0 || (p.speed ?? 0) > 0 || p.hr > 0))
  if (pts.length < 2) return null

  const intensityOf = (p: RawDataPoint) => isSpeed ? (p.speed ?? 0) : p.watt

  const maxMin     = Math.max(...pts.map(p => p.min))
  const maxHRData  = Math.max(...pts.filter(p => p.hr > 0).map(p => p.hr), estMaxHR ?? 0, 120)
  const maxIntensity = isSpeed
    ? Math.max(...pts.filter(p => (p.speed ?? 0) > 0).map(p => p.speed ?? 0), 10)
    : Math.max(...pts.filter(p => p.watt > 0).map(p => p.watt), 50)
  const maxLacData = Math.max(...pts.filter(p => p.lac > 0).map(p => p.lac), 4)

  const hrAxisMax = Math.ceil((maxHRData + 15) / 25) * 25

  const xPAD = 8
  const xS   = (m: number) => PX + xPAD + (m / (maxMin || 1)) * (PW - 2 * xPAD)
  const hrY  = (h: number) => PY2 - (h / hrAxisMax) * PH
  const wY   = (w: number) => PY2 - (w / (maxIntensity * 1.05)) * PH
  const lacY = (l: number) => PY2 - (l / (maxLacData * 1.2)) * PH
  const cadY = (c: number) => PY2 - (c / 1800) * PH
  const borgY = (b: number) => PY2 - ((b - 4) / 22) * PH

  // HR axis ticks (every 25 bpm)
  const hrTicks: number[] = []
  for (let h = 25; h <= hrAxisMax; h += 25) hrTicks.push(h)

  // X-axis ticks
  const tickStep = Math.max(1, Math.ceil(maxMin / 8))
  const xTicks: number[] = []
  for (let m = 0; m <= maxMin; m += tickStep) xTicks.push(m)
  if (xTicks[xTicks.length - 1] !== maxMin) xTicks.push(maxMin)

  // Intensity stage labels — one per unique intensity level
  const intensityLabels: { min: number; watt: number }[] = []
  for (let i = 0; i < pts.length; i++) {
    const v = intensityOf(pts[i])
    if (v > 0 && (i === 0 || v !== intensityOf(pts[i - 1]))) {
      intensityLabels.push({ min: pts[i].min, watt: v })
    }
  }

  const lacPts  = pts.filter(p => p.lac > 0)
  const hrPts   = pts.filter(p => p.hr > 0)
  const cadPts  = pts.filter(p => (p.cadence ?? 0) > 0)
  const borgPts = pts.filter(p => (p.borg ?? 0) > 0)

  const intensityPts = isSpeed
    ? pts.filter(p => (p.speed ?? 0) > 0).map(p => ({ min: p.min, watt: p.speed ?? 0 }))
    : pts.filter(p => p.watt > 0)
  const wattStaircase = buildStaircase(intensityPts, xS, wY)
  const hrPolyline  = hrPts.map(p => `${xS(p.min).toFixed(1)},${hrY(p.hr).toFixed(1)}`).join(' ')
  const lacPolyline = lacPts.map(p => `${xS(p.min).toFixed(1)},${lacY(p.lac).toFixed(1)}`).join(' ')
  const cadPolyline  = cadPts.map(p => `${xS(p.min).toFixed(1)},${cadY(p.cadence ?? 0).toFixed(1)}`).join(' ')
  const borgPolyline = borgPts.map(p => `${xS(p.min).toFixed(1)},${borgY(p.borg ?? 0).toFixed(1)}`).join(' ')

  // LT1/LT2 vertical lines — first minute when intensity reaches threshold
  const lt1Min = lt1Watt
    ? isSpeed
      ? (pts.find(p => (p.speed ?? 0) >= lt1Watt)?.min ?? null)
      : (pts.find(p => p.watt >= lt1Watt)?.min ?? null)
    : null
  const lt2Min = lt2Watt
    ? isSpeed
      ? (pts.find(p => (p.speed ?? 0) >= lt2Watt)?.min ?? null)
      : (pts.find(p => p.watt >= lt2Watt)?.min ?? null)
    : null

  return (
    <Svg width={CHART_W} height={CHART_H}>
      {/* Plot background */}
      <Rect x={PX} y={PY} width={PW} height={PH} fill={C.slate50} />


      {/* HR grid lines */}
      {hrTicks.map(h => {
        const y = hrY(h)
        if (y < PY - 1 || y > PY2 + 1) return null
        return <Line key={`hg${h}`} x1={PX} y1={y} x2={PX2} y2={y} stroke={C.slate200} strokeWidth={0.4} />
      })}

      {/* Intensity staircase (watt or speed) */}
      {wattStaircase && (
        <Polyline points={wattStaircase} stroke={C.wattLine} strokeWidth={2.2} fill="none" opacity={0.6} />
      )}
      {/* Intensity step labels */}
      {intensityLabels.map((p, i) => (
        <T key={`wl${i}`}
          x={xS(p.min) + 3} y={wY(p.watt) - 4}
          fontSize={6} fill={C.slate600} fontFamily="Helvetica-Bold">
          {p.watt}{isSpeed ? 'km/h' : 'W'}
        </T>
      ))}

      {/* LT1 marker */}
      {lt1Min != null && (
        <G>
          <Line x1={xS(lt1Min)} y1={PY} x2={xS(lt1Min)} y2={PY2}
            stroke={C.green} strokeWidth={1.4} strokeDasharray="5 3" opacity={0.6} />
          <Rect x={xS(lt1Min) + 2} y={PY + 2} width={28} height={9} fill={C.green} rx={2} opacity={0.6} />
          <T x={xS(lt1Min) + 16} y={PY + 9} fontSize={6} fill={C.white} textAnchor="middle" fontFamily="Helvetica-Bold">AT</T>
        </G>
      )}

      {/* LT2 marker */}
      {lt2Min != null && (
        <G>
          <Line x1={xS(lt2Min)} y1={PY} x2={xS(lt2Min)} y2={PY2}
            stroke={C.purple} strokeWidth={1.4} strokeDasharray="5 3" opacity={0.6} />
          <Rect x={xS(lt2Min) + 2} y={PY + 2} width={28} height={9} fill={C.purple} rx={2} opacity={0.6} />
          <T x={xS(lt2Min) + 16} y={PY + 9} fontSize={6} fill={C.white} textAnchor="middle" fontFamily="Helvetica-Bold">LT</T>
        </G>
      )}

      {/* Cadence line + labels (bottom strip) */}
      {cadPts.length >= 2 && cadPolyline && (
        <Polyline points={cadPolyline} stroke="#8b5cf6" strokeWidth={1} fill="none" opacity={0.6} />
      )}
      {cadPts.map((p, i) => (
        <G key={`cd${i}`}>
          <Circle cx={xS(p.min)} cy={cadY(p.cadence ?? 0)} r={2} fill="#8b5cf6" opacity={0.6} />
          <T x={xS(p.min) + 5} y={cadY(p.cadence ?? 0) - 5} fontSize={6} fill="#8b5cf6" textAnchor="start">
            {p.cadence}
          </T>
        </G>
      ))}

      {/* Borg line + labels */}
      {borgPts.length >= 2 && borgPolyline && (
        <Polyline points={borgPolyline} stroke="#f59e0b" strokeWidth={1} fill="none" strokeDasharray="3 2" opacity={0.6} />
      )}
      {borgPts.map((p, i) => (
        <G key={`bg${i}`}>
          <Circle cx={xS(p.min)} cy={borgY(p.borg ?? 0)} r={2} fill="#f59e0b" opacity={0.6} />
          <T x={xS(p.min) + 5} y={borgY(p.borg ?? 0) - 3} fontSize={6} fill="#f59e0b" textAnchor="start">
            {p.borg}
          </T>
        </G>
      ))}

      {/* HR line */}
      {hrPolyline && (
        <Polyline points={hrPolyline} stroke={C.hrLine} strokeWidth={1.6} fill="none" opacity={0.6} />
      )}
      {hrPts.map((p, i) => (
        <G key={`hd${i}`}>
          <Circle cx={xS(p.min)} cy={hrY(p.hr)} r={2.5} fill={C.hrLine} opacity={0.6} />
          <T x={xS(p.min)} y={hrY(p.hr) - 5} fontSize={5.5} fill={C.hrLine} textAnchor="middle">
            {p.hr}
          </T>
        </G>
      ))}

      {/* Lactate line */}
      {lacPts.length >= 2 && (
        <Polyline points={lacPolyline} stroke={C.lacLine} strokeWidth={2} fill="none" opacity={0.6} />
      )}
      {/* Lactate diamonds + value labels */}
      {lacPts.map((p, i) => {
        const lacColor = C.lacLine
        const cx = xS(p.min), cy = lacY(p.lac)
        const d = 4
        return (
          <G key={`ld${i}`}>
            <Path
              d={`M${cx.toFixed(1)},${(cy - d).toFixed(1)} L${(cx + d).toFixed(1)},${cy.toFixed(1)} L${cx.toFixed(1)},${(cy + d).toFixed(1)} L${(cx - d).toFixed(1)},${cy.toFixed(1)} Z`}
              fill={lacColor} opacity={0.6}
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

      {/* X-axis ticks + labels */}
      {xTicks.map(m => (
        <G key={`xt${m}`}>
          <Line x1={xS(m)} y1={PY2} x2={xS(m)} y2={PY2 + 3} stroke={C.slate300} strokeWidth={0.5} />
          <T x={xS(m)} y={PY2 + 11} fontSize={6} fill={C.slate500} textAnchor="middle">{m}</T>
        </G>
      ))}

      {/* Axis unit labels */}
<T x={PX + PW / 2} y={CHART_H - 1} fontSize={6} fill={C.slate400} textAnchor="middle">Minuter</T>

      {/* Legend */}
      <G>
        <Polyline points={`${PX + 2},${CHART_H - 14} ${PX + 14},${CHART_H - 14}`} stroke={C.hrLine} strokeWidth={2} />
        <Circle cx={PX + 8} cy={CHART_H - 14} r={2.5} fill={C.hrLine} />
        <T x={PX + 17} y={CHART_H - 11} fontSize={6.5} fill={C.slate600}>Puls (bpm)</T>

        <Polyline points={`${PX + 65},${CHART_H - 14} ${PX + 77},${CHART_H - 14}`} stroke={C.lacLine} strokeWidth={2} />
        <Path d={`M${PX + 71},${CHART_H - 18} L${PX + 75},${CHART_H - 14} L${PX + 71},${CHART_H - 10} L${PX + 67},${CHART_H - 14} Z`} fill={C.lacLine} />
        <T x={PX + 80} y={CHART_H - 11} fontSize={6.5} fill={C.slate600}>Laktat (mmol)</T>

        <Polyline points={`${PX + 135},${CHART_H - 14} ${PX + 147},${CHART_H - 14}`} stroke={C.wattLine} strokeWidth={2} />
        <T x={PX + 150} y={CHART_H - 11} fontSize={6.5} fill={C.slate600}>{isSpeed ? 'Hastighet' : 'Watt'}</T>

        {cadPts.length > 0 && (
          <G>
            <Line x1={PX + 173} y1={CHART_H - 14} x2={PX + 185} y2={CHART_H - 14} stroke="#8b5cf6" strokeWidth={1.5} />
            <Circle cx={PX + 179} cy={CHART_H - 14} r={2} fill="#8b5cf6" />
            <T x={PX + 188} y={CHART_H - 11} fontSize={6.5} fill={C.slate600}>Kadans</T>
          </G>
        )}
        {borgPts.length > 0 && (
          <G>
            <Line x1={PX + 220} y1={CHART_H - 14} x2={PX + 232} y2={CHART_H - 14} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="3 2" />
            <Circle cx={PX + 226} cy={CHART_H - 14} r={2} fill="#f59e0b" />
            <T x={PX + 235} y={CHART_H - 11} fontSize={6.5} fill={C.slate600}>Borg</T>
          </G>
        )}
      </G>
    </Svg>
  )
}

// ─── Wingate bar chart ────────────────────────────────────────────────────────
const BAR_W = CONTENT_W - 28
const BAR_H = 100
const BAR_LABEL_W = 70
const BAR_PLOT_W = BAR_W - BAR_LABEL_W - 10

function WingateBarChart({
  peakPower, meanPower, minPower,
}: {
  peakPower: number | null | undefined
  meanPower: number | null | undefined
  minPower:  number | null | undefined
}) {
  const maxVal = Math.max(peakPower ?? 0, meanPower ?? 0, minPower ?? 0)
  if (!maxVal) return null

  const bars = [
    { label: 'Peak Power', value: peakPower, color: C.green },
    { label: 'Mean Power', value: meanPower, color: C.blue },
    { label: 'Min Power',  value: minPower,  color: C.purple },
  ]
  const rowH = BAR_H / bars.length
  const barH = rowH * 0.55

  return (
    <Svg width={BAR_W} height={BAR_H}>
      {bars.map((b, i) => {
        const y = i * rowH + (rowH - barH) / 2
        const w = b.value ? (b.value / maxVal) * BAR_PLOT_W : 0
        const label = b.value != null ? `${b.value} W` : '—'
        const outsideX = BAR_LABEL_W + w + 4
        const fitsOutside = outsideX + 38 < BAR_W
        return (
          <G key={b.label}>
            <T x={0} y={y + barH * 0.72} fontSize={7} fill={C.slate500}>{b.label}</T>
            <Rect x={BAR_LABEL_W} y={y} width={BAR_PLOT_W} height={barH} fill={C.slate100} rx={3} />
            <Rect x={BAR_LABEL_W} y={y} width={w} height={barH} fill={b.color} rx={3} />
            {fitsOutside ? (
              <T x={outsideX} y={y + barH * 0.72} fontSize={7.5} fontFamily="Helvetica-Bold" fill={C.slate700}>
                {label}
              </T>
            ) : (
              <T x={BAR_LABEL_W + w - 5} y={y + barH * 0.72} fontSize={7.5} fontFamily="Helvetica-Bold" fill={C.white} textAnchor="end">
                {label}
              </T>
            )}
          </G>
        )
      })}
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
      {/* Left: logo only */}
      <View style={s.headerLeft}>
        <Text style={s.headerLogo}>AKTIVITUS</Text>
        <Text style={s.headerSubtitle}>
          Testklinik &amp; Coaching{subtitle ? `  ·  ${subtitle}` : ''}
        </Text>
      </View>
      {/* Right: athlete + meta + coach (avatar inline with name) */}
      <View style={s.headerRight}>
        <Text style={s.headerName}>{athleteName}</Text>
        <Text style={s.headerMeta}>
          {testDate}  ·  {sportLabel(sport)}  ·  {testTypeLabel(testType)}
        </Text>
        {(coachName || testLeader) && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
            {coachAvatarUrl && (
              <View style={[s.avatarWrap, { width: 20, height: 20, borderRadius: 10, marginRight: 5, marginTop: 0 }]}>
                <Image src={coachAvatarUrl} style={{ width: 20, height: 20 }} />
              </View>
            )}
            <Text style={s.headerLeader}>Testledare: {coachName ?? testLeader}</Text>
          </View>
        )}
      </View>
    </View>
  )
}

// ─── Page footer ──────────────────────────────────────────────────────────────
function PageFooter() {
  return (
    <View style={{
      position: 'absolute', bottom: 10, left: PAD, right: PAD,
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      borderTopWidth: 0.5, borderTopColor: C.slate200, paddingTop: 4,
    }}>
      <Text style={{ fontSize: 6, color: C.slate400 }}>
        Aktivitus Testklinik &amp; Coaching  ·  www.aktivitus.se  ·  info@aktivitus.se  ·  Tel: 0732 448248
      </Text>
      <Text style={{ fontSize: 6, color: C.slate400 }}>
        Instagram &amp; Facebook: @Aktivitus
      </Text>
    </View>
  )
}

// ─── Threshold boxes ──────────────────────────────────────────────────────────
function ThresholdBoxes({
  lt1Watt, lt2Watt, lt1HR, lt2HR, bodyWeight, isSpeed,
}: {
  lt1Watt: number | null
  lt2Watt: number | null
  lt1HR:   number | null
  lt2HR:   number | null
  bodyWeight: number | null
  isSpeed?: boolean
}) {
  const unit = isSpeed ? 'km/h' : 'Watt'
  return (
    <View style={s.boxRow}>
      <View style={[s.threshBox, s.threshBoxGreen]}>
        <Text style={s.threshTitle}>AT</Text>
        <Text style={s.threshSubtitle}>Aerob tröskel — 2.0 mmol</Text>
        <Text style={s.threshValue}>{fmt(lt1Watt)}</Text>
        <Text style={s.threshUnit}>{unit}</Text>
        <View style={s.threshDivider} />
        {!isSpeed && (
          <View style={s.threshStatRow}>
            <Text style={s.threshStatLabel}>Effekt/kg</Text>
            <Text style={s.threshStatValue}>{fmtWkg(lt1Watt, bodyWeight)}</Text>
          </View>
        )}
        <View style={s.threshStatRow}>
          <Text style={s.threshStatLabel}>Puls vid AT</Text>
          <Text style={s.threshStatValue}>{lt1HR ? `${lt1HR} bpm` : '—'}</Text>
        </View>
      </View>
      <View style={[s.threshBox, s.threshBoxPurple]}>
        <Text style={s.threshTitle}>LT</Text>
        <Text style={s.threshSubtitle}>Anaerob tröskel — FTP / MLSS 4.0 mmol</Text>
        <Text style={s.threshValue}>{fmt(lt2Watt)}</Text>
        <Text style={s.threshUnit}>{unit}</Text>
        <View style={s.threshDivider} />
        {!isSpeed && (
          <View style={s.threshStatRow}>
            <Text style={s.threshStatLabel}>Effekt/kg</Text>
            <Text style={s.threshStatValue}>{fmtWkg(lt2Watt, bodyWeight)}</Text>
          </View>
        )}
        <View style={s.threshStatRow}>
          <Text style={s.threshStatLabel}>Puls vid LT</Text>
          <Text style={s.threshStatValue}>{lt2HR ? `${lt2HR} bpm` : '—'}</Text>
        </View>
      </View>
    </View>
  )
}

// ─── Nine-zone intensity table (Aktivitus model) ─────────────────────────────
function NineZoneTable({
  atHR, ltHR, maxHR, atWatt, ltWatt, isSpeed,
}: {
  atHR: number | null; ltHR: number | null; maxHR: number | null
  atWatt: number | null; ltWatt: number | null; isSpeed?: boolean
}) {
  const zones = calculateNineZones({ atHR, ltHR, maxHR, atWatt, ltWatt, isSpeed })
  const hasHR   = atHR != null || ltHR != null || maxHR != null
  const hasWatt = atWatt != null || ltWatt != null
  if (!hasHR && !hasWatt) return null

  return (
    <View>
      <View style={[s.zoneRow, s.zoneRowHead]}>
        <Text style={[s.zoneName, { color: C.slate400, fontSize: 6.5, letterSpacing: 1 }]}>INTENSITETSZON</Text>
        {hasHR   && <Text style={[s.zoneHeadText, { letterSpacing: 1 }]}>PULS</Text>}
        {hasWatt && <Text style={[s.zoneHeadText, { letterSpacing: 1 }]}>{isSpeed ? 'FART' : 'EFFEKT'}</Text>}
      </View>
      {[...zones].reverse().map((z) => {
        const txtColor = z.textColor === 'white' ? C.white : C.slate800
        return (
          <View key={z.id} style={[s.zoneRow, { backgroundColor: z.color, marginBottom: 1 }]}>
            <Text style={[s.zoneName, { color: txtColor }]}>{z.label}</Text>
            {hasHR   && <Text style={[s.zoneVal, { color: txtColor }]}>{z.hrRange ?? '—'}</Text>}
            {hasWatt && <Text style={[s.zoneVal, { color: txtColor }]}>{z.wattRange ?? '—'}</Text>}
          </View>
        )
      })}
    </View>
  )
}

// ─── Knowledge pages ──────────────────────────────────────────────────────────
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
  const isCykel = sport === 'cykel'
  return (
    <Page size="A4" style={s.page}>
      <PageHeader
        athleteName={athleteName} testDate={testDate} sport={sport} testType={testType}
        subtitle="Bakgrundsinformation" coachName={coachName}
        testLeader={testLeader} coachAvatarUrl={coachAvatarUrl}
      />

      <View style={s.box}>
        <Text style={s.kwTitle}>Dina laktattrösklar</Text>
        <Text style={[s.kwLead, { marginBottom: 8 }]}>Vad ditt test mäter — och hur du använder resultaten i din träning</Text>
        <View style={s.kwDivider} />

        <Text style={s.kwBody}>
          Till vänster finner du dina uppmätta trösklar, Aerob (AT) respektive Anaerob tröskel (LT). Dina individuellt uppmätta trösklar ger dig dina övergripande intensitetszoner i 3-zonsskalan — låg-, medel- respektive högintensiv pulszon. För mer detaljerad intensitetsindelning se nedan.
        </Text>

        <Text style={[s.kwHeading, { marginTop: 8 }]}>Aerob tröskel (AT) — FatMax</Text>
        <Text style={s.kwBody}>
          Den första fysiologiska tröskeln bestäms där blodlaktatet ökar väsentligt från basnivå. Denna förändring markerar vid vilken intensitet som fettförbränningen börjar avta och därmed påverkar uthållighet på sub-maximal arbetsintensitet. Vid högre intensitet påverkas möjlig träningstid starkt av tillgången på kolhydrater medan fettförbränningen i sammanhanget utgör en obegränsad resurs. Detta är därmed en lämplig intensitet för långdistansträning.
        </Text>

        <Text style={[s.kwHeading, { marginTop: 8 }]}>Anaerob tröskel (LT) — FTP / MLSS</Text>
        <Text style={s.kwBody}>
          Den andra fysiologiska tröskeln markerar den högsta möjliga intensiteten där kroppen arbetar med tillgång av syre och där bildningen av mjölksyra inte överstiger vad kroppen kan ta hand om och jämnvikt råder. Vid AT-intensitet kan musklerna arbeta under lång tid förutsatt att kolhydrater finns som bränsle och din prestationsförmåga vid tränings- och tävlingstider över 30 minuter styrs i hög grad av din AT.
        </Text>

        <View style={[s.kwDivider, { marginTop: 10 }]} />
        <Text style={[s.sectionLabel, { marginTop: 8 }]}>TRÄNINGSINTENSITETSZONER</Text>
        <Text style={[s.kwBody, { marginBottom: 8 }]}>
          I din träningsklocka använder du Zon 1 till Zon 5. Z4- och Z4+ utgör tillsammans Zon 4. Förtydligande av respektive zon finner du i Aktivitus kompendium för passbeskrivningar. Är du intresserad av coaching och detaljerat individuellt anpassat träningsprogram? — se www.aktivitus.se/membership
        </Text>

        <View style={s.kwBulletRow}>
          <View style={[s.kwDot, { backgroundColor: '#1d4ed8' }]} />
          <Text style={s.kwBulletText}>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>Lågintensiv (Z1–Z3, under AT) — </Text>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>Vad: </Text>
            {'Träning i bekvämt tempo, något ansträngande. Här kan du träna >180 minuter. Trötthet kommer av arbetstid snarare än intensitet. '}
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>Träningseffekt: </Text>
            Bra effekt på anpassning av muskler, senor, leder och skelett till långvarigt arbete samt för generell uthållighet och fettförbränning. Lågintensiv träning behövs för att balansera mot den högintensiva träningen och kan genomföras som längre distanspass och kortare återhämtningspass.
          </Text>
        </View>
        <View style={s.kwBulletRow}>
          <View style={[s.kwDot, { backgroundColor: '#059669' }]} />
          <Text style={s.kwBulletText}>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>Medelintensiv (Z4–Z6, AT–LT) — </Text>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>Vad: </Text>
            {'Hård träning i jämn fart i långa intervaller eller som kontinuerligt arbete i 30–180 minuter beroende på intensitet. Denna träning är ansträngande till mycket ansträngande och det är i denna zon du kan prestera under längre tävlings- och träningspass. '}
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>Träningseffekt: </Text>
            Övre delen av den medelintensiva zonen ger tillvänjning och träningseffekt i din tävlingsfart. Detta är mycket värdefullt. Träning i den nedre delen av zonen innebär ofta en för hög belastning för att träna uthållighet, och en för låg belastning för att träna i tävlingsfart. Tiden för återhämtning är i regel kortare än för träning i den högintensiva zonen.
          </Text>
        </View>
        <View style={s.kwBulletRow}>
          <View style={[s.kwDot, { backgroundColor: '#dc2626' }]} />
          <Text style={s.kwBulletText}>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>Högintensiv (Z7–Z8, över LT) — </Text>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>Vad: </Text>
            {'Intervallträning bestående av kortare perioder av träning (maximalt ca 8 minuter) ovanför AT. Träningen i denna zon är mycket till maximalt ansträngande. Ett effektivt intervallpass kan bestå av 15–40 minuter effektiv intervalltid, viloperioder borträknade. '}
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>Träningseffekt: </Text>
            Mycket hög träningseffekt på syreupptagningsförmåga men relativt lång återhämtningstid.
          </Text>
        </View>

        <View style={[s.kwDivider, { marginTop: 8, marginBottom: 6 }]} />
        <Text style={{ fontSize: 7.5, color: C.slate500, lineHeight: 1.5 }}>
          *MAX Acceleration/Sprint. **Anaeroba/explosiva zoner. Om du genomfört Wingatetest kommer dessa zoner att vara bra anpassade för dig. Om du inte genomförde Wingatetestet ska du se zonindelningen för Z6–Z8 som riktvärden.
        </Text>

        {isCykel && (
          <>
            <View style={[s.kwDivider, { marginTop: 8, marginBottom: 6 }]} />
            <Text style={{ fontSize: 7.5, color: C.slate500, lineHeight: 1.5 }}>
              <Text style={{ fontFamily: 'Helvetica-Bold', color: C.slate600 }}>Watt-notering (Monark): </Text>
              Nedan finner du dina intensitetszoner med watt och puls. När du blir bättre kommer din uteffekt att öka. När ett pass eller en belastning i watt känns lättare än vanligt och pulsen är låg är det dags att öka med 5–10 W över hela intensitetsskalan. Dina watt är uppmätta i drivhjulet på en Monark. Pga transmissionsförlust i kedja och drev får du lägga på 4 % för att dina uppmätta watt ska motsvara watt uppmätta i pedal, trainer, vevarm eller vevparti. Beroende på wattmätare kan ibland diffen vara än större.
            </Text>
          </>
        )}

        <View style={[s.kwDivider, { marginTop: 10, marginBottom: 4 }]} />
        <Text style={[s.kwHeading, { marginTop: 0 }]}>Nästa steg</Text>
        <Text style={s.kwBody}>
          Diskutera gärna dina träningszoner, upplägg och mål med din coach. Testet rekommenderas upprepas var 3–6 månad för att följa din utveckling och justera träningen efter aktuell form. Välkommen tillbaka!
        </Text>
      </View>

      <PageFooter />
    </Page>
  )
}

function VO2KnowledgePage({
  athleteName, testDate, sport, testType, coachName, testLeader, coachAvatarUrl, gender,
}: {
  athleteName: string; testDate: string; sport: string; testType: string
  coachName?: string; testLeader?: string; coachAvatarUrl?: string
  gender?: 'M' | 'K' | ''
}) {
  return (
    <Page size="A4" style={s.page}>
      <PageHeader
        athleteName={athleteName} testDate={testDate} sport={sport} testType={testType}
        subtitle="Om ditt VO₂max" coachName={coachName}
        testLeader={testLeader} coachAvatarUrl={coachAvatarUrl}
      />

      <View style={s.box}>
        <Text style={s.kwTitle}>Syreupptagningsförmåga</Text>
        <Text style={[s.kwLead, { marginBottom: 8 }]}>Vad VO₂max-testet mäter — och vad ditt resultat innebär</Text>
        <View style={s.kwDivider} />

        <Text style={s.kwBody}>
          Vid test av VO₂max mäts den maximala mängd syre som kroppen kan använda vid aerob förbränning. Vid VO₂max är de anaeroba energiprocesserna också i full gång och den effekt eller löpfart som nås vid VO₂max är därför högre än vad som teoretiskt krävs för att motsvara den aeroba förbränningen.
        </Text>
        <Text style={[s.kwBody, { marginTop: 6 }]}>
          Maximal syreupptagningsförmåga anges ofta som absolut kapacitet (l/min), men då de flesta uthållighetsidrotter innebär uppbärande av den egna kroppsvikten används ofta ett relativt värde, det så kallade testvärdet (ml/kg·min⁻¹). Framgång inom uthållighetsidrott kräver i de flesta fall en hög maximal syreupptagningsförmåga och VO₂max för kvinnor och män tävlandes på elitnivå är oftast inom 60–75 respektive 65–85 ml/kg·min⁻¹.
        </Text>

        <Text style={[s.kwHeading, { marginTop: 8 }]}>Central kapacitet</Text>
        <Text style={s.kwBody}>
          Utgörs av hjärtats pumpförmåga samt blodets förmåga att transportera syre. Den centrala kapaciteten bestämmer till största del VO₂max.
        </Text>

        <Text style={[s.kwHeading, { marginTop: 8 }]}>Lokal kapacitet</Text>
        <Text style={s.kwBody}>
          Utgörs av hur syret tas upp och används vid energiomsättning i den arbetande muskulaturen. Musklerna har i regel en överkapacitet att använda syre och begränsar inte VO₂max vid helkroppsarbete. En hög lokal kapacitet medför därmed en god uthållighet.
        </Text>

        <View style={[s.kwDivider, { marginTop: 10 }]} />
        <Text style={[s.sectionLabel, { marginTop: 8 }]}>REFERENSVÄRDEN</Text>
        <Text style={[s.kwBody, { marginBottom: 4 }]}>Medelvärden för test av VO₂max på Aktivitus (alla åldrar):</Text>
        {(gender === 'K' || !gender) && (
          <View style={s.threshStatRow}>
            <Text style={{ fontSize: 8.5, color: C.slate600 }}>Kvinnor</Text>
            <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: C.slate800 }}>45 ml/kg</Text>
          </View>
        )}
        {(gender === 'M' || !gender) && (
          <View style={s.threshStatRow}>
            <Text style={{ fontSize: 8.5, color: C.slate600 }}>Män</Text>
            <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: C.slate800 }}>54 ml/kg</Text>
          </View>
        )}

        <View style={[s.kwDivider, { marginTop: 10, marginBottom: 4 }]} />
        <Text style={[s.kwHeading, { marginTop: 0 }]}>Nästa steg</Text>
        <Text style={s.kwBody}>
          Diskutera dina resultat och träningsupplägg med din coach. VO₂max-testet rekommenderas upprepas var 3–6 månad för att följa din konditionsutveckling. Välkommen tillbaka!
        </Text>
      </View>

      <PageFooter />
    </Page>
  )
}

// ─── Main document ────────────────────────────────────────────────────────────
export function AktivitusReport({
  test,
  athleteName,
  gender,
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
  const isSpeed   = isSpeedSport(test.sport)

  const lt1Watt  = isSpeed ? (ca?.atEffektSpeed  ?? r.atWatt) : (ca?.atEffektWatt  ?? r.atWatt)
  const lt2Watt  = isSpeed ? (ca?.ltEffektSpeed  ?? r.ltWatt) : (ca?.ltEffektWatt  ?? r.ltWatt)
  const lt1HR    = ca?.atPuls        ?? null
  const lt2HR    = ca?.ltPuls        ?? null
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
              estMaxHR={estMaxHR}
              isSpeed={isSpeed}
            />
          </View>
        )}

        {/* Threshold boxes + zone table — single box to ensure both fit on page 1 */}
        {isTroskel && (lt1Watt || lt2Watt || lt1HR || lt2HR) && (
          <View style={s.box}>
            <Text style={s.sectionLabel}>TRÖSKLAR</Text>
            <ThresholdBoxes
              lt1Watt={lt1Watt}
              lt2Watt={lt2Watt}
              lt1HR={lt1HR}
              lt2HR={lt2HR}
              bodyWeight={bw}
              isSpeed={isSpeed}
            />
            {(lt1HR || lt2HR || lt1Watt || lt2Watt) && (
              <View style={{ marginTop: 10 }}>
                <Text style={[s.sectionLabel, { marginBottom: 6 }]}>INTENSITETSZONER</Text>
                <NineZoneTable
                  atHR={lt1HR}
                  ltHR={lt2HR}
                  maxHR={estMaxHR}
                  atWatt={lt1Watt}
                  ltWatt={lt2Watt}
                  isSpeed={isSpeed}
                />
              </View>
            )}
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
                <View style={s.threshStatRow}>
                  <Text style={s.threshStatLabel}>Mean power</Text>
                  <Text style={s.threshStatValue}>{fmt(test.wingateData.meanPower, 'W')}</Text>
                </View>
                <View style={s.threshStatRow}>
                  <Text style={s.threshStatLabel}>Mean W/kg</Text>
                  <Text style={s.threshStatValue}>{fmtWkg(test.wingateData.meanPower, bw)}</Text>
                </View>
              </View>
              <View style={[s.threshBox, s.threshBoxPurple]}>
                <Text style={s.threshTitle}>POWER DROP</Text>
                <Text style={[s.threshValue, { fontSize: 32 }]}>
                  {test.wingateData.peakPower != null && test.wingateData.minPower != null
                    ? String(test.wingateData.peakPower - test.wingateData.minPower)
                    : '—'}
                </Text>
                <Text style={s.threshUnit}>Watt (tappat)</Text>
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
              <View style={[s.threshBox, s.threshBoxBlue]}>
                <Text style={s.threshTitle}>PROTOKOLL</Text>
                <Text style={s.threshSubtitle}>Wingate 30 sek</Text>
                <View style={s.threshDivider} />
                <View style={s.threshStatRow}>
                  <Text style={s.threshStatLabel}>Startkadence</Text>
                  <Text style={s.threshStatValue}>
                    {test.wingateInputParams?.startCadenceRpm != null
                      ? `${test.wingateInputParams.startCadenceRpm} rpm` : '—'}
                  </Text>
                </View>
                <View style={s.threshStatRow}>
                  <Text style={s.threshStatLabel}>Bromsbelastning</Text>
                  <Text style={s.threshStatValue}>
                    {test.wingateInputParams?.bodyWeightPercent != null
                      ? `${test.wingateInputParams.bodyWeightPercent} %` : '—'}
                  </Text>
                </View>
                <View style={s.threshStatRow}>
                  <Text style={s.threshStatLabel}>Kroppsvikt</Text>
                  <Text style={s.threshStatValue}>{fmt(bw, 'kg')}</Text>
                </View>
              </View>
            </View>
            <View style={{ marginTop: 12 }}>
              <Text style={[s.sectionLabel, { marginBottom: 6 }]}>EFFEKTUTVECKLING</Text>
              <WingateBarChart
                peakPower={test.wingateData.peakPower}
                meanPower={test.wingateData.meanPower}
                minPower={test.wingateData.minPower}
              />
            </View>
          </View>
        )}

        {/* Wingate inline explanations */}
        {isWingate && (
          <View style={s.box}>
            <Text style={s.sectionLabel}>OM DINA RESULTAT</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.green, marginBottom: 3 }}>
                  PEAK POWER
                </Text>
                <Text style={{ fontSize: 7.5, color: C.slate600, lineHeight: 1.5 }}>
                  Den högsta effekten under testet — din explosiva toppkapacitet, vanligtvis uppnådd inom de första 5–10 sekunderna.
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.purple, marginBottom: 3 }}>
                  POWER DROP
                </Text>
                <Text style={{ fontSize: 7.5, color: C.slate600, lineHeight: 1.5 }}>
                  {`Skillnaden mellan toppeffekt och lägsta effekt (Peak − Min). Mäter absolut trötthet. Lägre värde = bättre anaerob uthållighet.`}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.blue, marginBottom: 3 }}>
                  FATIGUE INDEX
                </Text>
                <Text style={{ fontSize: 7.5, color: C.slate600, lineHeight: 1.5 }}>
                  {`(Peak − Min) / Peak × 100. Relativ trötthet i %. Vältränade atleter: 30–50 %. Högt FI = explosiv profil. Lågt FI = uthållighetskapacitet.`}
                </Text>
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

        <PageFooter />
      </Page>

      {/* ── Page 2: Knowledge ────────────────────────────────────────────── */}
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
      {isVO2 && (
        <VO2KnowledgePage
          athleteName={athleteName}
          testDate={testDate}
          sport={test.sport}
          testType={test.testType}
          coachName={coachName}
          testLeader={test.testLeader}
          coachAvatarUrl={coachAvatarUrl}
          gender={gender}
        />
      )}
    </Document>
  )
}
