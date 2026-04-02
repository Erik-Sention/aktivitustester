import { db } from '@/lib/firebase'
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy, serverTimestamp } from 'firebase/firestore'
import { Test, TestInput, TestResults, RawDataPoint } from '@/types'
import { interpolateLactateThreshold, LT1_MMOL, LT2_MMOL } from '@/lib/calculations'

const COL = 'tests'

function calculateResults(rawData: RawDataPoint[]): TestResults {
  const valid = rawData.filter(p => p.lac > 0 && p.watt > 0)
  const atWatt = interpolateLactateThreshold(valid, LT1_MMOL)
  const ltWatt = interpolateLactateThreshold(valid, LT2_MMOL)
  const allActive = rawData.filter(p => p.watt > 0 && p.hr > 0)
  const maxHR = allActive.length > 0 ? Math.max(...allActive.map(p => p.hr)) : null
  const maxLactate = valid.length > 0 ? Math.max(...valid.map(p => p.lac)) : null
  return { vo2Max: null, atWatt, ltWatt, maxHR: maxHR || null, maxLactate: maxLactate || null }
}

export async function getTests(athleteId?: string): Promise<Test[]> {
  const col = collection(db, COL)
  const q = athleteId
    ? query(col, where('athleteId', '==', athleteId), orderBy('testDate', 'desc'))
    : query(col, orderBy('testDate', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Test))
}

export async function getTest(id: string): Promise<Test | null> {
  const snap = await getDoc(doc(db, COL, id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Test
}

export async function createTest(input: TestInput): Promise<string> {
  const results = calculateResults(input.rawData)
  const ref = await addDoc(collection(db, COL), {
    ...input,
    results,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateTest(id: string, input: Partial<TestInput>): Promise<void> {
  const update: Record<string, unknown> = { ...input }
  if (input.rawData) update.results = calculateResults(input.rawData)
  await updateDoc(doc(db, COL, id), update)
}

export async function deleteTest(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id))
}
