"use client"

import { useState, useEffect } from "react"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { getAthletes } from "@/lib/athletes"
import { Athlete } from "@/types"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { UserPlus } from "lucide-react"
import { AthletesTable, SerializedAthlete } from "@/components/athletes/athletes-table"

function PageSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="h-8 w-8 rounded-full border-2 border-[#0071BA] border-t-transparent animate-spin" />
    </div>
  )
}

export function AthletesClientPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      unsub()
      if (!user) return
      const data = await getAthletes()
      setAthletes(data)
      setLoading(false)
    })
    return unsub
  }, [])

  if (!mounted || loading) return <PageSpinner />

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
          status: a.status,
        }))} />
      )}
    </div>
  )
}
