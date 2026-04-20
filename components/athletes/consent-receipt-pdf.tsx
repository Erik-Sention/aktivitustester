import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'

const C = {
  blue:    '#1e40af',
  white:   '#ffffff',
  slate50: '#f8fafc',
  slate100:'#f1f5f9',
  slate200:'#e2e8f0',
  slate700:'#334155',
  slate800:'#1e293b',
  green:   '#059669',
  greenBg: '#d1fae5',
  red:     '#dc2626',
  redBg:   '#fee2e2',
  amber:   '#d97706',
  amberBg: '#fef3c7',
} as const

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    padding: 40,
    backgroundColor: C.slate50,
    fontSize: 10,
    color: C.slate800,
  },
  header: {
    backgroundColor: C.blue,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginBottom: 24,
  },
  headerLogo: {
    color: C.white,
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1,
  },
  headerSub: {
    color: '#bfdbfe',
    fontSize: 9,
    marginTop: 2,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: C.blue,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 9,
    color: '#64748b',
    marginBottom: 24,
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 24,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
  },
  table: {
    borderWidth: 1,
    borderColor: C.slate200,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: C.slate200,
  },
  rowLast: {
    flexDirection: 'row',
  },
  labelCell: {
    width: 160,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: C.slate100,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  valueCell: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 10,
    color: C.slate800,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    marginVertical: 14,
  },
  termsTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  termsBody: {
    fontSize: 9,
    color: '#475569',
    lineHeight: 1.6,
    marginBottom: 6,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  bullet: {
    width: 12,
    fontSize: 9,
    color: '#1e40af',
  },
  bulletText: {
    flex: 1,
    fontSize: 9,
    lineHeight: 1.6,
    color: '#475569',
  },
  note: {
    fontSize: 8,
    color: '#94a3b8',
    lineHeight: 1.5,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 8,
    color: '#94a3b8',
  },
})

export interface ConsentReceiptProps {
  athleteId: string
  athleteName: string
  athleteEmail?: string
  personnummer?: string
  eventType: 'granted' | 'revoked' | 'renewed' | 'declined'
  eventDate: string
  systemTimestamp: string
  coachDisplayName: string
}

const eventLabels: Record<string, string> = {
  granted:  'Samtycke bekräftat',
  renewed:  'Samtycke förnyat',
  revoked:  'Samtycke indraget',
  declined: 'Samtycke avböjt',
}

function badgeStyle(eventType: string): { bg: string; color: string } {
  if (eventType === 'granted' || eventType === 'renewed') return { bg: C.greenBg, color: C.green }
  if (eventType === 'revoked') return { bg: C.redBg, color: C.red }
  return { bg: C.amberBg, color: C.amber }
}

export function ConsentReceiptDocument({
  athleteId,
  athleteName,
  athleteEmail,
  personnummer,
  eventType,
  eventDate,
  systemTimestamp,
  coachDisplayName,
}: ConsentReceiptProps) {
  const badge = badgeStyle(eventType)
  const label = eventLabels[eventType] ?? eventType
  const generated = new Date().toLocaleDateString('sv-SE')

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.headerLogo}>AKTIVITUS</Text>
          <Text style={s.headerSub}>Samtyckesregistrering · Kvitto</Text>
        </View>

        <Text style={s.title}>Samtyckesregistrering</Text>
        <Text style={s.subtitle}>
          Detta dokument bekräftar att en samtyckeshändelse har registrerats i Aktivitus-systemet.
        </Text>

        <View style={[s.statusBadge, { backgroundColor: badge.bg }]}>
          <Text style={[s.statusText, { color: badge.color }]}>{label}</Text>
        </View>

        <View style={s.table}>
          <View style={s.row}>
            <Text style={s.labelCell}>Atlet</Text>
            <Text style={s.valueCell}>{athleteName}</Text>
          </View>
          {!!personnummer && (
            <View style={s.row}>
              <Text style={s.labelCell}>Personnummer</Text>
              <Text style={s.valueCell}>{personnummer}</Text>
            </View>
          )}
          {!!athleteEmail && (
            <View style={s.row}>
              <Text style={s.labelCell}>E-post</Text>
              <Text style={s.valueCell}>{athleteEmail}</Text>
            </View>
          )}
          <View style={s.row}>
            <Text style={s.labelCell}>Databas-ID</Text>
            <Text style={s.valueCell}>{athleteId}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.labelCell}>Händelse</Text>
            <Text style={s.valueCell}>{label}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.labelCell}>Datum</Text>
            <Text style={s.valueCell}>{eventDate}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.labelCell}>Registrerad av</Text>
            <Text style={s.valueCell}>{coachDisplayName}</Text>
          </View>
          <View style={s.rowLast}>
            <Text style={s.labelCell}>Systemtidsstämpel (UTC)</Text>
            <Text style={s.valueCell}>{systemTimestamp}</Text>
          </View>
        </View>

        <View style={s.divider} />

        <Text style={s.termsTitle}>Samtyckesvillkor som godkänts</Text>

        <Text style={s.termsBody}>
          Genom att lämna samtycke har ovanstående atlet godkänt att Aktivitus AB behandlar personuppgifter, inklusive hälsodata (testresultat, puls, laktatvärden m.m.), i syfte att:
        </Text>
        <View style={s.bulletRow}><Text style={s.bullet}>•</Text><Text style={s.bulletText}>Genomföra och dokumentera fysiologiska tester</Text></View>
        <View style={s.bulletRow}><Text style={s.bullet}>•</Text><Text style={s.bulletText}>Optimera träning och följa utveckling över tid</Text></View>
        <View style={[s.bulletRow, { marginBottom: 8 }]}><Text style={s.bullet}>•</Text><Text style={s.bulletText}>Skapa personliga träningsprogram och rapporter</Text></View>

        <Text style={s.termsBody}>
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>Lagring: </Text>
          Uppgifter lagras säkert så länge atleten är kund eller tills samtycke återkallas. Anonymiserad testdata kan lagras på obestämd tid efter avslutat kundförhållande.
        </Text>
        <Text style={s.termsBody}>
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>Rättigheter: </Text>
          Rätt att begära registerutdrag, rättelse, radering ("rätten att bli glömd") och begränsning av behandlingen.
        </Text>
        <Text style={[s.termsBody, { marginBottom: 0 }]}>
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>Återkallelse: </Text>
          Samtycke kan när som helst återkallas genom att kontakta sin coach.
        </Text>

        <Text style={s.note}>
          Detta kvitto är automatiskt genererat av Aktivitus och utgör ett intyg om att ovanstående samtyckeshändelse har registrerats i enlighet med GDPR (dataskyddsförordningen). Dokumentet ska behandlas konfidentiellt.
        </Text>

        <View style={s.footer}>
          <Text style={s.footerText}>Aktivitus AB · Samtyckeskvitto</Text>
          <Text style={s.footerText}>Genererat {generated}</Text>
        </View>
      </Page>
    </Document>
  )
}
