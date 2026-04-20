import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'

const C = {
  blue:    '#1e40af',
  white:   '#ffffff',
  slate50: '#f8fafc',
  slate100:'#f1f5f9',
  slate200:'#e2e8f0',
  slate700:'#334155',
  slate800:'#1e293b',
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
    marginBottom: 20,
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
    marginBottom: 20,
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: C.slate800,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  body: {
    fontSize: 10,
    lineHeight: 1.6,
    color: C.slate700,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  bullet: {
    width: 14,
    fontSize: 10,
    color: C.blue,
  },
  bulletText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 1.6,
    color: C.slate700,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: C.slate200,
    marginVertical: 12,
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

function BulletItem({ text }: { text: string }) {
  return (
    <View style={s.bulletRow}>
      <Text style={s.bullet}>•</Text>
      <Text style={s.bulletText}>{text}</Text>
    </View>
  )
}

export function ConsentDocument() {
  const date = new Date().toLocaleDateString('sv-SE')
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.headerLogo}>AKTIVITUS</Text>
          <Text style={s.headerSub}>Samtyckesdokument · {date}</Text>
        </View>

        <Text style={s.title}>Samtycke till behandling av hälsouppgifter</Text>
        <Text style={s.subtitle}>Aktivitus AB · Gäller från och med att samtycke lämnas</Text>

        <View style={s.section}>
          <Text style={s.body}>
            Genom att lämna ditt samtycke godkänner du att Aktivitus AB behandlar dina personuppgifter, inklusive hälsodata (testresultat, puls, laktatvärden m.m.), i syfte att:
          </Text>
        </View>

        <View style={s.section}>
          <BulletItem text="Genomföra och dokumentera fysiologiska tester" />
          <BulletItem text="Optimera din träning och följa din utveckling över tid" />
          <BulletItem text="Skapa personliga träningsprogram och rapporter" />
        </View>

        <View style={s.divider} />

        <View style={s.section}>
          <Text style={s.sectionTitle}>Lagring av uppgifter</Text>
          <Text style={s.body}>
            Dina uppgifter lagras säkert i vårt system så länge du är kund hos oss eller tills du återkallar ditt samtycke. Vi förbehåller oss rätten att lagra testdata anonymiserat på obestämd tid efter avslutat kundförhållande.
          </Text>
        </View>

        <View style={s.divider} />

        <View style={s.section}>
          <Text style={s.sectionTitle}>Dina rättigheter</Text>
          <Text style={[s.body, { marginBottom: 6 }]}>
            Enligt GDPR (dataskyddsförordningen) har du rätt att:
          </Text>
          <BulletItem text="Begära utdrag av dina personuppgifter (registerutdrag)" />
          <BulletItem text="Begära rättelse av felaktiga uppgifter" />
          <BulletItem text={'Begära radering av dina uppgifter ("rätten att bli glömd")'} />
          <BulletItem text="Begära begränsning av behandlingen" />
          <BulletItem text="Invända mot behandlingen" />
        </View>

        <View style={s.divider} />

        <View style={s.section}>
          <Text style={s.sectionTitle}>Återkallelse av samtycke</Text>
          <Text style={s.body}>
            Du kan när som helst dra tillbaka ditt samtycke genom att kontakta din coach. Ett återkallande påverkar inte lagligheten av behandling som skett innan återkallelsen.
          </Text>
        </View>

        <View style={s.divider} />

        <View style={s.section}>
          <Text style={s.sectionTitle}>Personuppgiftsansvarig</Text>
          <Text style={s.body}>
            Aktivitus AB ansvarar för behandlingen av dina personuppgifter. Vid frågor, kontakta din coach eller Aktivitus kundtjänst.
          </Text>
        </View>

        <View style={s.footer}>
          <Text style={s.footerText}>Aktivitus AB · Samtyckesdokument</Text>
          <Text style={s.footerText}>Genererat {date}</Text>
        </View>
      </Page>
    </Document>
  )
}
