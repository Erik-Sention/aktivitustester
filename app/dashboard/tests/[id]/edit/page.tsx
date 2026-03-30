import { notFound } from "next/navigation"
import { getTest } from "@/lib/tests"
import { getAthlete } from "@/lib/athletes"
import { fullName } from "@/lib/utils"
import { EditTestForm } from "./edit-form"

export default async function EditTestPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const test = await getTest(id)
  if (!test) notFound()

  const athlete = await getAthlete(test.athleteId)
  const testDateStr = new Date(test.testDate.seconds * 1000).toISOString().split("T")[0]

  return (
    <div className="space-y-6 py-6">
      <div>
        <h1 className="text-2xl font-bold">Redigera test</h1>
        {athlete && (
          <p className="text-sm text-slate-500 mt-0.5">{fullName(athlete.firstName, athlete.lastName)}</p>
        )}
      </div>
      <EditTestForm
        testId={test.id}
        athleteId={test.athleteId}
        testDate={testDateStr}
        notes={test.notes ?? ""}
        rawData={test.rawData}
      />
    </div>
  )
}
