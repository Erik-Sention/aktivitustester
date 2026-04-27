"use client"

import { useState, useRef, useEffect } from "react"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { onAuthStateChanged, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth"
import { storage, auth } from "@/lib/firebase"
import { getCoachProfileClient, upsertCoachProfileClient } from "@/lib/coach-profile"
import { ClinicLocation } from "@/types"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"

const CLINIC_LOCATIONS: { value: ClinicLocation; label: string }[] = [
  { value: "stockholm",   label: "Stockholm" },
  { value: "stockholm_c", label: "Stockholm C" },
  { value: "linkoping",   label: "Linköping" },
  { value: "goteborg",    label: "Göteborg" },
  { value: "malmo",       label: "Malmö" },
]

interface ProfileFormProps {
  uid: string
  email: string
}

export function ProfileForm({ uid, email }: ProfileFormProps) {
  const [displayName, setDisplayName] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [defaultLocation, setDefaultLocation] = useState<ClinicLocation | "">("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub() // one-shot — unsubscribe after first resolved state
      if (!user) { setLoading(false); return }
      getCoachProfileClient(uid)
        .then((p) => {
          if (p?.displayName) setDisplayName(p.displayName)
          if (p?.avatarUrl) setAvatarUrl(p.avatarUrl)
          if (p?.defaultLocation) setDefaultLocation(p.defaultLocation)
        })
        .catch(() => { toast.error("Kunde inte hämta profilen.") })
        .finally(() => setLoading(false))
    })
    return unsub
  }, [uid])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const initials = displayName
    ? displayName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : email[0].toUpperCase()

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)
    setUploading(true)
    try {
      const storageRef = ref(storage, `coach_avatars/${uid}/avatar`)
      await uploadBytes(storageRef, file)
      const url = await getDownloadURL(storageRef)
      setAvatarUrl(url)
    } catch {
      setUploadError("Kunde inte ladda upp bilden. Försök igen.")
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await upsertCoachProfileClient(uid, {
        email,
        displayName: displayName.trim(),
        ...(avatarUrl ? { avatarUrl } : {}),
        ...(defaultLocation ? { defaultLocation } : {}),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      toast.error("Kunde inte spara profilen. Försök igen.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-3xl shadow-apple p-8 flex items-center justify-center h-48">
        <div className="h-8 w-8 rounded-full border-2 border-[#007AFF] border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <>
    <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-apple p-8 space-y-6">

      {/* Avatar picker */}
      <div className="flex items-center gap-5">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="relative group flex-shrink-0"
        >
          <div className="h-20 w-20 rounded-full overflow-hidden bg-[#007AFF]/10 flex items-center justify-center text-2xl font-bold text-interactive">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profilbild" className="h-full w-full object-cover" />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="text-white text-xs font-semibold">Ändra</span>
          </div>
        </button>

        <div className="space-y-0.5">
          <p className="text-base font-semibold text-primary">{email}</p>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="text-sm text-interactive hover:underline"
            disabled={uploading}
          >
            {uploading ? "Laddar upp…" : "Välj profilbild"}
          </button>
          {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Display name */}
      <div className="space-y-1.5">
        <Label htmlFor="displayName">Visningsnamn</Label>
        <Input
          id="displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Förnamn Efternamn"
          required
        />
        <p className="text-sm text-secondary">
          Fylls i automatiskt som testledare i nya test och visas i PDF-rapporter.
        </p>
      </div>

      {/* Default location */}
      <div className="space-y-1.5">
        <Label htmlFor="defaultLocation">Standardplats</Label>
        <Select
          id="defaultLocation"
          value={defaultLocation}
          onChange={(e) => setDefaultLocation(e.target.value as ClinicLocation | "")}
        >
          <option value="">— Ingen standard —</option>
          {CLINIC_LOCATIONS.map((loc) => (
            <option key={loc.value} value={loc.value}>{loc.label}</option>
          ))}
        </Select>
        <p className="text-sm text-secondary">
          Förfylls automatiskt som plats i nya test.
        </p>
      </div>

      <Button type="submit" disabled={saving || uploading} className="w-full" size="lg">
        {saved ? "Sparat!" : saving ? "Sparar…" : "Spara profil"}
      </Button>
    </form>

    <ChangePasswordSection email={email} />
    </>
  )
}

function ChangePasswordSection({ email }: { email: string }) {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSaved, setPwSaved] = useState(false)
  const [pwSaving, setPwSaving] = useState(false)

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwError(null)

    if (newPassword !== confirmPassword) {
      setPwError("Lösenorden matchar inte.")
      return
    }
    if (newPassword.length < 6) {
      setPwError("Lösenordet måste vara minst 6 tecken.")
      return
    }

    const user = auth.currentUser
    if (!user) return

    setPwSaving(true)
    try {
      const credential = EmailAuthProvider.credential(email, currentPassword)
      await reauthenticateWithCredential(user, credential)
      await updatePassword(user, newPassword)
      setPwSaved(true)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setTimeout(() => setPwSaved(false), 3000)
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setPwError("Fel nuvarande lösenord.")
      } else {
        setPwError("Något gick fel. Försök igen.")
      }
    } finally {
      setPwSaving(false)
    }
  }

  return (
    <form onSubmit={handleChangePassword} className="bg-white rounded-3xl shadow-apple p-8 space-y-4">
      <p className="text-sm font-black uppercase tracking-widest text-primary">Byt lösenord</p>

      <div className="space-y-1.5">
        <Label htmlFor="currentPassword">Nuvarande lösenord</Label>
        <Input
          id="currentPassword"
          type="password"
          value={currentPassword}
          onChange={(e) => { setCurrentPassword(e.target.value); setPwError(null) }}
          placeholder="••••••••"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="newPassword">Nytt lösenord</Label>
        <Input
          id="newPassword"
          type="password"
          value={newPassword}
          onChange={(e) => { setNewPassword(e.target.value); setPwError(null) }}
          placeholder="••••••••"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">Bekräfta nytt lösenord</Label>
        <Input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => { setConfirmPassword(e.target.value); setPwError(null) }}
          placeholder="••••••••"
          required
        />
      </div>

      {pwError && <p className="text-sm text-destructive font-medium">{pwError}</p>}
      {pwSaved && <p className="text-sm text-green-600 font-medium">Lösenord uppdaterat!</p>}

      <Button type="submit" disabled={pwSaving} className="w-full" size="lg">
        {pwSaving ? "Sparar…" : "Byt lösenord"}
      </Button>
    </form>
  )
}
