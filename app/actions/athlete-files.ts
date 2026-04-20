"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/session"
import { createAthleteFile, deleteAthleteFile } from "@/lib/athlete-files"
import { db } from "@/lib/firebase"
import { doc, updateDoc, serverTimestamp } from "firebase/firestore"
import { Timestamp } from "firebase-admin/firestore"

async function requireSession() {
  const user = await getSessionUser()
  if (!user) redirect("/login")
  return user
}

export async function createAthleteFileAction(data: {
  athleteId: string
  resultType: string
  testDate: string
  testDateEnd?: string
  fileName: string
  storageUrl: string
}) {
  const user = await requireSession()

  const testDate = Timestamp.fromDate(new Date(data.testDate))
  const testDateEnd = data.testDateEnd ? Timestamp.fromDate(new Date(data.testDateEnd)) : undefined

  await createAthleteFile({
    athleteId: data.athleteId,
    clinicId: user.clinicId,
    coachId: user.uid,
    resultType: data.resultType,
    testDate,
    testDateEnd,
    fileName: data.fileName,
    storageUrl: data.storageUrl,
  })

  revalidatePath(`/dashboard/athletes/${data.athleteId}`)
}

export async function deleteAthleteFileAction(fileId: string, athleteId: string) {
  await requireSession()
  await deleteAthleteFile(fileId)
  revalidatePath(`/dashboard/athletes/${athleteId}`)
}

export async function archiveAthleteFilesAction(fileIds: string[], athleteId: string, reason: string) {
  const user = await requireSession()
  await Promise.all(
    fileIds.map((id) =>
      updateDoc(doc(db, "athlete_files", id), {
        isArchived: true,
        archivedAt: serverTimestamp(),
        archivedBy: user.uid,
        archivedReason: reason,
      })
    )
  )
  revalidatePath(`/dashboard/athletes/${athleteId}`)
}
