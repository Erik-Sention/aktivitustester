"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { isRedirectError } from "next/dist/client/components/redirect-error"
import { createAthleteAction, updateAthleteAction } from "@/app/actions/athletes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"

interface AthleteFormProps {
  existing?: {
    id: string
    firstName: string
    lastName: string
    personnummer: string
    birthDate: string
    gender: string
    email: string
    phone: string
    mainCoach: string
  }
}

// Returns YYYYMMDD (no dashes) from a personnummer string
function birthDateFromPersonnummer(pnr: string): string {
  const digits = pnr.replace(/\D/g, "")
  // 12-digit format: YYYYMMDDXXXX
  if (digits.length >= 8) {
    const year = parseInt(digits.slice(0, 4), 10)
    if (year >= 1900 && year <= 2099) {
      return digits.slice(0, 4) + digits.slice(4, 6) + digits.slice(6, 8)
    }
  }
  // 10-digit format: YYMMDDXXXX
  if (digits.length >= 6) {
    const yy = parseInt(digits.slice(0, 2), 10)
    const currentYY = new Date().getFullYear() % 100
    const yyyy = yy <= currentYY ? 2000 + yy : 1900 + yy
    return `${yyyy}${digits.slice(2, 4)}${digits.slice(4, 6)}`
  }
  return ""
}

// Converts YYYYMMDD → YYYY-MM-DD for Firebase
function toIsoDate(yyyymmdd: string): string {
  const d = yyyymmdd.replace(/\D/g, "")
  if (d.length !== 8) return yyyymmdd
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`
}

// Converts YYYY-MM-DD → YYYYMMDD for display
function toCompact(isoDate: string): string {
  return isoDate.replace(/-/g, "")
}

export function AthleteForm({ existing }: AthleteFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    firstName: existing?.firstName ?? "",
    lastName: existing?.lastName ?? "",
    personnummer: existing?.personnummer ?? "",
    birthDate:
      existing?.birthDate
        ? toCompact(existing.birthDate)
        : birthDateFromPersonnummer(existing?.personnummer ?? ""),
    gender: existing?.gender ?? "",
    email: existing?.email ?? "",
    phone: existing?.phone ?? "",
    mainCoach: existing?.mainCoach ?? "",
  })

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function handlePersonnummerChange(value: string) {
    setForm((f) => {
      const newDate = birthDateFromPersonnummer(value)
      return {
        ...f,
        personnummer: value,
        birthDate: newDate || f.birthDate,
      }
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        personnummer: form.personnummer || undefined,
        birthDate: form.birthDate ? toIsoDate(form.birthDate) : undefined,
        gender: form.gender || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        mainCoach: form.mainCoach || undefined,
      }

      if (existing) {
        await updateAthleteAction(existing.id, payload)
      } else {
        await createAthleteAction(payload)
      }
    } catch (err) {
      if (isRedirectError(err)) throw err
      setError("Något gick fel. Försök igen.")
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="firstName">Förnamn *</Label>
              <Input
                id="firstName"
                value={form.firstName}
                onChange={(e) => update("firstName", e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="lastName">Efternamn *</Label>
              <Input
                id="lastName"
                value={form.lastName}
                onChange={(e) => update("lastName", e.target.value)}
                required
              />
            </div>
          </div>

          {existing && (
            <>
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <Label htmlFor="personnummer">Personnummer</Label>
                  <span className="relative group">
                    <span className="text-xs text-secondary cursor-default select-none">i</span>
                    <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 w-56 rounded-lg bg-primary text-white text-xs px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                      Används för faktureringsuppgifter. Normalt atletens personnummer, men kan ändras vid behov.
                    </span>
                  </span>
                </div>
                <Input
                  id="personnummer"
                  placeholder="ÅÅMMDD-XXXX"
                  value={form.personnummer}
                  onChange={(e) => handlePersonnummerChange(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="birthDate">Födelsedatum</Label>
                  <Input
                    id="birthDate"
                    placeholder="ÅÅÅÅMMDD"
                    maxLength={8}
                    value={form.birthDate}
                    onChange={(e) => update("birthDate", e.target.value.replace(/\D/g, ""))}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="gender">Kön</Label>
                  <Select
                    id="gender"
                    value={form.gender}
                    onChange={(e) => update("gender", e.target.value)}
                  >
                    <option value="">Välj</option>
                    <option value="M">Man</option>
                    <option value="K">Kvinna</option>
                  </Select>
                </div>
              </div>
            </>
          )}

          <div className="space-y-1">
            <Label htmlFor="email">E-post</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
            />
          </div>

          {existing && (
            <>
              <div className="space-y-1">
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="mainCoach">Huvudcoach</Label>
                <Input
                  id="mainCoach"
                  value={form.mainCoach}
                  onChange={(e) => update("mainCoach", e.target.value)}
                />
              </div>
            </>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? "Sparar…" : existing ? "Uppdatera atlet" : "Skapa atlet"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Avbryt
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
