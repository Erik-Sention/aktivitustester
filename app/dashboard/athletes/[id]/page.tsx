import { AthleteDetailClient } from "./_athlete-detail-client"

export default async function AthleteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <AthleteDetailClient id={id} />
}
