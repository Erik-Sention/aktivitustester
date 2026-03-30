import { notFound } from "next/navigation";
import Link from "next/link";
import { getAthlete } from "@/lib/athletes";
import { Card, CardContent } from "@/components/ui/card";
import { fullName } from "@/lib/utils";
import { Activity, Flame, ClipboardList } from "lucide-react";

const TEST_TYPES = [
  {
    type: "troskeltest",
    label: "Tröskeltest",
    description: "Mät LT1 och LT2 via stegvis laktatprovtagning.",
    icon: Flame,
    color: "text-[hsl(var(--warning))]",
    bg: "bg-[hsl(var(--warning))]/10",
  },
  {
    type: "vo2max",
    label: "VO2 Max",
    description: "Maximalt syreupptagningstest med VO2 och puls.",
    icon: Activity,
    color: "text-[#007AFF]",
    bg: "bg-[#007AFF]/10",
  },
  {
    type: "wingate",
    label: "Wingate",
    description: "Anaerobt kapacitetstest.",
    icon: ClipboardList,
    color: "text-[#86868B]",
    bg: "bg-[#F5F5F7]",
  },
];

export default async function PickTestPage({
  searchParams,
}: {
  searchParams: Promise<{ athlete?: string }>;
}) {
  const { athlete: athleteId } = await searchParams;

  if (!athleteId) notFound();

  const athlete = await getAthlete(athleteId);
  if (!athlete) notFound();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Nytt test</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Atlet: <span className="font-medium text-foreground">{fullName(athlete.firstName, athlete.lastName)}</span>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {TEST_TYPES.map(({ type, label, description, icon: Icon, color, bg }) => (
          <Link key={type} href={`/dashboard/tests/new?athlete=${athleteId}&type=${type}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-6 flex flex-col gap-3">
                <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <div>
                  <p className="font-semibold">{label}</p>
                  <p className="text-sm text-muted-foreground mt-1">{description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
