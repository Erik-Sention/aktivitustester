"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { updateTestAction } from "@/app/actions/tests"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RawDataPoint } from "@/types"

interface EditFormProps {
  testId: string
  athleteId: string
  testDate: string       // ISO date string "YYYY-MM-DD"
  notes: string
  rawData: RawDataPoint[]
}

export function EditTestForm({ testId, athleteId, testDate, notes, rawData: initialRows }: EditFormProps) {
  const router = useRouter()
  const [date, setDate] = useState(testDate)
  const [noteText, setNoteText] = useState(notes)
  const [rows, setRows] = useState<RawDataPoint[]>(initialRows)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lacStrings, setLacStrings] = useState<Record<number, string>>({})

  function updateRow(index: number, field: keyof RawDataPoint, value: string) {
    setRows((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: parseFloat(value) || 0 }
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      await updateTestAction(testId, athleteId, {
        testDate: date,
        notes: noteText,
        rawData: rows.filter(r => r.hr > 0 || r.lac > 0 || r.watt > 0),
      })
    } catch (e: unknown) {
      if ((e as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw e
      setError("Något gick fel. Försök igen.")
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 max-w-lg">
        <div className="space-y-1">
          <Label htmlFor="date">Datum</Label>
          <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="notes">Anteckningar</Label>
          <Input id="notes" value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Valfritt…" />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-white shadow-sm">
        <div className="border-b border-[hsl(var(--border))] bg-[#F5F5F7]/50 px-5 py-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#86868B]">Stegindata</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-[0.1em] text-[#86868B] border-b border-[hsl(var(--border))]">
                <th className="px-3 py-2 text-left">Min</th>
                <th className="px-3 py-2 text-right">Watt</th>
                <th className="px-3 py-2 text-right">Puls</th>
                <th className="px-3 py-2 text-right">Borg</th>
                <th className="px-3 py-2 text-right">Laktat</th>
                <th className="px-3 py-2 text-right">Kadans</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]/30">
              {rows.map((row, i) => (
                <tr key={i} className="hover:bg-[#F5F5F7]/50">
                  <td className="px-3 py-1.5">
                    <input type="number" value={row.min || ""} onChange={(e) => updateRow(i, "min", e.target.value)}
                      className="table-input w-12 text-center" />
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <input type="number" value={row.watt || ""} onChange={(e) => updateRow(i, "watt", e.target.value)}
                      className="table-input w-16 text-right" />
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <input type="number" value={row.hr || ""} onChange={(e) => updateRow(i, "hr", e.target.value)}
                      className="table-input w-14 text-right" />
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <input type="number" value={row.borg || ""} onChange={(e) => updateRow(i, "borg", e.target.value)}
                      className="table-input w-12 text-right" />
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <input
                      type="text" inputMode="decimal"
                      value={lacStrings[i] ?? (row.lac > 0 ? String(row.lac) : "")}
                      onChange={(e) => {
                        const raw = e.target.value
                        setLacStrings((prev) => ({ ...prev, [i]: raw }))
                        const num = parseFloat(raw.replace(",", "."))
                        if (!isNaN(num)) updateRow(i, "lac", String(num))
                      }}
                      onBlur={() => setLacStrings((prev) => { const n = { ...prev }; delete n[i]; return n })}
                      className="table-input w-16 text-right font-bold"
                    />
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <input type="number" value={row.cadence || ""} onChange={(e) => updateRow(i, "cadence", e.target.value)}
                      className="table-input w-14 text-right" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {error && <p className="text-sm text-destructive font-medium">{error}</p>}

      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Sparar…" : "Spara ändringar"}
        </Button>
        <Button variant="outline" onClick={() => router.push(`/dashboard/tests/${testId}`)}>
          Avbryt
        </Button>
      </div>
    </div>
  )
}
