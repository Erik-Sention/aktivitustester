"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"

interface NavBarProps {
  userName: string
  role: string
}

export function NavBar({ userName, role }: NavBarProps) {
  const router = useRouter()

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

        {/* Right */}
        <div className="flex items-center gap-4">
          <span className="hidden sm:block text-base text-primary">
            {userName}
            <span className="text-primary/30 mx-1.5">·</span>
            <span className="capitalize">{role.toLowerCase()}</span>
          </span>
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
