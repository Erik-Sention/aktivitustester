"use client"

import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password)
      const idToken = await credential.user.getIdToken()
      const refreshToken = credential.user.refreshToken

      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, refreshToken }),
      })

      if (!res.ok) throw new Error("Session creation failed")

      router.push("/dashboard/athletes")
      router.refresh()
    } catch {
      setError("Fel e-post eller lösenord")
      setLoading(false)
    }
  }

  async function handleForgotPassword() {
    const trimmed = email.trim()
    if (!trimmed) return
    try { await sendPasswordResetEmail(auth, trimmed) } catch { /* noop */ }
    setForgotSent(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm space-y-8">
        {/* Brand mark */}
        <div className="text-center space-y-3">
          <Image
            src="/aktivitus-logo.png"
            alt="Aktivitus"
            width={296}
            height={68}
            className="h-12 w-auto mx-auto"
            priority
          />
          <p className="text-base text-secondary">Coach Console</p>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-3xl shadow-apple-md p-8 space-y-5">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-post</Label>
              <Input
                id="email"
                type="email"
                placeholder="du@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null) }}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Lösenord</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-secondary hover:text-primary transition-colors select-none"
                >
                  {showPassword ? "Dölj" : "Visa"}
                </button>
              </div>
            </div>
            {error && (
              <p className="text-sm text-destructive font-medium">{error}</p>
            )}
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Loggar in…" : "Logga in"}
            </Button>
          </form>

          <div className="text-center">
            {forgotSent ? (
              <p className="text-sm text-secondary">Återställningslänk skickad — kolla din inkorg (och skräppost).</p>
            ) : (
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm text-interactive hover:underline"
              >
                Glömt lösenord?
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
