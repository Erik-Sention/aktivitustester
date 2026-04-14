"use client"

import { useState, useRef, useEffect } from "react"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { onAuthStateChanged } from "firebase/auth"
import { storage, auth } from "@/lib/firebase"
import { getCoachProfileClient, upsertCoachProfileClient } from "@/lib/coach-profile"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface ProfileFormProps {
  uid: string
  email: string
}

export function ProfileForm({ uid, email }: ProfileFormProps) {
  const [displayName, setDisplayName] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub() // one-shot — unsubscribe after first resolved state
      if (!user) { setLoading(false); return }
      getCoachProfileClient(uid)
        .then((p) => {
          if (p?.displayName) setDisplayName(p.displayName)
          if (p?.avatarUrl) setAvatarUrl(p.avatarUrl)
        })
        .catch(() => {})
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
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      // TODO: show error
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

      <Button type="submit" disabled={saving || uploading} className="w-full" size="lg">
        {saved ? "Sparat!" : saving ? "Sparar…" : "Spara profil"}
      </Button>
    </form>
  )
}
