import {
  Document,
  Page,
  View,
  Text,
  Svg,
  Line,
  Polyline,
  Circle,
  Rect,
  G,
  StyleSheet,
} from '@react-pdf/renderer'
import type { RawDataPoint } from '@/types'
import type { SerializedTest } from './report-download-button'

// ─── Brand colours ────────────────────────────────────────────────────────────
const C = {
  blue:     '#1d4ed8',
  blueLight:'#bfdbfe',
  green:    '#15803d',
  greenBg:  '#dcfce7',
  purple:   '#6d28d9',
  purpleBg: '#ede9fe',
  slate50:  '#f8fafc',
  slate100: '#f1f5f9',
  slate200: '#e2e8f0',
  slate400: '#94a3b8',
  slate600: '#475569',
  slate800: '#1e293b',
  white:    '#ffffff',
  red:      '#dc2626',
  amber:    '#d97706',
  lacBlue:  '#2563eb',
  refLine:  '#93c5fd',
} as const

// A4: 595.28 × 841.89 pt | 15 mm margins → 42.52 pt
const MM15 = 42.52
const CONTENT_W = 510  // 595.28 - 2*42.52 ≈ 510

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    paddingTop: MM15,
    paddingBottom: MM15,
    paddingLeft: MM15,
    paddingRight: MM15,
    backgroundColor: C.slate50,
  },

  // Header
  header: {
    backgroundColor: C.blue,
    borderRadius: 10,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerLogo: {
    color: C.white,
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1,
  },
  headerTagline: {
    color: C.blueLight,
    fontSize: 7,
    marginTop: 3,
  },
  headerName: {
    color: C.white,
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
  },
  headerMeta: {
    color: C.blueLight,
    fontSize: 8,
    marginTop: 3,
    textAlign: 'right',
  },

  // Hero cards
  heroRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  heroCard: {
    flex: 1,
    borderRadius: 12,
    padding: 18,
  },
  heroCardGreen: {
    backgroundColor: C.green,
  },
  heroCardPurple: {
    backgroundColor: C.purple,
  },
  heroCardBlue: {
    backgroundColor: C.blue,
  },
  heroLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.5,
    color: C.white,
    opacity: 0.75,
    marginBottom: 6,
  },
  heroValue: {
    fontSize: 38,
    fontFamily: 'Helvetica-Bold',
    color: C.white,
    lineHeight: 1,
  },
  heroUnit: {
    fontSize: 11,
    color: C.white,
    opacity: 0.65,
    marginTop: 5,
  },
  heroDivider: {
    height: 0.5,
    backgroundColor: C.white,
    opacity: 0.25,
    marginTop: 10,
    marginBottom: 8,
  },
  heroStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  heroStatLabel: { fontSize: 8, color: C.white, opacity: 0.65 },
  heroStatValue: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.white },

  // Section box (chart, notes)
  box: {
    backgroundColor: C.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 2,
    color: C.slate400,
    marginBottom: 10,
  },
  notesText: {
    fontSize: 9,
    color: C.slate600,
    fontFamily: 'Helvetica-Oblique',
    lineHeight: 1.6,
  },

  // Table
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: C.blue,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 3,
  },
  tableHeaderCell: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: C.white,
    letterSpacing: 0.8,
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 3,
  },
  tableRowAlt: {
    backgroundColor: C.slate100,
  },
  tableCell: {
    fontSize: 9,
    color: C.slate800,
  },
  tableCellMono: {
    fontSize: 9,
    color: C.slate800,
    fontFamily: 'Helvetica',
  },
})

