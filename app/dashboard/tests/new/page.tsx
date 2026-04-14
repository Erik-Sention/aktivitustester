import { getAthletes } from "@/lib/athletes"
import { getSessionUser } from "@/lib/session"
import { redirect } from "next/navigation"
import { LiveRecordingView } from "@/components/tests/live-recording-view"

export default async function NewTestPage({
  searchParams,
}: {
  searchParams: Promise<{ athlete?: string; type?: string }>
}) {
  const user = await getSessionUser()
  if (!user) redirect("/login")

  const { athlete: athleteId, type: defaultType } = await searchParams
  const athletes = await getAthletes(user.clinicId || undefined)

  const athleteList = athletes.map((a) => ({
    id: a.id,
    firstName: a.firstName,
    lastName: a.lastName,
    currentWeight: a.currentWeight,
  }))

  return (
    <LiveRecordingView
      athletes={athleteList}
      defaultAthleteId={athleteId}
      defaultTestType={defaultType}
      defaultTestLeader={user.email}
      coachUid={user.uid}
    />
  )
}
