"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { doc, onSnapshot } from "firebase/firestore"
import { onAuthStateChanged } from "firebase/auth"
import { Users, ShieldCheck, Menu, X } from "lucide-react"
import { db, auth } from "@/lib/firebase"
import type { CoachProfile } from "@/lib/coach-profile"
import { loadDraft } from "@/lib/recording-draft"

interface NavBarProps {
  userName: string
  role: string
  uid: string
}

export function NavBar({ userName, role, uid }: NavBarProps) {
  const router = useRouter()
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isRecording, setIsRecording] = useState(false)

  // Hide navbar during active test recording (all test types and sports)
  useEffect(() => {
    const handler = (e: Event) => setIsRecording((e as CustomEvent<boolean>).detail)
    window.addEventListener("akt:recording", handler)
    return () => window.removeEventListener("akt:recording", handler)
  }, [])

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

  if (isRecording) return null

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
        <Link href="/dashboard/athletes" className="flex items-center group">
          <Image
            src="/aktivitus-logo.png"
            alt="Aktivitus"
            width={148}
            height={34}
            className="h-8 w-auto opacity-90 group-hover:opacity-100 transition-opacity"
            priority
          />
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden sm:flex items-center gap-2">
          <Link
            href="/dashboard/athletes"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-primary hover:bg-[#F5F5F7] transition-colors"
          >
            <Users className="h-4 w-4" />
            Atleter
          </Link>
          {role === 'ADMIN' && (
            <Link
              href="/dashboard/admin"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-primary hover:bg-[#F5F5F7] transition-colors"
            >
              <ShieldCheck className="h-4 w-4" />
              Admin
            </Link>
          )}
        </nav>

        {/* Right — desktop: avatar + name + logout | mobile: avatar + hamburger */}
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/profile"
            className="flex items-center gap-2.5 hover:opacity-75 transition-opacity"
          >
            <div className="h-8 w-8 rounded-full overflow-hidden bg-[#0071BA]/10 flex items-center justify-center text-xs font-bold text-interactive flex-shrink-0">
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
            className="hidden sm:block text-base text-primary hover:text-interactive transition-colors font-medium"
          >
            Logga ut
          </button>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="sm:hidden p-2 rounded-lg text-primary hover:bg-[#F5F5F7] transition-colors"
            aria-label="Öppna meny"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="sm:hidden border-t border-black/[0.06] bg-white px-4 py-3 flex flex-col gap-1">
          <Link
            href="/dashboard/athletes"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-primary hover:bg-[#F5F5F7] transition-colors"
          >
            <Users className="h-4 w-4" />
            Atleter
          </Link>
          {role === 'ADMIN' && (
            <Link
              href="/dashboard/admin"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-primary hover:bg-[#F5F5F7] transition-colors"
            >
              <ShieldCheck className="h-4 w-4" />
              Admin
            </Link>
          )}
          <div className="my-1 border-t border-black/[0.06]" />
          <button
            onClick={() => { setMenuOpen(false); handleLogout() }}
            className="flex items-center px-3 py-2.5 rounded-xl text-sm font-semibold text-primary hover:bg-[#F5F5F7] transition-colors text-left"
          >
            Logga ut
          </button>
        </div>
      )}
    </header>
  )
}
