import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { interpolateLactateThreshold, LT1_MMOL, LT2_MMOL } from '@/lib/calculations'
import { RawDataPoint, TestInput } from '@/types'
import { getSessionUser } from '@/lib/session'

export async function POST(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: Omit<TestInput, 'coachId'> = await request.json()
  const rawData: RawDataPoint[] = body.rawData ?? []

  const atWatt = interpolateLactateThreshold(rawData, LT1_MMOL)
  const ltWatt = interpolateLactateThreshold(rawData, LT2_MMOL)
  const maxHR = rawData.length > 0
    ? Math.max(...rawData.map(p => p.hr).filter(Boolean))
    : null
  const maxLactate = rawData.length > 0
    ? Math.max(...rawData.map(p => p.lac).filter(Boolean))
    : null

  const testDoc = {
    ...body,
    coachId: user.uid,
    results: {
      vo2Max: null,
      atWatt,
      ltWatt,
      maxHR: maxHR || null,
      maxLactate: maxLactate || null,
    },
    createdAt: serverTimestamp(),
  }

  const ref = await addDoc(collection(db, 'tests'), testDoc)
  return NextResponse.json({ id: ref.id })
}
