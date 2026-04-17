"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"

export interface ConsentData {
  personnummer: string
  gender: string
  phone: string
  mainCoach: string
  email: string
}

interface ConsentModalProps {
  athleteName: string
  athleteEmail: string
  coaches: { uid: string; displayName: string }[]
  onConsent: (data: ConsentData) => Promise<void>
  onGuest: () => void | Promise<void>
  onGuestLabel?: string
}

function isValidPersonnummer(pnr: string): boolean {
  const digits = pnr.replace(/\D/g, "")
  return digits.length === 10 || digits.length === 12
}

export function ConsentModal({ athleteName, athleteEmail, coaches, onConsent, onGuest, onGuestLabel }: ConsentModalProps) {
  const [form, setForm] = useState<ConsentData>({
    personnummer: "",
    gender: "",
    phone: "",
    mainCoach: "",
    email: athleteEmail,
  })
  const [saving, setSaving] = useState(false)
  const [guestLoading, setGuestLoading] = useState(false)
  const [pnrError, setPnrError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  function update(field: keyof ConsentData, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
    if (field === "personnummer") setPnrError(null)
  }

  const canSave =
    isValidPersonnummer(form.personnummer) &&
    form.gender !== "" &&
    form.mainCoach !== ""

  async function handleConsent() {
    if (!isValidPersonnummer(form.personnummer)) {
      setPnrError("Ange ett giltigt personnummer (10 eller 12 siffror).")
      return
    }
    setSaving(true)
    setSubmitError(null)
    try {
      await onConsent(form)
    } catch {
      setSubmitError("Något gick fel. Försök igen.")
      setSaving(false)
    }
  }

  async function handleGuest() {
    setGuestLoading(true)
    setSubmitError(null)
    try {
      await onGuest()
    } catch {
      setSubmitError("Något gick fel. Försök igen.")
      setGuestLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8 overflow-y-auto">
      <div className="bg-white rounded-2xl p-6 shadow-xl max-w-md w-full space-y-5 my-auto">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-primary">Samtycke &amp; profilregistrering</h2>
          <p className="text-sm text-secondary">
            Har <span className="font-medium text-primary">{athleteName}</span> lämnat samtycke till
            datalagring för träningsoptimering?
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="consent-pnr">Personnummer *</Label>
            <Input
              id="consent-pnr"
              placeholder="ÅÅMMDD-XXXX eller ÅÅÅÅMMDD-XXXX"
              value={form.personnummer}
              onChange={(e) => update("personnummer", e.target.value)}
            />
            {pnrError && <p className="text-xs text-destructive">{pnrError}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="consent-gender">Kön *</Label>
              <Select
                id="consent-gender"
                value={form.gender}
                onChange={(e) => update("gender", e.target.value)}
              >
                <option value="">Välj…</option>
                <option value="M">Man</option>
                <option value="K">Kvinna</option>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="consent-phone">Telefon</Label>
              <Input
                id="consent-phone"
                type="tel"
                placeholder="07X-XXX XX XX"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="consent-coach">Huvudcoach *</Label>
            <Select
              id="consent-coach"
              value={form.mainCoach}
              onChange={(e) => update("mainCoach", e.target.value)}
            >
              <option value="">Välj coach…</option>
              {coaches.map((c) => (
                <option key={c.uid} value={c.displayName}>
                  {c.displayName}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="consent-email">E-post</Label>
            <Input
              id="consent-email"
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
            />
          </div>
        </div>

        <p className="text-xs text-secondary">
          Genom att bekräfta intygar du som coach att samtycke har inhämtats. Datum och din
          användaridentitet loggas automatiskt.
        </p>

        {submitError && <p className="text-xs text-destructive">{submitError}</p>}

        <div className="flex flex-col gap-2">
          <Button
            onClick={handleConsent}
            disabled={saving || guestLoading || !canSave}
            className="w-full"
          >
            {saving ? "Sparar…" : "JA – Kunden ger samtycke"}
          </Button>
          <Button
            variant="outline"
            onClick={handleGuest}
            disabled={saving || guestLoading}
            className="w-full"
          >
            {guestLoading ? "Sparar…" : (onGuestLabel ?? "NEJ – Kör som gäst (data sparas ej)")}
          </Button>
        </div>
      </div>
    </div>
  )
}
