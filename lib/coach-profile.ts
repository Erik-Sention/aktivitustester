import { doc, getDoc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

export interface CoachProfile {
  uid: string
  email: string
  displayName: string
  avatarUrl: string
}

export async function getCoachProfileClient(uid: string): Promise<CoachProfile | null> {
  const snap = await getDoc(doc(db, "coach_profiles", uid))
  if (!snap.exists()) return null
  return snap.data() as CoachProfile
}

export async function upsertCoachProfileClient(
  uid: string,
  data: Partial<Omit<CoachProfile, "uid">>
): Promise<void> {
  await setDoc(doc(db, "coach_profiles", uid), { ...data, uid }, { merge: true })
}
