import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import { Athlete, AthleteInput } from '@/types'

const COL = 'athletes'

export async function getAthletes(clinicId?: string): Promise<Athlete[]> {
  const col = adminDb.collection(COL)
  const q = clinicId
    ? col.where('clinicId', '==', clinicId).orderBy('createdAt', 'desc')
    : col.orderBy('createdAt', 'desc')
  const snap = await q.get()
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Athlete))
}

export async function getAthlete(id: string): Promise<Athlete | null> {
  const snap = await adminDb.collection(COL).doc(id).get()
  if (!snap.exists) return null
  return { id: snap.id, ...snap.data() } as Athlete
}

export async function createAthlete(input: AthleteInput): Promise<string> {
  const ref = await adminDb.collection(COL).add({
    ...input,
    createdAt: FieldValue.serverTimestamp(),
  })
  return ref.id
}

export async function updateAthlete(id: string, input: Partial<AthleteInput>): Promise<void> {
  await adminDb.collection(COL).doc(id).update(input as Record<string, unknown>)
}

export async function deleteAthlete(id: string): Promise<void> {
  await adminDb.collection(COL).doc(id).delete()
}
