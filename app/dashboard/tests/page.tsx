import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Activity, Flame, Zap } from "lucide-react"

const TEST_TYPES = [
  {
    type: "cykel",
    label: "Cykeltest",
    description: "Laktattröskel och VO2max på cykelergometer.",
    icon: Flame,
    color: "text-[hsl(var(--warning))]",
    bg: "bg-[hsl(var(--warning))]/10",
  },
  {
    type: "lopning",
    label: "Löptest",
    description: "Laktattröskel och VO2max på löpband.",
    icon: Activity,
    color: "text-[#007AFF]",
    bg: "bg-[#007AFF]/10",
  },
  {
    type: "wingate",
    label: "Wingate",
    description: "30-sekunders maximaltest för anaerob kapacitet.",
    icon: Zap,
    color: "text-secondary",
    bg: "bg-[#F5F5F7]",
  },
]

export default function TestsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Nytt test</h1>
      <p className="text-secondary text-base -mt-4">Välj testtyp för att komma igång.</p>

      <div className="grid gap-4 sm:grid-cols-3">
        {TEST_TYPES.map(({ type, label, description, icon: Icon, color, bg }) => (
          <Link key={type} href={`/dashboard/tests/new?type=${type}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-6 flex flex-col gap-3">
                <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <div>
                  <p className="font-semibold">{label}</p>
                  <p className="text-sm text-secondary mt-1">{description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
