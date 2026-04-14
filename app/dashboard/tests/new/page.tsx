import { NewTestClient } from "./_new-test-client"

export default async function NewTestPage({
  searchParams,
}: {
  searchParams: Promise<{ athlete?: string; type?: string }>
}) {
  const { athlete: athleteId, type: defaultType } = await searchParams
  return <NewTestClient defaultAthleteId={athleteId} defaultTestType={defaultType} />
}
