import { db } from '@/lib/firebase'
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, setDoc, query, where, orderBy, serverTimestamp } from 'firebase/firestore'
import { Athlete, AthleteInput } from '@/types'

const COL = 'athletes'

export async function getAthletes(clinicId?: string): Promise<Athlete[]> {
  const col = collection(db, COL)
  const q = clinicId
    ? query(col, where('clinicId', '==', clinicId), orderBy('createdAt', 'desc'))
    : query(col, orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Athlete))
}

export async function getAthlete(id: string): Promise<Athlete | null> {
  const snap = await getDoc(doc(db, COL, id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Athlete
}

export async function createAthlete(input: AthleteInput): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    ...input,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateAthlete(id: string, input: Partial<AthleteInput>): Promise<void> {
  await updateDoc(doc(db, COL, id), input as Record<string, unknown>)
}

export async function deleteAthlete(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id))
}

export async function getDeclinedAthletes(): Promise<Array<Record<string, unknown> & { id: string }>> {
  const snap = await getDocs(collection(db, 'declined_athletes'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function restoreDeclinedAthlete(id: string, data: Record<string, unknown>): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { declinedAt, ...athleteData } = data
  await setDoc(doc(db, COL, id), {
    ...athleteData,
    status: 'Pending_Consent',
    consentAt: null,
    consentRevokedAt: null,
    consentVerifiedBy: null,
  })
  await deleteDoc(doc(db, 'declined_athletes', id))
}

export async function declineAthlete(id: string, archiveData?: Record<string, unknown>): Promise<void> {
  if (archiveData) {
    await setDoc(doc(db, 'declined_athletes', id), {
      ...archiveData,
      declinedAt: serverTimestamp(),
    })
  }
  await deleteDoc(doc(db, COL, id))
}
