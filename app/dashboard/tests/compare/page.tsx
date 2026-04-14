import { notFound } from "next/navigation"
import { CompareClient } from "./_compare-client"

export default async function CompareTestsPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>
}) {
  const { ids } = await searchParams
  const idList = (ids ?? "").split(",").map((s) => s.trim()).filter(Boolean)
  if (idList.length < 2) notFound()
  return <CompareClient idList={idList} />
}
