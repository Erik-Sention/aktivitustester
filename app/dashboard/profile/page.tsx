import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/session"
import { ProfileForm } from "./profile-form"

export default async function ProfilePage() {
  const user = await getSessionUser()
  if (!user) redirect("/login")

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Min profil</h1>
        <p className="text-base text-secondary mt-1">
          Namn och profilbild visas i testformuläret och i PDF-rapporter.
        </p>
      </div>
      <ProfileForm uid={user.uid} email={user.email} />
    </div>
  )
}
