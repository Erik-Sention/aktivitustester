"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/session"
import { createTest as createTestDb, updateTest as updateTestDb, archiveTest as archiveTestDb } from "@/lib/tests"
import { RawDataPoint, SportType, TestType, ProtocolType, ClinicLocation, SportSettings, CoachAssessment, WingateData, WingateInputParams } from "@/types"
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
  startSpeed?: number
  speedIncrement?: number
  incline?: number
  testDuration?: number
  bodyWeight?: number
  heightCm?: number
  notes?: string
  rawData: RawDataPoint[]
  vo2Max?: number
  vo2AbsoluteMlMin?: number | null
  settings?: SportSettings
  coachAssessment?: CoachAssessment
}) {
  const user = await requireSession()

  const id = await createTestDb({
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
      ...(data.startWatt !== undefined ? { startWatt: data.startWatt } : {}),
      ...(data.stepSize !== undefined ? { stepSize: data.stepSize } : {}),
      ...(data.startSpeed !== undefined ? { startSpeed: data.startSpeed } : {}),
      ...(data.speedIncrement !== undefined ? { speedIncrement: data.speedIncrement } : {}),
      ...(data.incline !== undefined ? { incline: data.incline } : {}),
      testDuration: data.testDuration ?? 0,
      bodyWeight: data.bodyWeight ?? null,
      heightCm: data.heightCm ?? null,
    },
    rawData: data.rawData,
    notes: data.notes || '',
    ...(data.settings ? { settings: data.settings } : {}),
    ...(data.coachAssessment ? { coachAssessment: data.coachAssessment } : {}),
  })

  const resultPatch: Record<string, unknown> = {}
  if (data.vo2Max) resultPatch['results.vo2Max'] = data.vo2Max
  if (data.vo2AbsoluteMlMin) resultPatch['results.vo2AbsoluteMlMin'] = data.vo2AbsoluteMlMin
  if (Object.keys(resultPatch).length > 0) {
    await updateDoc(doc(db, 'tests', id), resultPatch)
  }

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
    startSpeed?: number
    speedIncrement?: number
    incline?: number
    testDuration?: number
    bodyWeight?: number | null
    heightCm?: number | null
    coachAssessment?: CoachAssessment
    settings?: SportSettings
    wingateData?: WingateData
    wingateInputParams?: WingateInputParams
    vo2Max?: number | null
    vo2AbsoluteMlMin?: number | null
    maxHR?: number | null
    maxWatt?: number | null
  }
) {
  await requireSession()

  const hasInputParams = [
    data.startWatt, data.stepSize, data.startSpeed, data.speedIncrement,
    data.incline, data.testDuration, data.bodyWeight, data.heightCm,
  ].some((v) => v !== undefined)

  await updateTestDb(id, {
    testDate: Timestamp.fromDate(new Date(data.testDate)),
    notes: data.notes || '',
    rawData: data.rawData,
    ...(data.sport ? { sport: data.sport } : {}),
    ...(data.testType ? { testType: data.testType } : {}),
    ...(data.protocol ? { protocol: data.protocol } : {}),
    ...(data.testLocation ? { testLocation: data.testLocation } : {}),
    ...(data.testLeader !== undefined ? { testLeader: data.testLeader } : {}),
    ...(hasInputParams ? {
      inputParams: {
        ...(data.startWatt !== undefined ? { startWatt: data.startWatt } : {}),
        ...(data.stepSize !== undefined ? { stepSize: data.stepSize } : {}),
        ...(data.startSpeed !== undefined ? { startSpeed: data.startSpeed } : {}),
        ...(data.speedIncrement !== undefined ? { speedIncrement: data.speedIncrement } : {}),
        ...(data.incline !== undefined ? { incline: data.incline } : {}),
        testDuration: data.testDuration ?? 0,
        bodyWeight: data.bodyWeight ?? null,
        heightCm: data.heightCm ?? null,
      }
    } : {}),
    ...(data.coachAssessment ? { coachAssessment: data.coachAssessment } : {}),
    ...(data.settings ? { settings: data.settings } : {}),
    ...(data.wingateData ? { wingateData: data.wingateData } : {}),
    ...(data.wingateInputParams ? { wingateInputParams: data.wingateInputParams } : {}),
  }, data.vo2Max, data.vo2AbsoluteMlMin, data.maxHR, data.maxWatt)

  revalidatePath(`/dashboard/tests/${id}`)
  revalidatePath(`/dashboard/athletes/${athleteId}`)
  redirect(`/dashboard/tests/${id}`)
}

export async function createWingateTestAction(data: {
  athleteId: string
  testLocation: ClinicLocation
  testLeader: string
  testDate: string
  notes?: string
  wingateData: WingateData
  wingateInputParams: WingateInputParams
}) {
  const user = await requireSession()

  const id = await createTestDb({
    athleteId: data.athleteId,
    coachId: user.uid,
    clinicId: user.clinicId,
    testDate: Timestamp.fromDate(new Date(data.testDate)),
    sport: "cykel",
    testType: "wingate",
    protocol: "standard_3min",
    testLocation: data.testLocation,
    testLeader: data.testLeader,
    inputParams: { startWatt: 0, stepSize: 0, testDuration: 0, bodyWeight: data.wingateInputParams.bodyWeight, heightCm: null },
    rawData: [],
    notes: data.notes || '',
  })

  await updateDoc(doc(db, 'tests', id), {
    wingateData: data.wingateData,
    wingateInputParams: data.wingateInputParams,
  })

  revalidatePath(`/dashboard/athletes/${data.athleteId}`)
  redirect(`/dashboard/tests/${id}`)
}

export async function deleteTestAction(id: string, athleteId: string, reason: string) {
  const user = await requireSession()
  await archiveTestDb(id, user.uid, reason)
  revalidatePath(`/dashboard/athletes/${athleteId}`)
  redirect(`/dashboard/athletes/${athleteId}`)
}

export async function archiveTestAction(id: string, athleteId: string, reason: string) {
  const user = await requireSession()
  await archiveTestDb(id, user.uid, reason)
  revalidatePath(`/dashboard/athletes/${athleteId}`)
}

export async function updateCoachAssessmentAction(
  testId: string,
  athleteId: string,
  assessment: CoachAssessment
) {
  await requireSession()
  const normalized: CoachAssessment = {
    ...assessment,
    granLagMedel: assessment.ltEffektWatt,
    granLagMedelSpeed: assessment.ltEffektSpeed,
    granLagMedelPuls: assessment.ltPuls,
  }
  await updateDoc(doc(db, 'tests', testId), { coachAssessment: normalized })
  revalidatePath(`/dashboard/tests/${testId}`)
  revalidatePath(`/dashboard/athletes/${athleteId}`)
}

