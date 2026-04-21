import { AthleteDetailClient } from "./_athlete-detail-client"
import { getSessionUser } from "@/lib/session"

export default async function AthleteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getSessionUser()
  return <AthleteDetailClient id={id} isAdmin={user?.role === 'ADMIN'} />
}
