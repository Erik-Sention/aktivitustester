// Uses Firebase client SDK (works in Node.js server context too)
import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
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
