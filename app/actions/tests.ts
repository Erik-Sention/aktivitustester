"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/session"
import { createTest, updateTest, deleteTest } from "@/lib/tests"
import { RawDataPoint, SportType, TestType, ProtocolType, ClinicLocation, SportSettings, CoachAssessment } from "@/types"
import { Timestamp, doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

async function requireSession() {
  const user = await getSessionUser()
  if (!user) redirect("/login")
  return user
}

export async function createTestAction(data: {
  athleteId: string
  sport: SportType
  testType: TestType
  protocol: ProtocolType
  testLocation: ClinicLocation
  testLeader: string
  testDate: string
  startWatt?: number
  stepSize?: number
  testDuration?: number
  bodyWeight?: number
  heightCm?: number
  notes?: string
  rawData: RawDataPoint[]
  vo2Max?: number
  settings?: SportSettings
  coachAssessment?: CoachAssessment
}) {
  const user = await requireSession()

  const id = await createTest({
    athleteId: data.athleteId,
    coachId: user.uid,
    clinicId: user.clinicId,
    testDate: Timestamp.fromDate(new Date(data.testDate)),
    sport: data.sport,
    testType: data.testType,
    protocol: data.protocol,
    testLocation: data.testLocation,
    testLeader: data.testLeader,
    inputParams: {
      startWatt: data.startWatt ?? 0,
      stepSize: data.stepSize ?? 0,
      testDuration: data.testDuration ?? 0,
      bodyWeight: data.bodyWeight ?? null,
      heightCm: data.heightCm ?? null,
    },
    rawData: data.rawData,
    notes: data.notes || '',
    ...(data.settings ? { settings: data.settings } : {}),
    ...(data.coachAssessment ? { coachAssessment: data.coachAssessment } : {}),
  })

  // Patch only vo2Max so auto-calculated maxHR / maxLactate are preserved
  if (data.vo2Max) {
    await updateDoc(doc(db, 'tests', id), { 'results.vo2Max': data.vo2Max })
  }

  revalidatePath("/dashboard/tests")
  revalidatePath(`/dashboard/athletes/${data.athleteId}`)
  redirect(`/dashboard/tests/${id}`)
}

export async function updateTestAction(
  id: string,
  athleteId: string,
  data: {
    testDate: string
    notes?: string
    rawData: RawDataPoint[]
    sport?: SportType
    testType?: TestType
    protocol?: ProtocolType
    testLocation?: ClinicLocation
    testLeader?: string
    startWatt?: number
    stepSize?: number
    testDuration?: number
    bodyWeight?: number | null
    heightCm?: number | null
    coachAssessment?: CoachAssessment
    settings?: SportSettings
  }
) {
  await requireSession()

  await updateTest(id, {
    testDate: Timestamp.fromDate(new Date(data.testDate)),
    notes: data.notes || '',
    rawData: data.rawData,
    ...(data.sport ? { sport: data.sport } : {}),
    ...(data.testType ? { testType: data.testType } : {}),
    ...(data.protocol ? { protocol: data.protocol } : {}),
    ...(data.testLocation ? { testLocation: data.testLocation } : {}),
    ...(data.testLeader !== undefined ? { testLeader: data.testLeader } : {}),
    ...(data.startWatt !== undefined || data.stepSize !== undefined || data.testDuration !== undefined || data.bodyWeight !== undefined || data.heightCm !== undefined ? {
      inputParams: {
        startWatt: data.startWatt ?? 0,
        stepSize: data.stepSize ?? 0,
        testDuration: data.testDuration ?? 0,
        bodyWeight: data.bodyWeight ?? null,
        heightCm: data.heightCm ?? null,
      }
    } : {}),
    ...(data.coachAssessment ? { coachAssessment: data.coachAssessment } : {}),
    ...(data.settings ? { settings: data.settings } : {}),
  })

  revalidatePath("/dashboard/tests")
  revalidatePath(`/dashboard/tests/${id}`)
  revalidatePath(`/dashboard/athletes/${athleteId}`)
  redirect(`/dashboard/tests/${id}`)
}

export async function deleteTestAction(id: string, athleteId: string) {
  await requireSession()
  await deleteTest(id)
  revalidatePath("/dashboard/tests")
  revalidatePath(`/dashboard/athletes/${athleteId}`)
  redirect(`/dashboard/athletes/${athleteId}`)
}

export async function updateCoachAssessmentAction(
  testId: string,
  athleteId: string,
  assessment: CoachAssessment
) {
  await requireSession()
  await updateDoc(doc(db, 'tests', testId), { coachAssessment: assessment })
  revalidatePath(`/dashboard/tests/${testId}`)
  revalidatePath(`/dashboard/athletes/${athleteId}`)
}
