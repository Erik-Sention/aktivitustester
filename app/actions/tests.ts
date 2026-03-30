"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/session"
import { createTest, updateTest, deleteTest } from "@/lib/tests"
import { RawDataPoint, SportType, TestType, ProtocolType, ClinicLocation } from "@/types"
import { Timestamp } from "firebase/firestore"

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
  })

  // Allow caller to override vo2Max after auto-calculation
  if (data.vo2Max) {
    await updateTest(id, { results: { vo2Max: data.vo2Max, atWatt: null, ltWatt: null, maxHR: null, maxLactate: null } } as any)
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
    vo2Max?: number | null
  }
) {
  await requireSession()

  await updateTest(id, {
    testDate: Timestamp.fromDate(new Date(data.testDate)),
    notes: data.notes || '',
    rawData: data.rawData,
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
