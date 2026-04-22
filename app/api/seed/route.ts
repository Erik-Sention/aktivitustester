import { NextResponse } from 'next/server'
import { getSessionUser, getSessionRefreshToken } from '@/lib/session'
import { exchangeRefreshToken, firestoreSet } from '@/lib/firestore-rest'

function randomId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  return Array.from({ length: 20 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Seed är inaktiverat i produktion' }, { status: 403 })
  }

  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const refreshToken = await getSessionRefreshToken()
  if (!refreshToken) {
    return NextResponse.json({ error: 'No refresh token' }, { status: 401 })
  }

  try {
    const idToken = await exchangeRefreshToken(refreshToken)
    const now = new Date()
    const clinicId = user.clinicId
    const coachId = user.uid

    function dt(date: string) { return new Date(date) }

    function wPt(min: number, watt: number, hr: number, lac: number, borg = 0, cadence = 0) {
      return { min, watt, hr, lac, borg, cadence }
    }
    function sPt(min: number, speed: number, hr: number, lac: number, borg = 0) {
      return { min, watt: 0, speed, hr, lac, borg, cadence: 0 }
    }

    // ─── Athletes ──────────────────────────────────────────────────────────────
    const a1 = randomId()
    const a2 = randomId()

    await Promise.all([
      firestoreSet('athletes', a1, {
        firstName: 'Anna', lastName: 'Lindgren',
        email: 'anna.lindgren@demo.se', phone: '070-111 22 33',
        gender: 'K', birthDate: dt('1992-06-15'), personnummer: '920615-1234',
        currentWeight: 62, height: 168,
        mainCoach: coachId, clinicId, createdBy: coachId,
        createdAt: now, status: 'Active', consentAt: now, consentVerifiedBy: coachId,
      }, idToken),
      firestoreSet('athletes', a2, {
        firstName: 'Erik', lastName: 'Johansson',
        email: 'erik.johansson@demo.se', phone: '073-444 55 66',
        gender: 'M', birthDate: dt('1988-03-22'), personnummer: '880322-5678',
        currentWeight: 78, height: 182,
        mainCoach: coachId, clinicId, createdBy: coachId,
        createdAt: now, status: 'Active', consentAt: now, consentVerifiedBy: coachId,
      }, idToken),
    ])

    // ─── Tests ─────────────────────────────────────────────────────────────────
    const base = (athleteId: string, date: string, sport: string, testType: string, protocol: string) => ({
      athleteId, coachId, clinicId,
      testDate: dt(date),
      sport, testType, protocol,
      testLocation: 'stockholm', testLeader: 'Demo Coach',
      notes: '', createdAt: now,
    })

    const testDefs: Record<string, unknown>[] = [
      // ── 1. Anna · Tröskeltest Cykel (mars 2024) ──────────────────────────────
      {
        ...base(a1, '2024-03-15', 'cykel', 'troskeltest', 'standard_3min'),
        inputParams: { startWatt: 100, stepSize: 20, testDuration: 3, bodyWeight: 62, heightCm: 168 },
        results: { vo2Max: null, atWatt: 167, ltWatt: 216, maxHR: 180, maxLactate: 6.1 },
        coachAssessment: {
          atEffektWatt: 165, ltEffektWatt: 215,
          granLagMedel: null, nedreGrans: null,
          atEffektSpeed: null, ltEffektSpeed: null, granLagMedelSpeed: null, nedreGransSpeed: null,
          estMaxPuls: 192, hogstaUpnaddPuls: 180,
          atPuls: 156, ltPuls: 170, granLagMedelPuls: null, nedreGransPuls: null,
        },
        rawData: [
          wPt(3,  100, 118, 1.1, 8,  88), wPt(6,  120, 128, 1.3, 10, 90),
          wPt(9,  140, 138, 1.6, 11, 91), wPt(12, 160, 148, 1.8, 12, 90),
          wPt(15, 180, 157, 2.4, 14, 89), wPt(18, 200, 165, 3.1, 15, 88),
          wPt(21, 220, 172, 4.2, 17, 87), wPt(24, 240, 180, 6.1, 19, 85),
        ],
      },

      // ── 2. Anna · Tröskeltest Cykel (sep 2024, förbättrad) ───────────────────
      {
        ...base(a1, '2024-09-05', 'cykel', 'troskeltest', 'standard_3min'),
        inputParams: { startWatt: 100, stepSize: 20, testDuration: 3, bodyWeight: 61, heightCm: 168 },
        results: { vo2Max: null, atWatt: 185, ltWatt: 233, maxHR: 183, maxLactate: 6.5 },
        coachAssessment: {
          atEffektWatt: 183, ltEffektWatt: 230,
          granLagMedel: null, nedreGrans: null,
          atEffektSpeed: null, ltEffektSpeed: null, granLagMedelSpeed: null, nedreGransSpeed: null,
          estMaxPuls: 192, hogstaUpnaddPuls: 183,
          atPuls: 152, ltPuls: 168, granLagMedelPuls: null, nedreGransPuls: null,
        },
        rawData: [
          wPt(3,  100, 115, 1.0, 8,  90), wPt(6,  120, 124, 1.2, 10, 91),
          wPt(9,  140, 134, 1.5, 11, 91), wPt(12, 160, 144, 1.7, 12, 90),
          wPt(15, 180, 153, 1.9, 13, 90), wPt(18, 200, 161, 2.3, 14, 89),
          wPt(21, 220, 169, 3.2, 16, 88), wPt(24, 240, 177, 4.4, 17, 87),
          wPt(27, 260, 183, 6.5, 19, 85),
        ],
      },

      // ── 3. Anna · Tröskeltest Cykel (jun 2024) ───────────────────────────────
      {
        ...base(a1, '2024-06-12', 'cykel', 'troskeltest', 'standard_3min'),
        inputParams: { startWatt: 100, stepSize: 20, testDuration: 3, bodyWeight: 62, heightCm: 168 },
        results: { vo2Max: null, atWatt: 172, ltWatt: 221, maxHR: 181, maxLactate: 5.8 },
        coachAssessment: {
          atEffektWatt: 170, ltEffektWatt: 220,
          granLagMedel: null, nedreGrans: null,
          atEffektSpeed: null, ltEffektSpeed: null, granLagMedelSpeed: null, nedreGransSpeed: null,
          estMaxPuls: 192, hogstaUpnaddPuls: 181,
          atPuls: 154, ltPuls: 169, granLagMedelPuls: null, nedreGransPuls: null,
        },
        rawData: [
          wPt(3,  100, 117, 1.0, 8,  89), wPt(6,  120, 126, 1.2, 10, 90),
          wPt(9,  140, 136, 1.5, 11, 91), wPt(12, 160, 146, 1.8, 12, 90),
          wPt(15, 180, 155, 2.1, 13, 89), wPt(18, 200, 163, 2.9, 15, 88),
          wPt(21, 220, 171, 3.9, 16, 87), wPt(24, 240, 181, 5.8, 19, 85),
        ],
      },

      // ── 4. Anna · VO₂max Cykel (jul 2024) ────────────────────────────────────
      {
        ...base(a1, '2024-07-08', 'cykel', 'vo2max', 'ramp_test'),
        inputParams: { startWatt: 100, stepSize: 20, testDuration: 1, bodyWeight: 62, heightCm: 168 },
        results: { vo2Max: 54, atWatt: null, ltWatt: null, maxHR: 183, maxLactate: null },
        rawData: [
          wPt(1, 100, 113, 0, 7, 91), wPt(2, 120, 121, 0, 0, 90),
          wPt(3, 140, 130, 0, 9, 90), wPt(4, 160, 139, 0, 0, 89),
          wPt(5, 180, 147, 0, 11, 89), wPt(6, 200, 155, 0, 0, 88),
          wPt(7, 220, 163, 0, 13, 88), wPt(8, 240, 170, 0, 0, 87),
          wPt(9, 260, 177, 0, 15, 86), wPt(10, 280, 183, 0, 17, 85),
        ],
      },

      // ── 5. Anna · VO₂max Cykel ───────────────────────────────────────────────
      {
        ...base(a1, '2024-10-05', 'cykel', 'vo2max', 'ramp_test'),
        inputParams: { startWatt: 100, stepSize: 20, testDuration: 1, bodyWeight: 62, heightCm: 168 },
        results: { vo2Max: 56, atWatt: null, ltWatt: null, maxHR: 184, maxLactate: null },
        rawData: [
          wPt(1, 100, 115, 0, 7, 90), wPt(2, 120, 123, 0, 0, 90),
          wPt(3, 140, 132, 0, 9, 90), wPt(4, 160, 141, 0, 0, 89),
          wPt(5, 180, 149, 0, 11, 89), wPt(6, 200, 157, 0, 0, 88),
          wPt(7, 220, 164, 0, 13, 88), wPt(8, 240, 171, 0, 0, 87),
          wPt(9, 260, 178, 0, 15, 87), wPt(10, 280, 184, 0, 17, 86),
        ],
      },

      // ── 6. Anna · Wingate ────────────────────────────────────────────────────
      {
        ...base(a1, '2024-11-14', 'cykel', 'wingate', 'standard_3min'),
        inputParams: { testDuration: 0, bodyWeight: 62, heightCm: 168 },
        results: { vo2Max: null, atWatt: null, ltWatt: null, maxHR: null, maxLactate: null },
        wingateData: { peakPower: 820, meanPower: 645, minPower: 490 },
        wingateInputParams: {
          bodyWeightPercent: 7.5, bodyWeight: 62,
          saddleVerticalMm: 690, saddleHorizontalMm: -5, startCadenceRpm: 110,
        },
        rawData: [],
      },

      // ── 7. Erik · Tröskeltest Löpning ────────────────────────────────────────
      {
        ...base(a2, '2024-04-10', 'lopning', 'troskeltest', 'standard_3min'),
        inputParams: { startSpeed: 8.0, speedIncrement: 1.0, incline: 1.0, testDuration: 3, bodyWeight: 78, heightCm: 182 },
        results: { vo2Max: null, atWatt: 11.0, ltWatt: 13.5, maxHR: 180, maxLactate: 6.3 },
        coachAssessment: {
          atEffektWatt: null, ltEffektWatt: null, granLagMedel: null, nedreGrans: null,
          atEffektSpeed: 11.0, ltEffektSpeed: 13.5, granLagMedelSpeed: 12.2, nedreGransSpeed: 10.0,
          estMaxPuls: 188, hogstaUpnaddPuls: 180,
          atPuls: 152, ltPuls: 168, granLagMedelPuls: 160, nedreGransPuls: 142,
        },
        rawData: [
          sPt(3,  8.0,  128, 1.2, 9),  sPt(6,  9.0,  137, 1.4, 11),
          sPt(9,  10.0, 145, 1.7, 12), sPt(12, 11.0, 154, 2.0, 13),
          sPt(15, 12.0, 162, 2.7, 15), sPt(18, 13.0, 169, 3.5, 16),
          sPt(21, 14.0, 175, 4.6, 18), sPt(24, 15.0, 180, 6.3, 20),
        ],
      },

      // ── 8. Erik · Tröskeltest Löpning (maj 2024) ─────────────────────────────
      {
        ...base(a2, '2024-05-20', 'lopning', 'troskeltest', 'standard_3min'),
        inputParams: { startSpeed: 8.0, speedIncrement: 1.0, incline: 1.0, testDuration: 3, bodyWeight: 78, heightCm: 182 },
        results: { vo2Max: null, atWatt: 10.5, ltWatt: 13.0, maxHR: 179, maxLactate: 6.0 },
        coachAssessment: {
          atEffektWatt: null, ltEffektWatt: null, granLagMedel: null, nedreGrans: null,
          atEffektSpeed: 10.5, ltEffektSpeed: 13.0, granLagMedelSpeed: 11.7, nedreGransSpeed: 9.5,
          estMaxPuls: 188, hogstaUpnaddPuls: 179,
          atPuls: 151, ltPuls: 167, granLagMedelPuls: 159, nedreGransPuls: 141,
        },
        rawData: [
          sPt(3,  8.0,  127, 1.2, 9),  sPt(6,  9.0,  136, 1.4, 11),
          sPt(9,  10.0, 144, 1.8, 12), sPt(12, 11.0, 153, 2.2, 14),
          sPt(15, 12.0, 161, 3.0, 15), sPt(18, 13.0, 168, 4.1, 17),
          sPt(21, 14.0, 174, 5.3, 18), sPt(24, 15.0, 179, 6.0, 20),
        ],
      },

      // ── 9. Erik · Tröskeltest Löpning (uppföljning sep 2024) ─────────────────
      {
        ...base(a2, '2024-09-18', 'lopning', 'troskeltest', 'standard_3min'),
        inputParams: { startSpeed: 8.0, speedIncrement: 1.0, incline: 1.0, testDuration: 3, bodyWeight: 77, heightCm: 182 },
        results: { vo2Max: null, atWatt: 11.8, ltWatt: 14.1, maxHR: 181, maxLactate: 5.9 },
        coachAssessment: {
          atEffektWatt: null, ltEffektWatt: null, granLagMedel: null, nedreGrans: null,
          atEffektSpeed: 11.8, ltEffektSpeed: 14.1, granLagMedelSpeed: 12.9, nedreGransSpeed: 10.5,
          estMaxPuls: 188, hogstaUpnaddPuls: 181,
          atPuls: 150, ltPuls: 166, granLagMedelPuls: 158, nedreGransPuls: 140,
        },
        rawData: [
          sPt(3,  8.0,  125, 1.1, 8),  sPt(6,  9.0,  134, 1.3, 10),
          sPt(9,  10.0, 143, 1.6, 11), sPt(12, 11.0, 151, 1.9, 12),
          sPt(15, 12.0, 159, 2.3, 14), sPt(18, 13.0, 166, 3.1, 15),
          sPt(21, 14.0, 172, 4.0, 17), sPt(24, 15.0, 178, 5.1, 19),
          sPt(27, 16.0, 181, 5.9, 20),
        ],
      },
    ]

    await Promise.all(testDefs.map((data) => firestoreSet('tests', randomId(), data, idToken)))

    return NextResponse.json({
      success: true,
      athletes: { anna: a1, erik: a2 },
      testsCreated: testDefs.length,
      message: `Skapade 2 atleter (Anna Lindgren, Erik Johansson) och ${testDefs.length} tester`,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Okänt fel'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
