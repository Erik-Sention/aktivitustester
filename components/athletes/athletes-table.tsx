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
  status?: string
}

interface AthletesTableProps {
  athletes: SerializedAthlete[]
  currentCoachName?: string
  isAdmin?: boolean
}

export function AthletesTable({ athletes, currentCoachName, isAdmin }: AthletesTableProps) {
  const [query, setQuery] = useState("")
  const [showAll, setShowAll] = useState(false)
  const router = useRouter()

  const trimmed = query.trim()
  const searchActive = trimmed.length >= 3

  const myAthletes = currentCoachName
    ? athletes.filter((a) => (a.mainCoach ?? "").trim().toLowerCase() === currentCoachName.trim().toLowerCase())
    : athletes

  const filtered = searchActive
    ? athletes.filter((a) => {
        const q = trimmed.toLowerCase()
        return (
          fullName(a.firstName, a.lastName).toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q) ||
          a.phone.toLowerCase().includes(q) ||
          (a.mainCoach ?? "").toLowerCase().includes(q)
        )
      })
    : (isAdmin && showAll) ? athletes : myAthletes

  const countLabel = searchActive
    ? `${filtered.length} träff${filtered.length !== 1 ? "ar" : ""}`
    : (isAdmin && showAll)
      ? `${filtered.length} atleter totalt`
      : `${filtered.length} mina atleter`

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <Input
          placeholder={isAdmin ? "Sök på namn, e-post, telefon eller coach…" : "Sök (minst 3 tecken)…"}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-sm bg-white"
        />
        {isAdmin && !searchActive && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className={cn(
              "px-3 py-2 rounded-xl text-sm font-semibold border transition-colors",
              showAll
                ? "bg-[#0071BA] text-white border-[#0071BA]"
                : "bg-white text-[#0071BA] border-[#0071BA] hover:bg-[#0071BA]/5"
            )}
          >
            {showAll ? "Mina atleter" : "Visa alla"}
          </button>
        )}
        <span className="text-sm text-secondary">{countLabel}</span>
      </div>

      {searchActive && trimmed.length < 3 ? null : filtered.length === 0 ? (
        <p className="text-secondary text-base">
          {searchActive
            ? "Inga atleter matchar sökningen."
            : "Du har inga atleter kopplade till dig ännu."}
        </p>
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
                  <td className="px-4 py-5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-primary">{fullName(athlete.firstName, athlete.lastName)}</span>
                      {athlete.status === 'Pending_Consent' && (
                        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800")}>
                          Inväntar samtycke
                        </span>
                      )}
                      {athlete.status === 'Consent_Revoked' && (
                        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800")}>
                          Samtycke indraget
                        </span>
                      )}
                    </div>
                  </td>
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
