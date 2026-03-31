"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { cn, fullName } from "@/lib/utils"

export interface SerializedAthlete {
  id: string
  firstName: string
  lastName: string
  gender: string
  email: string
  phone: string
  mainCoach?: string
  currentWeight: number | null
}

interface AthletesTableProps {
  athletes: SerializedAthlete[]
}

export function AthletesTable({ athletes }: AthletesTableProps) {
  const [query, setQuery] = useState("")
  const router = useRouter()

  const filtered = query.trim()
    ? athletes.filter((a) => {
        const q = query.trim().toLowerCase()
        return (
          fullName(a.firstName, a.lastName).toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q) ||
          a.phone.toLowerCase().includes(q) ||
          (a.mainCoach ?? "").toLowerCase().includes(q)
        )
      })
    : athletes

  return (
    <div className="space-y-3">
      <Input
        placeholder="Sök på namn, e-post, telefon eller coach…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-sm bg-white"
      />

      {filtered.length === 0 ? (
        <p className="text-secondary text-base">Inga atleter matchar sökningen.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[hsl(var(--border))] bg-white shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[hsl(var(--border))]/60 bg-[#F5F5F7]/50">
                <th className="text-left px-4 py-4 text-sm font-black uppercase tracking-wider text-[#1D1D1F]">Namn</th>
                <th className="text-left px-4 py-4 text-sm font-black uppercase tracking-wider text-[#1D1D1F]">E-post</th>
                <th className="text-left px-4 py-4 text-sm font-black uppercase tracking-wider text-[#1D1D1F]">Telefon</th>
                <th className="text-left px-4 py-4 text-sm font-black uppercase tracking-wider text-[#1D1D1F]">Coach</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]/30">
              {filtered.map((athlete) => (
                <tr
                  key={athlete.id}
                  onClick={() => router.push(`/dashboard/athletes/${athlete.id}`)}
                  className="hover:bg-[#F5F5F7]/50 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-5 font-medium text-primary">{fullName(athlete.firstName, athlete.lastName)}</td>
                  <td className="px-4 py-5 text-secondary">{athlete.email || "—"}</td>
                  <td className="px-4 py-5 text-secondary">{athlete.phone || "—"}</td>
                  <td className="px-4 py-5 text-secondary">{athlete.mainCoach || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
