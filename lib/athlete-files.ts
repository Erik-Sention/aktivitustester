import { adminDb } from './firebase-admin'
import { AthleteFile } from '@/types'
import { Timestamp } from 'firebase-admin/firestore'

export async function getAthleteFiles(athleteId: string): Promise<AthleteFile[]> {
  const snapshot = await adminDb
    .collection('athlete_files')
    .where('athleteId', '==', athleteId)
    .orderBy('testDate', 'desc')
    .get()

  return snapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      id: doc.id,
      athleteId: data.athleteId,
      clinicId: data.clinicId,
      coachId: data.coachId,
      resultType: data.resultType,
      testDate: data.testDate,
      testDateEnd: data.testDateEnd ?? undefined,
      fileName: data.fileName,
      storageUrl: data.storageUrl,
      createdAt: data.createdAt,
    } as AthleteFile
  })
}

export async function createAthleteFile(
  data: Omit<AthleteFile, 'id' | 'createdAt'>
): Promise<string> {
  const { testDateEnd, ...rest } = data
  const ref = await adminDb.collection('athlete_files').add({
    ...rest,
    ...(testDateEnd !== undefined && { testDateEnd }),
    createdAt: Timestamp.now(),
  })
  return ref.id
}

export async function deleteAthleteFile(fileId: string): Promise<void> {
  await adminDb.collection('athlete_files').doc(fileId).delete()
}

