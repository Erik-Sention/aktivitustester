import Link from "next/link"
import { getAthletes } from "@/lib/athletes"
import { getSessionUser } from "@/lib/session"
import { redirect } from "next/navigation"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { UserPlus } from "lucide-react"
import { AthletesTable, SerializedAthlete } from "@/components/athletes/athletes-table"

export default async function AthletesPage() {
  const user = await getSessionUser()
  if (!user) redirect("/login")

  const athletes = await getAthletes(user.clinicId || undefined)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">Atleter</h1>
        <Link href="/dashboard/athletes/new" className={cn(buttonVariants())}>
          <UserPlus className="h-4 w-4" />
          Ny atlet
        </Link>
      </div>

      {athletes.length === 0 ? (
        <div className="rounded-3xl border border-black/[0.05] bg-white shadow-apple p-12 text-center mt-8">
          <p className="text-lg font-semibold text-primary mb-1">Inga atleter än</p>
          <p className="text-base text-secondary mb-6">Lägg till din första atlet för att komma igång.</p>
          <Link href="/dashboard/athletes/new" className={cn(buttonVariants())}>
            <UserPlus className="h-4 w-4" /> Ny atlet
          </Link>
        </div>
      ) : (
        <AthletesTable athletes={athletes.map((a): SerializedAthlete => ({
          id: a.id,
          firstName: a.firstName,
          lastName: a.lastName,
          gender: a.gender,
          email: a.email,
          phone: a.phone,
          mainCoach: a.mainCoach,
          currentWeight: a.currentWeight,
        }))} />
      )}
    </div>
  )
}
