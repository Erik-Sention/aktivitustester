import { TestDetailClient } from "./_test-detail-client"

export default async function TestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <TestDetailClient id={id} />
}
