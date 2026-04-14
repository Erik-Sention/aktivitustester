"use client"

import { useEffect } from "react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex items-center justify-center py-24 px-6">
      <div className="text-center space-y-4 max-w-md">
        <h2 className="text-xl font-bold text-primary">Något gick fel</h2>
        <p className="text-secondary text-sm">
          Sidan kunde inte laddas. Försök igen eller gå tillbaka till atletlistan.
        </p>
        <div className="flex gap-3 justify-center pt-2">
          <button
            onClick={reset}
            className={cn(buttonVariants({ variant: "default" }))}
          >
            Försök igen
          </button>
          <Link href="/dashboard/athletes" className={cn(buttonVariants({ variant: "outline" }))}>
            Tillbaka till atleter
          </Link>
        </div>
      </div>
    </div>
  )
}
