import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore"
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

export async function getCoachProfilesClient(): Promise<CoachProfile[]> {
  const [usersSnap, profilesSnap] = await Promise.all([
    getDocs(collection(db, "users")),
    getDocs(collection(db, "coach_profiles")),
  ])
  const profileMap = new Map(profilesSnap.docs.map((d) => [d.id, d.data() as CoachProfile]))
  return usersSnap.docs.map((d) => {
    const userData = d.data()
    const profile = profileMap.get(d.id)
    return {
      uid: d.id,
      email: (userData.email as string) ?? '',
      displayName: profile?.displayName || (userData.email as string) || d.id,
      avatarUrl: profile?.avatarUrl ?? '',
    }
  })
}

export async function upsertCoachProfileClient(
  uid: string,
  data: Partial<Omit<CoachProfile, "uid">>
): Promise<void> {
  await setDoc(doc(db, "coach_profiles", uid), { ...data, uid }, { merge: true })
}
