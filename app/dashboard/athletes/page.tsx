import { getSessionUser } from "@/lib/session"
import { AthletesClientPage } from "./_athletes-client"

export default async function AthletesPage() {
  const user = await getSessionUser()
  return <AthletesClientPage userRole={user?.role} />
}
