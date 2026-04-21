"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { doc, onSnapshot } from "firebase/firestore"
import { onAuthStateChanged } from "firebase/auth"
import { db, auth } from "@/lib/firebase"
import type { CoachProfile } from "@/lib/coach-profile"

interface NavBarProps {
  userName: string
  role: string
  uid: string
}

export function NavBar({ userName, role, uid }: NavBarProps) {
  const router = useRouter()
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    let unsubSnap: (() => void) | undefined

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsubSnap = onSnapshot(
          doc(db, "coach_profiles", uid),
          (snap) => {
            const p = snap.exists() ? (snap.data() as CoachProfile) : null
            setDisplayName(p?.displayName ?? null)
            setAvatarUrl(p?.avatarUrl ?? null)
          },
          () => {}
        )
      }
    })

    return () => {
      unsubAuth()
      unsubSnap?.()
    }
  }, [uid])

  const shownName = displayName || userName
  const initials = shownName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  async function handleLogout() {
    await fetch("/api/session", { method: "DELETE" })
    router.push("/login")
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-black/[0.06]">
      <div className="container mx-auto px-6 max-w-6xl flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/dashboard/athletes" className="flex items-center gap-3 group">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#007AFF] text-white text-sm font-bold shadow-brand-glow group-hover:scale-105 transition-transform">
            A
          </span>
          <span className="font-semibold text-base tracking-tight text-primary">
            Aktivitus <span className="text-primary/50 font-normal">/ Coach Console</span>
          </span>
        </Link>

        {/* Nav links */}
        <nav className="hidden sm:flex items-center gap-6">
          <Link href="/dashboard/athletes" className="text-base font-medium text-primary hover:text-interactive transition-colors">
            Atleter
          </Link>
          {role === 'ADMIN' && (
            <Link href="/dashboard/admin" className="text-base font-medium text-primary hover:text-interactive transition-colors">
              Admin
            </Link>
          )}
        </nav>

        {/* Right — avatar + name → profile + logout */}
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/profile"
            className="flex items-center gap-2.5 hover:opacity-75 transition-opacity"
          >
            <div className="h-8 w-8 rounded-full overflow-hidden bg-[#007AFF]/10 flex items-center justify-center text-xs font-bold text-interactive flex-shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <span className="hidden sm:block text-base text-primary">
              {shownName}
              <span className="text-primary/30 mx-1.5">·</span>
              <span className="capitalize">{role.toLowerCase()}</span>
            </span>
          </Link>
          <button
            onClick={handleLogout}
            className="text-base text-primary hover:text-interactive transition-colors font-medium"
          >
            Logga ut
          </button>
        </div>
      </div>
    </header>
  )
}
