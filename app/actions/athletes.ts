"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/session"
import { createAthlete, updateAthlete, deleteAthlete, declineAthlete, restoreDeclinedAthlete } from "@/lib/athletes"
import { getCoachProfileClient } from "@/lib/coach-profile"
import { createConsentEvent } from "@/lib/consent-events"
import { Timestamp } from "firebase/firestore"

async function coachDisplayName(uid: string, email: string): Promise<string> {
  try {
    const profile = await getCoachProfileClient(uid)
    return profile?.displayName || email
  } catch {
    return email
  }
}

async function requireSession() {
  const user = await getSessionUser()
  if (!user) redirect("/login")
  return user
}

export async function createAthleteAction(data: {
  firstName: string
  lastName: string
  personnummer?: string
  birthDate?: string
  gender?: string
  email?: string
  phone?: string
  currentWeight?: number
  height?: number
  mainCoach?: string
}) {
  const user = await requireSession()

  const id = await createAthlete({
    firstName: data.firstName,
    lastName: data.lastName,
    personnummer: data.personnummer || '',
    birthDate: data.birthDate ? Timestamp.fromDate(new Date(data.birthDate)) : null,
    gender: (data.gender as 'M' | 'K' | '') || '',
    email: data.email || '',
    phone: data.phone || '',
    currentWeight: data.currentWeight ?? null,
    height: data.height ?? null,
    mainCoach: data.mainCoach || '',
    clinicId: user.clinicId,
    createdBy: user.uid,
    status: 'Pending_Consent',
  })

  revalidatePath("/dashboard/athletes")
  redirect(`/dashboard/athletes/${id}`)
}

export async function updateAthleteAction(
  id: string,
  data: {
    firstName: string
    lastName: string
    personnummer?: string
    birthDate?: string
    gender?: string
    email?: string
    phone?: string
    currentWeight?: number
    height?: number
    mainCoach?: string
  }
) {
  await requireSession()

  await updateAthlete(id, {
    firstName: data.firstName,
    lastName: data.lastName,
    personnummer: data.personnummer || '',
    birthDate: data.birthDate ? Timestamp.fromDate(new Date(data.birthDate)) : null,
    gender: (data.gender as 'M' | 'K' | '') || '',
    email: data.email || '',
    phone: data.phone || '',
    currentWeight: data.currentWeight ?? null,
    height: data.height ?? null,
    mainCoach: data.mainCoach || '',
  })

  revalidatePath(`/dashboard/athletes/${id}`)
  redirect(`/dashboard/athletes/${id}`)
}

export async function deleteAthleteAction(id: string) {
  await requireSession()
  await deleteAthlete(id)
  revalidatePath("/dashboard/athletes")
  redirect("/dashboard/athletes")
}

export async function declineConsentAction(athleteId: string, archiveData?: Record<string, unknown>) {
  const user = await requireSession()
  await declineAthlete(athleteId, archiveData)
  await createConsentEvent({
    athleteId,
    coachId: user.uid,
    coachDisplayName: await coachDisplayName(user.uid, user.email),
    eventType: 'declined',
  })
  revalidatePath('/dashboard/athletes')
}

export async function revokeConsentAction(athleteId: string) {
  const user = await requireSession()
  await updateAthlete(athleteId, {
    status: 'Consent_Revoked',
    consentRevokedAt: Timestamp.now(),
  })
  await createConsentEvent({
    athleteId,
    coachId: user.uid,
    coachDisplayName: await coachDisplayName(user.uid, user.email),
    eventType: 'revoked',
  })
  revalidatePath(`/dashboard/athletes/${athleteId}`)
}

export async function renewConsentAction(athleteId: string) {
  const user = await requireSession()
  await updateAthlete(athleteId, {
    status: 'Active',
    consentAt: Timestamp.now(),
    consentVerifiedBy: user.uid,
  })
  await createConsentEvent({
    athleteId,
    coachId: user.uid,
    coachDisplayName: await coachDisplayName(user.uid, user.email),
    eventType: 'renewed',
  })
  revalidatePath(`/dashboard/athletes/${athleteId}`)
}

export async function grantConsentAction(
  athleteId: string,
  data: {
    personnummer: string
    gender: string
    phone: string
    mainCoach: string
    email?: string
  }
) {
  const user = await requireSession()
  await updateAthlete(athleteId, {
    status: 'Active',
    personnummer: data.personnummer,
    gender: (data.gender as 'M' | 'K' | '') || '',
    phone: data.phone || '',
    mainCoach: data.mainCoach || '',
    ...(data.email !== undefined ? { email: data.email } : {}),
    consentVerifiedBy: user.uid,
    consentAt: Timestamp.now(),
  })
  await createConsentEvent({
    athleteId,
    coachId: user.uid,
    coachDisplayName: await coachDisplayName(user.uid, user.email),
    eventType: 'granted',
    personnummer: data.personnummer,
    gender: data.gender || undefined,
    phone: data.phone || undefined,
    mainCoach: data.mainCoach || undefined,
    email: data.email || undefined,
  })
  revalidatePath(`/dashboard/athletes/${athleteId}`)
}

export async function restoreDeclinedAthleteAction(athleteId: string, data: Record<string, unknown>) {
  await requireSession()
  await restoreDeclinedAthlete(athleteId, data)
  revalidatePath('/dashboard/athletes')
}
