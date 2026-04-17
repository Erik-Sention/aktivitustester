import { db } from '@/lib/firebase'
import { collection, addDoc, query, where, orderBy, getDocs, serverTimestamp } from 'firebase/firestore'

export type ConsentEventType = 'granted' | 'revoked' | 'renewed' | 'declined'

export interface ConsentEvent {
  id: string
  athleteId: string
  coachId: string
  coachDisplayName: string
  eventType: ConsentEventType
  timestamp: { seconds: number; nanoseconds: number }
  personnummer?: string
  gender?: string
  phone?: string
  mainCoach?: string
  email?: string
}

export async function createConsentEvent(data: Omit<ConsentEvent, 'id' | 'timestamp'>): Promise<void> {
  await addDoc(collection(db, 'consent_events'), {
    ...data,
    timestamp: serverTimestamp(),
  })
}

export async function getConsentEvents(athleteId: string): Promise<ConsentEvent[]> {
  const q = query(
    collection(db, 'consent_events'),
    where('athleteId', '==', athleteId),
    orderBy('timestamp', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as ConsentEvent))
}
