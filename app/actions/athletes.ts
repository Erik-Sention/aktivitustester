"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/session"
import { createAthlete, updateAthlete, deleteAthlete } from "@/lib/athletes"
import { Timestamp } from "firebase/firestore"

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