// ─── Column widths (fractions of table content width) ────────────────────────
const COL_W = {
  min:    0.10,
  watt:   0.20,
  puls:   0.18,
  laktat: 0.18,
  borg:   0.17,
  kadans: 0.17,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function sportLabel(sport: string) {
  const m: Record<string, string> = {
    cykel:       'Cykel',
    lopning:     'Lopning',
    skidor_band: 'Skidor (band)',
    skierg:      'Skierg',
    kajak:       'Kajak',
  }
  return m[sport] ?? sport
}
function testTypeLabel(type: string) {
  const m: Record<string, string> = {
    troskeltest: 'Troskeltest',
    vo2max:      'VO2 max-test',
    wingate:     'Wingate',
  }
  return m[type] ?? type
}
function fmt(v: number | null | undefined, unit = '') {
  return v != null ? `${v}${unit}` : '-'
}

// ─── SVG Performance Chart ────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const T = Text as any   // SVG <Text> accepts x/y/textAnchor etc.

function PerformanceChart({
  rawData,
  lt1W,
  lt2W,
}: {
  rawData: RawDataPoint[]
  lt1W: number | null
  lt2W: number | null
}) {
  const pts = rawData.filter(p => p.watt > 0)
  if (pts.length < 2) return null

  // Geometry ─────────────────────────────────────────────────────────────────
  const SVG_W = CONTENT_W - 32   // inside box padding 16 each side
  const SVG_H = 175
  const L = 36, R = 36, B = 28, TOP = 10
  const PW = SVG_W - L - R
  const PH = SVG_H - TOP - B
  const PX = L, PY = TOP
  const PX2 = PX + PW, PY2 = PY + PH

  // Scales ───────────────────────────────────────────────────────────────────
  const minW = Math.min(...pts.map(p => p.watt))
  const maxW = Math.max(...pts.map(p => p.watt))
  const maxLacRaw = Math.max(...pts.map(p => p.lac ?? 0))
  const maxHRRaw  = Math.max(...pts.filter(p => p.hr > 0).map(p => p.hr))
  const maxLacDom = Math.max(Math.ceil(maxLacRaw) + 1, 6)
  const maxHRDom  = Math.max(Math.ceil((maxHRRaw || 200) / 50) * 50 + 25, 200)

  const xS  = (w: number) => PX + ((w - minW) / (maxW - minW || 1)) * PW
  const lacY = (l: number) => PY2 - (l / maxLacDom) * PH
  const hrY  = (h: number) => PY2 - (h / maxHRDom)  * PH

  // Polyline points ──────────────────────────────────────────────────────────
  const lacPts = pts
    .filter(p => p.lac > 0)
    .map(p => `${xS(p.watt).toFixed(1)},${lacY(p.lac).toFixed(1)}`)
    .join(' ')

  const hrPts = pts
    .filter(p => p.hr > 0)
    .map(p => `${xS(p.watt).toFixed(1)},${hrY(p.hr).toFixed(1)}`)
    .join(' ')

  // Ticks ────────────────────────────────────────────────────────────────────
  const lacTicks = Array.from({ length: maxLacDom + 1 }, (_, i) => i)
  const hrTicks  = [0, 50, 100, 150, 200, 250].filter(h => hrY(h) >= PY && hrY(h) <= PY2 + 1)

  return (
    <Svg width={SVG_W} height={SVG_H}>
      {/* Plot background */}
      <Rect x={PX} y={PY} width={PW} height={PH} fill={C.slate50} />

      {/* Horizontal grid lines + lactate axis ticks */}
      {lacTicks.map(t => {
        const y = lacY(t)
        if (y < PY - 1 || y > PY2 + 1) return null
        return (
          <G key={`lg${t}`}>
            <Line x1={PX} y1={y} x2={PX2} y2={y} stroke={C.slate200} strokeWidth={0.5} />
            <T x={PX - 4} y={y + 3} fontSize={6.5} fill={C.lacBlue} textAnchor="end">{t}</T>
          </G>
        )
      })}

      {/* Reference lines at 2.0 and 4.0 mmol */}
      {([2, 4] as const).map(mmol => (
        <G key={`ref${mmol}`}>
          <Line x1={PX} y1={lacY(mmol)} x2={PX2} y2={lacY(mmol)}
            stroke={C.refLine} strokeWidth={1} strokeDasharray="4 3" />
          <T x={PX + 4} y={lacY(mmol) - 3} fontSize={6} fill={C.refLine}>
            {mmol}.0 mmol
          </T>
        </G>
      ))}

      {/* Vertical LT1 marker */}
      {lt1W != null && lt1W >= minW && lt1W <= maxW && (
        <G>
          <Line x1={xS(lt1W)} y1={PY} x2={xS(lt1W)} y2={PY2}
            stroke={C.green} strokeWidth={1.2} strokeDasharray="5 3" />
          <T x={xS(lt1W) + 3} y={PY + 8} fontSize={6.5} fill={C.green} fontFamily="Helvetica-Bold">
            LT1 {lt1W}W
          </T>
        </G>
      )}

      {/* Vertical LT2 marker */}
      {lt2W != null && lt2W >= minW && lt2W <= maxW && (
        <G>
          <Line x1={xS(lt2W)} y1={PY} x2={xS(lt2W)} y2={PY2}
            stroke={C.purple} strokeWidth={1.2} strokeDasharray="5 3" />
          <T x={xS(lt2W) + 3} y={PY + 8} fontSize={6.5} fill={C.purple} fontFamily="Helvetica-Bold">
            LT2 {lt2W}W
          </T>
        </G>
      )}

      {/* HR line + dots */}
      {hrPts.length > 0 && (
        <Polyline points={hrPts} stroke={C.red} strokeWidth={1.5} fill="none" />
      )}
      {pts.filter(p => p.hr > 0).map((p, i) => (
        <Circle key={`hd${i}`} cx={xS(p.watt)} cy={hrY(p.hr)} r={2.5} fill={C.red} />
      ))}

      {/* Lactate line + dots */}
      {lacPts.length > 0 && (
        <Polyline points={lacPts} stroke={C.lacBlue} strokeWidth={2} fill="none" />
      )}
      {pts.filter(p => p.lac > 0).map((p, i) => (
        <Circle key={`ld${i}`} cx={xS(p.watt)} cy={lacY(p.lac)} r={3} fill={C.lacBlue} />
      ))}

      {/* X axis line */}
      <Line x1={PX} y1={PY2} x2={PX2} y2={PY2} stroke={C.slate200} strokeWidth={0.5} />

      {/* X axis ticks + labels */}
      {pts.map((p, i) => (
        <G key={`xt${i}`}>
          <Line x1={xS(p.watt)} y1={PY2} x2={xS(p.watt)} y2={PY2 + 3}
            stroke={C.slate400} strokeWidth={0.5} />
          <T x={xS(p.watt)} y={PY2 + 11} fontSize={6.5} fill={C.slate400} textAnchor="middle">
            {p.watt}
          </T>
        </G>
      ))}

      {/* Y left axis border */}
      <Line x1={PX} y1={PY} x2={PX} y2={PY2} stroke={C.slate200} strokeWidth={0.5} />
      {/* Y right axis border */}
      <Line x1={PX2} y1={PY} x2={PX2} y2={PY2} stroke={C.slate200} strokeWidth={0.5} />

      {/* HR axis ticks (right side) */}
      {hrTicks.map(h => (
        <T key={`ht${h}`} x={PX2 + 4} y={hrY(h) + 3} fontSize={6.5} fill={C.red}>{h}</T>
      ))}

      {/* Axis unit labels */}
      <T x={6} y={PY + 7} fontSize={6.5} fill={C.lacBlue} fontFamily="Helvetica-Bold">mmol</T>
      <T x={SVG_W - 4} y={PY + 7} fontSize={6.5} fill={C.red} fontFamily="Helvetica-Bold" textAnchor="end">bpm</T>
      <T x={PX + PW / 2} y={SVG_H - 2} fontSize={6.5} fill={C.slate400} textAnchor="middle">Watt</T>

      {/* Legend */}
      <Circle cx={PX + 10} cy={SVG_H - 15} r={3} fill={C.red} />
      <T x={PX + 16} y={SVG_H - 12} fontSize={7} fill={C.slate600}>Puls</T>
      <Circle cx={PX + 44} cy={SVG_H - 15} r={3} fill={C.lacBlue} />
      <T x={PX + 50} y={SVG_H - 12} fontSize={7} fill={C.slate600}>Laktat</T>
      {lt1W != null && (
        <>
          <Line x1={PX + 84} y1={SVG_H - 16} x2={PX + 94} y2={SVG_H - 16}
            stroke={C.green} strokeWidth={1.5} strokeDasharray="4 2" />
          <T x={PX + 97} y={SVG_H - 12} fontSize={7} fill={C.slate600}>LT1</T>
        </>
      )}
      {lt2W != null && (
        <>
          <Line x1={PX + 116} y1={SVG_H - 16} x2={PX + 126} y2={SVG_H - 16}
            stroke={C.purple} strokeWidth={1.5} strokeDasharray="4 2" />
          <T x={PX + 129} y={SVG_H - 12} fontSize={7} fill={C.slate600}>LT2</T>
        </>
      )}
    </Svg>
  )
}

// ─── Page Header ──────────────────────────────────────────────────────────────
function PageHeader({
  athleteName,
  testDate,
  sport,
  testType,
  subtitle,
}: {
  athleteName: string
  testDate: string
  sport: string
  testType: string
  subtitle?: string
}) {
  return (
    <View style={s.header}>
      <View>
        <Text style={s.headerLogo}>AKTIVTUS</Text>
        <Text style={s.headerTagline}>
          {subtitle ?? 'Testrapport'}
        </Text>
      </View>
      <View>
        <Text style={s.headerName}>{athleteName}</Text>
        <Text style={s.headerMeta}>
          {testDate}{'   '}·{'   '}{sportLabel(sport)}{'   '}·{'   '}{testTypeLabel(testType)}
        </Text>
      </View>
    </View>
  )
}

// ─── Hero Card ────────────────────────────────────────────────────────────────
function HeroCard({
  label,
  value,
  unit,
  color,
  stats,
}: {
  label: string
  value: string
  unit: string
  color: 'green' | 'purple' | 'blue'
  stats?: { label: string; value: string }[]
}) {
  const cardStyle = color === 'green'
    ? s.heroCardGreen
    : color === 'purple'
    ? s.heroCardPurple
    : s.heroCardBlue

  return (
    <View style={[s.heroCard, cardStyle]}>
      <Text style={s.heroLabel}>{label}</Text>
      <Text style={s.heroValue}>{value}</Text>
      <Text style={s.heroUnit}>{unit}</Text>
      {stats && stats.length > 0 && (
        <>
          <View style={s.heroDivider} />
          {stats.map((st, i) => (
            <View key={i} style={s.heroStatRow}>
              <Text style={s.heroStatLabel}>{st.label}</Text>
              <Text style={s.heroStatValue}>{st.value}</Text>
            </View>
          ))}
        </>
      )}
    </View>
  )
}

// ─── Raw Data Table Row ───────────────────────────────────────────────────────
function TableRow({
  row,
  alt,
  totalW,
}: {
  row: RawDataPoint
  alt: boolean
  totalW: number
}) {
  const lacColor = row.lac >= 4 ? C.red : row.lac >= 2 ? C.amber : C.slate800

  return (
    <View style={[s.tableRow, alt ? s.tableRowAlt : {}]}>
      <Text style={[s.tableCell, { width: totalW * COL_W.min }]}>{row.min}</Text>
      <Text style={[s.tableCellMono, { width: totalW * COL_W.watt, textAlign: 'right' }]}>
        {row.watt || '-'}
      </Text>
      <Text style={[s.tableCellMono, { width: totalW * COL_W.puls, textAlign: 'right' }]}>
        {row.hr || '-'}
      </Text>
      <Text style={[s.tableCellMono, { width: totalW * COL_W.laktat, textAlign: 'right', color: lacColor }]}>
        {row.lac || '-'}
      </Text>
      <Text style={[s.tableCellMono, { width: totalW * COL_W.borg, textAlign: 'right' }]}>
        {row.borg || '-'}
      </Text>
      <Text style={[s.tableCellMono, { width: totalW * COL_W.kadans, textAlign: 'right' }]}>
        {row.cadence || '-'}
      </Text>
    </View>
  )
}

// ─── Main Document ────────────────────────────────────────────────────────────
export function AktivitusReport({
  test,
  athleteName,
}: {
  test: SerializedTest
  athleteName: string
}) {
  const r  = test.results
  const ip = test.inputParams
  const testDate = new Date(test.testDate.seconds * 1000).toLocaleDateString('sv-SE')

  const isVO2 = test.testType === 'vo2max'

  // Hero card content
  const card1 = isVO2
    ? {
        label:  'VO2 MAX',
        value:  fmt(r.vo2Max),
        unit:   'ml/kg/min',
        color:  'blue' as const,
        stats:  [
          { label: 'Max puls', value: fmt(r.maxHR, ' bpm') },
        ],
      }
    : {
        label:  'LT1 (AT) @ 2.0 MMOL',
        value:  fmt(r.atWatt),
        unit:   'Watt',
        color:  'green' as const,
        stats:  [
          { label: 'Max puls',   value: fmt(r.maxHR, ' bpm') },
          { label: 'Max laktat', value: fmt(r.maxLactate, ' mmol') },
        ],
      }

  const card2 = isVO2
    ? {
        label:  'MAX PULS',
        value:  fmt(r.maxHR),
        unit:   'bpm',
        color:  'purple' as const,
        stats:  [
          { label: 'Max laktat', value: fmt(r.maxLactate, ' mmol') },
        ],
      }
    : {
        label:  'LT2 (MLSS) @ 4.0 MMOL',
        value:  fmt(r.ltWatt),
        unit:   'Watt',
        color:  'purple' as const,
        stats:  [
          {
            label: 'Protokoll',
            value: (ip.startWatt ?? 0) > 0
              ? `${ip.startWatt}W +${ip.stepSize}W/${ip.testDuration}min`
              : '-',
          },
        ],
      }

  // Table column total width (content width minus box padding 16×2)
  const TABLE_W = CONTENT_W - 32

  return (
    <Document>
      {/* ── Page 1: Sammanfattning ─────────────────────────────────────── */}
      <Page size="A4" style={s.page}>
        <PageHeader
          athleteName={athleteName}
          testDate={testDate}
          sport={test.sport}
          testType={test.testType}
          subtitle="Sammanfattning"
        />

        {/* Hero cards */}
        <View style={s.heroRow}>
          <HeroCard {...card1} />
          <HeroCard {...card2} />
        </View>

        {/* Performance chart */}
        {test.rawData.length >= 2 && (
          <View style={s.box}>
            <Text style={s.sectionLabel}>PRESTANDAGRAF</Text>
            <PerformanceChart
              rawData={test.rawData}
              lt1W={r.atWatt}
              lt2W={r.ltWatt}
            />
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

      {/* ── Page 2: Protokoll / Rådata ─────────────────────────────────── */}
      {test.rawData.length > 0 && (
        <Page size="A4" style={s.page}>
          <PageHeader
            athleteName={athleteName}
            testDate={testDate}
            sport={test.sport}
            testType={test.testType}
            subtitle="Protokoll — Radata per steg"
          />

          <View style={s.box}>
            <Text style={s.sectionLabel}>RADATA PER STEG</Text>

            {/* Table header */}
            <View style={s.tableHeader}>
              {(
                [
                  ['Min',    COL_W.min,    'left'],
                  ['Watt',   COL_W.watt,   'right'],
                  ['Puls',   COL_W.puls,   'right'],
                  ['Laktat', COL_W.laktat, 'right'],
                  ['Borg',   COL_W.borg,   'right'],
                  ['Kadans', COL_W.kadans, 'right'],
                ] as [string, number, string][]
              ).map(([col, frac, align]) => (
                <Text
                  key={col}
                  style={[s.tableHeaderCell, { width: TABLE_W * frac, textAlign: align as 'left' | 'right' }]}
                >
                  {col}
                </Text>
              ))}
            </View>

            {/* Table rows */}
            {test.rawData.map((row, i) => (
              <TableRow key={i} row={row} alt={i % 2 === 1} totalW={TABLE_W} />
            ))}
          </View>
        </Page>
      )}
    </Document>
  )
}
