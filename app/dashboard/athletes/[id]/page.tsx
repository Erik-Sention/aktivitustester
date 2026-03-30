import Link from "next/link"
import { notFound } from "next/navigation"
import { getAthlete } from "@/lib/athletes"
import { getTests } from "@/lib/tests"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn, formatDate, fullName } from "@/lib/utils"
import { DeleteAthleteButton } from "@/components/athletes/delete-athlete-button"
import { Pencil, Plus } from "lucide-react"

function testTypeLabel(type: string) {
  if (type === "troskeltest") return "Tröskeltest"
  if (type === "vo2max") return "VO₂ max-test"
  if (type === "wingate") return "Wingate"
  return type
}

function sportLabel(sport: string) {
  if (sport === "cykel") return "Cykel"
  if (sport === "lopning") return "Löpning"
  if (sport === "skidor_band") return "Skidor (band)"
  if (sport === "skierg") return "Skierg"
  if (sport === "kajak") return "Kajak"
  return sport
}

export default async function AthleteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [athlete, tests] = await Promise.all([
    getAthlete(id),
    getTests(id),
  ])

  if (!athlete) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{fullName(athlete.firstName, athlete.lastName)}</h1>
          <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
            {athlete.gender && <span>{athlete.gender === "M" ? "Man" : "Kvinna"}</span>}
            {athlete.birthDate && (
              <span>Född {new Date(athlete.birthDate.seconds * 1000).toLocaleDateString("sv-SE")}</span>
            )}
            {athlete.personnummer && <span>{athlete.personnummer}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/dashboard/athletes/${id}/edit`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <Pencil className="h-4 w-4" />
            Redigera
          </Link>
          <DeleteAthleteButton athleteId={id} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {athlete.email && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">E-post</p>
            <p className="text-sm">{athlete.email}</p>
          </div>
        )}
        {athlete.phone && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Telefon</p>
            <p className="text-sm">{athlete.phone}</p>
          </div>
        )}
        {athlete.mainCoach && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Huvudcoach</p>
            <p className="text-sm">{athlete.mainCoach}</p>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Tester</h2>
          <Link href={`/dashboard/tests/new?athlete=${id}`} className={cn(buttonVariants({ size: "sm" }))}>
            <Plus className="h-4 w-4" />
            Nytt test
          </Link>
        </div>

        {tests.length === 0 ? (
          <p className="text-muted-foreground text-sm">Inga tester registrerade ännu.</p>
        ) : (
          <div className="space-y-2">
            {tests.map((test) => (
              <Link key={test.id} href={`/dashboard/tests/${test.id}`}>
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {testTypeLabel(test.testType)}
                        <span className="ml-2 font-normal text-muted-foreground">— {sportLabel(test.sport)}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {test.inputParams.startWatt > 0 && (
                          <span>{test.inputParams.startWatt}W +{test.inputParams.stepSize}W / {test.inputParams.testDuration} min</span>
                        )}
                        {test.inputParams.startWatt > 0 && (test.results.atWatt || test.results.ltWatt) && <span> · </span>}
                        {test.results.atWatt ? `LT1: ${test.results.atWatt}W` : ""}
                        {test.results.atWatt && test.results.ltWatt ? " · " : ""}
                        {test.results.ltWatt ? `LT2: ${test.results.ltWatt}W` : ""}
                      </p>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {new Date(test.testDate.seconds * 1000).toLocaleDateString("sv-SE")}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
