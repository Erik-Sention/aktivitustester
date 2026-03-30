"use client"

import { useState } from "react"
import Link from "next/link"
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
        <p className="text-muted-foreground text-sm">Inga atleter matchar sökningen.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Namn</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Kön</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">E-post</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Telefon</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Coach</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Vikt</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((athlete, i) => (
                <tr
                  key={athlete.id}
                  className={cn(
                    "border-t hover:bg-muted/30 transition-colors cursor-pointer",
                    i % 2 === 0 ? "" : "bg-muted/10"
                  )}
                >
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/athletes/${athlete.id}`} className="font-medium hover:underline">
                      {fullName(athlete.firstName, athlete.lastName)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{athlete.gender || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{athlete.email || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{athlete.phone || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{athlete.mainCoach || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {athlete.currentWeight ? `${athlete.currentWeight} kg` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
