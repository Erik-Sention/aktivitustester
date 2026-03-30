import { notFound } from "next/navigation"
import { getAthlete } from "@/lib/athletes"
import { AthleteForm } from "@/components/athletes/athlete-form"
import { fullName } from "@/lib/utils"

export default async function EditAthletePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const athlete = await getAthlete(id)
  if (!athlete) notFound()

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-2xl font-bold">
        Redigera — {fullName(athlete.firstName, athlete.lastName)}
      </h1>
      <AthleteForm
        existing={{
          id: athlete.id,
          firstName: athlete.firstName,
          lastName: athlete.lastName,
          personnummer: athlete.personnummer ?? "",
          birthDate: athlete.birthDate
            ? new Date(athlete.birthDate.seconds * 1000).toISOString().split("T")[0]
            : "",
          gender: athlete.gender,
          email: athlete.email,
          phone: athlete.phone,
          mainCoach: athlete.mainCoach ?? "",
        }}
      />
    </div>
  )
}
