import { EditAthleteClient } from "./_edit-athlete-client"

export default async function EditAthletePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <EditAthleteClient id={id} />
}
