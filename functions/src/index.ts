import { onSchedule } from "firebase-functions/v2/scheduler"
import { onDocumentUpdated } from "firebase-functions/v2/firestore"
import { initializeApp } from "firebase-admin/app"
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore"

initializeApp()

/**
 * Runs daily and deletes athlete profiles with status 'Pending_Consent'
 * that were created more than 7 days ago (GDPR data minimisation).
 */
export const cleanupPendingConsent = onSchedule("every 24 hours", async () => {
  const db = getFirestore()
  const sevenDaysAgo = Timestamp.fromDate(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  )

  const snapshot = await db
    .collection("athletes")
    .where("status", "==", "Pending_Consent")
    .where("createdAt", "<", sevenDaysAgo)
    .get()

  if (snapshot.empty) {
    console.log("No stale Pending_Consent athletes to delete.")
    return
  }

  const batch = db.batch()
  snapshot.docs.forEach((doc) => batch.delete(doc.ref))
  await batch.commit()

  console.log(`Deleted ${snapshot.size} stale Pending_Consent athlete(s).`)
})

export const clearAthleteArchiveFields = onDocumentUpdated("athletes/{id}", async (event) => {
  const before = event.data?.before.data()
  const after = event.data?.after.data()
  if (!before || !after) return
  if (before.isArchived === true && after.isArchived === false) {
    await event.data!.after.ref.update({
      archivedAt: FieldValue.delete(),
      archivedBy: FieldValue.delete(),
      archivedReason: FieldValue.delete(),
    })
  }
})

export const clearTestArchiveFields = onDocumentUpdated("tests/{id}", async (event) => {
  const before = event.data?.before.data()
  const after = event.data?.after.data()
  if (!before || !after) return
  if (before.isArchived === true && after.isArchived === false) {
    await event.data!.after.ref.update({
      archivedAt: FieldValue.delete(),
      archivedBy: FieldValue.delete(),
      archivedReason: FieldValue.delete(),
    })
  }
})
