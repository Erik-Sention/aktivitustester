"use client"

import { useEffect } from "react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function GlobalError({
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
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="text-center space-y-4 max-w-md">
        <h1 className="text-2xl font-bold text-primary">Något gick fel</h1>
        <p className="text-secondary text-sm">
          Ett oväntat fel uppstod. Försök igen eller gå tillbaka till startsidan.
        </p>
        <div className="flex gap-3 justify-center pt-2">
          <button
            onClick={reset}
            className={cn(buttonVariants({ variant: "default" }))}
          >
            Försök igen
          </button>
          <Link href="/dashboard/athletes" className={cn(buttonVariants({ variant: "outline" }))}>
            Till startsidan
          </Link>
        </div>
      </div>
    </div>
  )
}
