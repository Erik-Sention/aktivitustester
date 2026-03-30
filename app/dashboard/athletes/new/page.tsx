import { AthleteForm } from "@/components/athletes/athlete-form"

export default function NewAthletePage() {
  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-2xl font-bold">Ny atlet</h1>
      <AthleteForm />
    </div>
  )
}
