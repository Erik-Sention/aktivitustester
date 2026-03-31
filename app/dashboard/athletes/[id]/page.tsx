import Link from "next/link"
import { notFound } from "next/navigation"
import { getAthlete } from "@/lib/athletes"
import { getTests } from "@/lib/tests"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn, fullName } from "@/lib/utils"
import { DeleteAthleteButton } from "@/components/athletes/delete-athlete-button"
import { AthleteTestsPanel, SerializedTest } from "@/components/athletes/athlete-tests-panel"
import { Pencil, Mail, Phone, User, Calendar, Hash } from "lucide-react"

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

  const serializedTests: SerializedTest[] = tests.map((t) => ({
    id: t.id,
    testType: t.testType,
    sport: t.sport,
    testDateStr: new Date(t.testDate.seconds * 1000).toLocaleDateString("sv-SE"),
    inputParams: {
      startWatt: t.inputParams.startWatt,
      stepSize: t.inputParams.stepSize,
      testDuration: t.inputParams.testDuration,
    },
    results: {
      atWatt: t.results.atWatt,
      ltWatt: t.results.ltWatt,
      maxHR: t.results.maxHR,
      maxLactate: t.results.maxLactate,
    },
  }))

  const birthDateStr = athlete.birthDate
    ? new Date(athlete.birthDate.seconds * 1000).toLocaleDateString("sv-SE")
    : null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 items-start">
      {/* Left: Profile card */}
      <Card className="sticky top-6">
        <CardContent className="p-6 space-y-5">
          {/* Name + gender */}
          <div>
            <h1 className="text-xl font-bold text-[#1D1D1F]">
              {fullName(athlete.firstName, athlete.lastName)}
            </h1>
            {athlete.gender && (
              <p className="text-sm text-[#515154] mt-0.5">
                {athlete.gender === "M" ? "Man" : "Kvinna"}
              </p>
            )}
          </div>

          {/* Info rows */}
          <div className="space-y-3">
            {birthDateStr && (
              <div className="flex items-start gap-2.5">
                <Calendar className="h-4 w-4 text-[#515154] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-[#515154] uppercase tracking-wide">Född</p>
                  <p className="text-sm text-[#1D1D1F]">{birthDateStr}</p>
                </div>
              </div>
            )}
            {athlete.personnummer && (
              <div className="flex items-start gap-2.5">
                <Hash className="h-4 w-4 text-[#515154] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-[#515154] uppercase tracking-wide">Personnummer</p>
                  <p className="text-sm text-[#1D1D1F]">{athlete.personnummer}</p>
                </div>
              </div>
            )}
            {athlete.email && (
              <div className="flex items-start gap-2.5">
                <Mail className="h-4 w-4 text-[#515154] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-[#515154] uppercase tracking-wide">E-post</p>
                  <p className="text-sm text-[#1D1D1F] break-all">{athlete.email}</p>
                </div>
              </div>
            )}
            {athlete.phone && (
              <div className="flex items-start gap-2.5">
                <Phone className="h-4 w-4 text-[#515154] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-[#515154] uppercase tracking-wide">Telefon</p>
                  <p className="text-sm text-[#1D1D1F]">{athlete.phone}</p>
                </div>
              </div>
            )}
            {athlete.mainCoach && (
              <div className="flex items-start gap-2.5">
                <User className="h-4 w-4 text-[#515154] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-[#515154] uppercase tracking-wide">Huvudcoach</p>
                  <p className="text-sm text-[#1D1D1F]">{athlete.mainCoach}</p>
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-black/[0.06]" />

          {/* Actions */}
          <div className="flex gap-2">
            <Link
              href={`/dashboard/athletes/${id}/edit`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "flex-1 justify-center")}
            >
              <Pencil className="h-4 w-4" />
              Redigera
            </Link>
            <DeleteAthleteButton athleteId={id} />
          </div>
        </CardContent>
      </Card>

      {/* Right: Tests */}
      <AthleteTestsPanel tests={serializedTests} athleteId={id} />
    </div>
  )
}
