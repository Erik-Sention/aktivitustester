import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/session'
import { AdminClient } from './_admin-client'

export default async function AdminPage() {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') redirect('/dashboard/athletes')
  return <AdminClient />
}
