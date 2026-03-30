import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/session"
import { NavBar } from "@/components/nav-bar"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getSessionUser()
  if (!user) redirect("/login")

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F7]">
      <NavBar userName={user.email} role={user.role} />
      <main className="flex-1 w-full px-6 py-8">
        {children}
      </main>
    </div>
  )
}
